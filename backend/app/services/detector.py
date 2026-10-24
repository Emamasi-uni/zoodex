"""Zoodex Two-Stage AI Vision Engine (YOLO + BioCLIP).

Stage 1: YOLO Segmentation (with agnostic NMS and dual-threshold logic) detects objects and animals.
Stage 2: 10%-padded crop extraction on detected fauna bounding boxes.
Stage 3: Fine-grained taxonomic identification using BioCLIP against precomputed VRAM embeddings.
Stage 4: Continent and Pokédex database routing.
"""

import logging
from typing import List, Dict, Any, Optional, Set
import numpy as np
from PIL import Image
import cv2

from app.data.dex_catalog import get_dex_entry_for_class, get_dex_entry_by_species
from app.services.bioclip_classifier import get_bioclip_classifier, BioClipClassifier

logger = logging.getLogger("zoodex.detector")

# Comprehensive animal vocabulary covering COCO, LVIS (1200+ classes), and Open Images
COMMON_ANIMAL_WORDS: Set[str] = {
    # COCO standard
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
    # Mammals
    "animal", "mammal", "lion", "tiger", "cheetah", "leopard", "jaguar", "panther", "cougar", "puma",
    "wolf", "fox", "coyote", "jackal", "dingo", "hyena", "wildcat", "canine", "feline",
    "deer", "elk", "moose", "antelope", "gazelle", "bison", "buffalo", "ox", "bull", "camel", "llama", "alpaca",
    "monkey", "ape", "chimpanzee", "gorilla", "orangutan", "baboon", "macaque", "lemur", "primate",
    "rabbit", "hare", "squirrel", "chipmunk", "beaver", "porcupine", "hedgehog", "badger", "otter", "skunk", "raccoon",
    "weasel", "ferret", "mink", "stoat", "marten", "wolverine", "mongoose", "meerkat",
    "kangaroo", "wallaby", "koala", "wombat", "opossum", "possum", "platypus", "tasmanian devil", "marsupial",
    "hippopotamus", "hippo", "rhinoceros", "rhino", "pig", "boar", "warthog", "donkey", "mule", "goat", "ram", "lamb",
    "whale", "dolphin", "porpoise", "seal", "sea lion", "walrus", "manatee", "dugong",
    "bat", "flying fox", "panda", "red panda", "giant panda", "polar bear", "grizzly", "rodent", "mouse", "rat", "hamster",
    # Birds
    "eagle", "hawk", "falcon", "owl", "vulture", "buzzard", "kite", "osprey",
    "parrot", "macaw", "cockatoo", "parakeet", "toucan", "woodpecker", "hummingbird", "kingfisher",
    "penguin", "flamingo", "pelican", "stork", "crane", "heron", "egret", "ibis",
    "swan", "goose", "duck", "mallard", "gull", "seagull", "tern", "albatross",
    "crow", "raven", "magpie", "pigeon", "dove", "sparrow", "finch", "canary", "robin",
    "peacock", "turkey", "pheasant", "quail", "partridge", "rooster", "chicken", "hen", "ostrich", "emu",
    # Reptiles & Amphibians
    "reptile", "snake", "serpent", "viper", "cobra", "python", "boa", "mamba", "rattlesnake", "anaconda",
    "lizard", "gecko", "chameleon", "iguana", "monitor lizard", "komodo dragon", "skink",
    "crocodile", "alligator", "caiman", "turtle", "tortoise", "terrapin",
    "amphibian", "frog", "toad", "newt", "salamander", "axolotl",
    # Fish & Marine
    "fish", "shark", "ray", "stingray", "manta ray", "eel", "salmon", "trout", "tuna", "cod",
    "goldfish", "seahorse", "jellyfish", "starfish", "octopus", "squid",
    "crab", "lobster", "shrimp", "crayfish",
    # Insects & Arachnids
    "insect", "bug", "butterfly", "moth", "caterpillar", "bee", "wasp", "hornet", "ant", "beetle", "ladybug",
    "dragonfly", "grasshopper", "cricket", "locust", "mantis",
    "spider", "tarantula", "scorpion",
}

# Explicit non-animal items that may contain animal substrings (e.g. "hot dog", "teddy bear")
EXCLUDED_NON_ANIMALS: Set[str] = {
    "hot dog", "hotdog", "teddy bear", "baseball glove", "hair drier", "toothbrush",
    "fire hydrant", "stop sign", "traffic light", "parking meter",
}

# Module-level set of active animal class IDs for O(1) instant lookup
ANIMAL_CLASS_IDS: Set[int] = set()


def is_animal_label(name: str) -> bool:
    """Checks whether a class label corresponds to a zoological creature."""
    cleaned = name.lower().strip()
    if cleaned in EXCLUDED_NON_ANIMALS:
        return False
    parts = set(cleaned.replace("/", " ").replace("_", " ").replace("-", " ").split())
    if cleaned in COMMON_ANIMAL_WORDS:
        return True
    return bool(parts.intersection(COMMON_ANIMAL_WORDS))


class ObjectDetector:
    _instance: Optional["ObjectDetector"] = None
    model = None
    model_name: str = "yolo11n-seg.pt"
    animal_class_ids: Set[int] = set()
    load_error: Optional[str] = None

    def __init__(self):
        self._load_model()
        self.bioclip: BioClipClassifier = get_bioclip_classifier()

    @classmethod
    def get_instance(cls) -> "ObjectDetector":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    DEFAULT_MODEL_NAME: str = "yolo11m-seg.pt"

    @classmethod
    def get_model_path(cls) -> str:
        """Finds fine-tuned model weights on Drive if available; otherwise returns official YOLO (yolo11m-seg.pt)."""
        import os
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parent.parent.parent

        # 1. Explicit override via environment variable
        env_path = os.environ.get("ZOODEX_MODEL_PATH") or os.environ.get("ZOODEX_MODEL")
        if env_path:
            logger.info(">>> MODELLO SPECIFICATO DA VARIABILE D'AMBIENTE: %s", env_path)
            return env_path

        # 2. Check if user explicitly wants custom weights or if Drive contains fine-tuned weights
        drive_paths = [
            Path("/content/drive/MyDrive/zoodex_weights/best.pt"),
            Path("/content/drive/MyDrive/zoodex_weights/last.pt"),
        ]
        for p in drive_paths:
            if p.exists() and p.is_file() and p.stat().st_size > 500000:
                logger.info(">>> MODELLO PERSONALIZZATO RILEVATO SU GOOGLE DRIVE: %s", p)
                return str(p)

        # 3. Fallback to official server model (yolo11m-seg.pt: high accuracy Medium model)
        default_model = os.environ.get("ZOODEX_BASE_MODEL", cls.DEFAULT_MODEL_NAME)
        logger.info(">>> Utilizzo modello ufficiale server: %s", default_model)
        return default_model

    def _extract_animal_class_ids(self) -> Set[int]:
        """Extracts all animal class IDs from the loaded YOLO model names dictionary."""
        global ANIMAL_CLASS_IDS
        extracted: Set[int] = set()
        if self.model is not None and hasattr(self.model, "names") and self.model.names:
            for cls_id, name in self.model.names.items():
                if is_animal_label(str(name)):
                    extracted.add(int(cls_id))
        ANIMAL_CLASS_IDS = extracted
        self.animal_class_ids = extracted
        logger.info(
            "Mappatura ID Animali completata: %d classi zoologiche identificate su %d classi totali.",
            len(extracted),
            len(self.model.names) if self.model and hasattr(self.model, "names") else 0,
        )
        return extracted

    def _load_model(self):
        self.load_error = None
        try:
            from ultralytics import YOLO
            self.model_name = self.get_model_path()
            logger.info("Caricamento modello YOLO segmentation: %s", self.model_name)
            self.model = YOLO(self.model_name)
            self._extract_animal_class_ids()
            logger.info("Modello YOLO (%s) caricato con successo!", self.model_name)
        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)}"
            logger.error("Impossibile caricare modello YOLO %s: %s", self.model_name, err_msg)
            self.load_error = err_msg
            self.model = None

    def reload_model(self, model_choice: Optional[str] = None) -> str:
        """Reloads the model. Supports 'yolo11m-seg.pt', 'yolo11n-seg.pt', 'coco', 'custom', or any valid YOLO weight."""
        logger.info("Ricaricamento modello su richiesta (scelta=%s)...", model_choice)
        from ultralytics import YOLO
        choice = (model_choice or "").lower().strip()
        
        if choice in ["coco", "default", "yolo11m", "yolo11m-seg", "yolo11m-seg.pt", "medium"]:
            self.model_name = "yolo11m-seg.pt"
        elif choice in ["yolo11n", "yolo11n-seg", "yolo11n-seg.pt", "nano"]:
            self.model_name = "yolo11n-seg.pt"
        elif choice in ["custom", "best"]:
            self.model_name = self.get_model_path()
        elif choice.endswith(".pt"):
            self.model_name = model_choice
        else:
            self.model_name = self.get_model_path()

        self.model = YOLO(self.model_name)
        self._extract_animal_class_ids()
        self.load_error = None
        return self.model_name

    def detect_and_segment(
        self,
        image: Image.Image,
        conf_threshold: float = 0.35,
        animal_conf_threshold: float = 0.10,
        non_animal_conf_threshold: float = 0.35,
        bioclip_threshold: float = 0.25,
        padding_pct: float = 0.10,
        max_polygon_points: int = 40,
    ) -> List[Dict[str, Any]]:
        """Analyzes an image and returns detected objects with bounding boxes and contour polygons.
        
        Implements the 4-stage pipeline:
        1. YOLO inference with conf=0.10, agnostic_nms=True and dual-threshold filtering.
        2. 10%-padded crop extraction on detected animals.
        3. BioCLIP classification using pre-computed VRAM embeddings.
        4. Continent routing and Pokédex data binding.
        """
        width, height = image.size
        img_np = np.array(image.convert("RGB"))

        detections: List[Dict[str, Any]] = []

        if self.model is not None:
            try:
                # BGR for OpenCV / YOLO
                img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

                # Stage 1: Run YOLO with agnostic_nms=True and conf=0.10
                results = self.model.predict(
                    source=img_bgr,
                    conf=animal_conf_threshold,
                    agnostic_nms=True,
                    imgsz=416,
                    verbose=False,
                )

                if results and len(results) > 0:
                    res = results[0]
                    boxes = res.boxes
                    masks = res.masks

                    num_boxes = len(boxes) if boxes is not None else 0
                    for i in range(num_boxes):
                        box = boxes[i]
                        cls_id = int(box.cls[0].item())
                        cls_name = res.names.get(cls_id, f"obj_{cls_id}").lower()
                        conf = float(box.conf[0].item())

                        is_animal = cls_id in self.animal_class_ids or is_animal_label(cls_name)

                        # Dual-threshold filtering:
                        # Animals are accepted at conf >= 0.10. Non-animals require conf >= 0.35
                        required_conf = animal_conf_threshold if is_animal else non_animal_conf_threshold
                        if conf < required_conf:
                            continue

                        xyxy = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = xyxy

                        # Normalized bounding box [0..1]
                        norm_box = {
                            "xmin": max(0.0, min(1.0, x1 / width)),
                            "ymin": max(0.0, min(1.0, y1 / height)),
                            "xmax": max(0.0, min(1.0, x2 / width)),
                            "ymax": max(0.0, min(1.0, y2 / height)),
                        }

                        # Extract segmentation contour polygon
                        polygon: List[List[float]] = []
                        if masks is not None and len(masks.xy) > i:
                            raw_poly = masks.xy[i]
                            if len(raw_poly) >= 3:
                                poly_pts = np.array(raw_poly, dtype=np.int32).reshape((-1, 1, 2))
                                epsilon = 0.015 * cv2.arcLength(poly_pts, True)
                                approx = cv2.approxPolyDP(poly_pts, epsilon, True)

                                pts = approx.reshape(-1, 2)
                                if len(pts) > max_polygon_points:
                                    step = max(1, len(pts) // max_polygon_points)
                                    pts = pts[::step]

                                polygon = [
                                    [
                                        round(float(pt[0]) / width, 4),
                                        round(float(pt[1]) / height, 4),
                                    ]
                                    for pt in pts
                                ]

                        # Fallback to bounding box contour if mask is missing
                        if len(polygon) < 3:
                            polygon = [
                                [norm_box["xmin"], norm_box["ymin"]],
                                [norm_box["xmax"], norm_box["ymin"]],
                                [norm_box["xmax"], norm_box["ymax"]],
                                [norm_box["xmin"], norm_box["ymax"]],
                            ]

                        # Initial Pokédex entry from YOLO class
                        dex_info = get_dex_entry_for_class(cls_name, cls_id)
                        stage = "yolo"
                        bioclip_metadata = None

                        # Stage 2 & 3: If animal intercepted, perform 10% padded crop & BioCLIP classification
                        if is_animal and self.bioclip and self.bioclip.is_ready:
                            try:
                                bw = x2 - x1
                                bh = y2 - y1
                                # Square-padded crop centered on detection to preserve natural animal proportions
                                cx = (x1 + x2) / 2.0
                                cy = (y1 + y2) / 2.0
                                max_side = max(bw, bh) * (1.0 + 2.0 * padding_pct)
                                half_side = max_side / 2.0

                                crop_x1 = max(0, int(round(cx - half_side)))
                                crop_y1 = max(0, int(round(cy - half_side)))
                                crop_x2 = min(width, int(round(cx + half_side)))
                                crop_y2 = min(height, int(round(cy + half_side)))

                                if crop_x2 > crop_x1 and crop_y2 > crop_y1:
                                    crop_img = image.crop((crop_x1, crop_y1, crop_x2, crop_y2))
                                    bioclip_res = self.bioclip.classify_crop(crop_img, top_k=3)

                                    if bioclip_res and bioclip_res["confidence"] >= bioclip_threshold:
                                        # Overwrite generic YOLO label with precise BioCLIP species
                                        stage = "bioclip"
                                        bioclip_metadata = bioclip_res
                                        cls_name = bioclip_res["nome_it"]
                                        conf = bioclip_res["confidence"]

                                        # Stage 4: Retrieve matching continental fauna catalog entry
                                        dex_match = get_dex_entry_by_species(
                                            scientific_name=bioclip_res.get("scientific_name", ""),
                                            common_name=bioclip_res.get("nome_it", ""),
                                            dex_num=bioclip_res.get("dex_number"),
                                        )

                                        if dex_match:
                                            dex_info = {
                                                "dex_number": dex_match["dex_number"],
                                                "name": dex_match["name"],
                                                "scientific_name": dex_match["scientific_name"],
                                                "continent": dex_match["continent"],
                                                "continent_name": dex_match["continent_name"],
                                                "category": dex_match["category"],
                                                "is_animal": True,
                                                "rarity": dex_match["rarity"],
                                                "height": dex_match["height"],
                                                "weight": dex_match["weight"],
                                                "description": dex_match["description"],
                                                "image_url": dex_match.get("image_url"),
                                                "badge_color": "#10B981",
                                            }
                                        else:
                                            dex_info = {
                                                "dex_number": bioclip_res.get("dex_number") or f"BIO-{cls_id:03d}",
                                                "name": bioclip_res.get("nome_it", cls_name),
                                                "scientific_name": bioclip_res.get("scientific_name", f"Specimen {cls_name}"),
                                                "continent": bioclip_res.get("continent_id", "europa"),
                                                "continent_name": bioclip_res.get("continente", "Globale"),
                                                "category": "Fauna Selvatica",
                                                "is_animal": True,
                                                "rarity": "Identificato",
                                                "height": "Variabile",
                                                "weight": "Variabile",
                                                "description": f"Identificato con BioCLIP: {bioclip_res.get('species_key')}.",
                                                "badge_color": "#10B981",
                                            }
                                        is_animal = True
                            except Exception as ex_bio:
                                logger.warning("BioCLIP crop evaluation warning: %s", ex_bio)

                        det_item = {
                            "id": f"det_{i}_{cls_name.replace(' ', '_')}",
                            "class_name": cls_name,
                            "confidence": round(conf, 3),
                            "box": norm_box,
                            "polygon": polygon,
                            "dex_entry": dex_info,
                            "is_animal": is_animal,
                            "stage": stage,
                        }
                        if bioclip_metadata:
                            det_item["bioclip"] = bioclip_metadata

                        detections.append(det_item)

                # Return sorted by confidence
                detections.sort(key=lambda d: d["confidence"], reverse=True)
                if detections:
                    return detections

            except Exception as e:
                logger.error("Errore durante l'inferenza YOLO: %s. Utilizzo fallback.", e)

        # Fallback: OpenCV contour detection
        return self._fallback_contour_detection(img_np, width, height)

    def _fallback_contour_detection(
        self, img_np: np.ndarray, width: int, height: int
    ) -> List[Dict[str, Any]]:
        """Fallback computer vision segmentation when YOLO weights are initializing."""
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:3]

        fallback_results = []
        for idx, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            if area < (width * height * 0.03):
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            epsilon = 0.02 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            pts = approx.reshape(-1, 2)

            polygon = [
                [round(float(pt[0]) / width, 4), round(float(pt[1]) / height, 4)]
                for pt in pts
            ]
            if len(polygon) < 3:
                continue

            fallback_results.append(
                {
                    "id": f"det_cv_{idx}",
                    "class_name": "soggetto_inquadrato",
                    "confidence": 0.88,
                    "box": {
                        "xmin": round(x / width, 4),
                        "ymin": round(y / height, 4),
                        "xmax": round((x + w) / width, 4),
                        "ymax": round((y + h) / height, 4),
                    },
                    "polygon": polygon,
                    "dex_entry": {
                        "dex_number": "???",
                        "name": "Soggetto Scontornato",
                        "scientific_name": "Forma non classificata",
                        "continent": "europa",
                        "continent_name": "In Analisi",
                        "category": "Sagoma Acquisita",
                        "is_animal": True,
                        "rarity": "Rilevato",
                        "height": f"{round((h / height) * 1.2, 2)} m",
                        "weight": "In calcolo",
                        "description": "Sagoma rilevata con successo mediante i sensori di contrasto ottico.",
                        "badge_color": "#00F0FF",
                    },
                    "is_animal": True,
                    "stage": "fallback_cv",
                }
            )

        return fallback_results


def get_detector() -> ObjectDetector:
    """Convenience accessor for ObjectDetector singleton."""
    return ObjectDetector.get_instance()
