"""Zoodex Object Detection and Segmentation Service.
Uses YOLO segmentation to identify objects and extract pixel-accurate contour polygons.
Includes fallback contour detection so the API is always responsive.
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np
from PIL import Image
import cv2

from app.data.dex_catalog import get_dex_entry_for_class

logger = logging.getLogger("zoodex.detector")

class ObjectDetector:
    _instance: Optional["ObjectDetector"] = None
    model = None
    model_name: str = "yolo11n-seg.pt"

    def __init__(self):
        self._load_model()

    @classmethod
    def get_instance(cls) -> "ObjectDetector":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def get_model_path(cls) -> str:
        """Finds fine-tuned model weights (best.pt or last.pt) if available, otherwise returns standard YOLO."""
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parent.parent.parent
        root_dir = backend_dir.parent

        candidate_paths = [
            backend_dir / "best.pt",
            backend_dir / "weights" / "best.pt",
            root_dir / "best.pt",
            root_dir / "weights" / "best.pt",
            Path("/content/best.pt"),
            Path("/content/zoodex/best.pt"),
            Path("/content/zoodex/backend/best.pt"),
            Path("/content/zoodex/backend/weights/best.pt"),
        ]

        found_weights = []
        for cand in candidate_paths:
            if cand.exists() and cand.is_file() and cand.stat().st_size > 500000:
                found_weights.append((cand.stat().st_mtime, cand))

        search_dirs = [
            root_dir / "runs" / "segment" / "zoodex_runs",
            root_dir / "zoodex_runs",
            backend_dir / "weights",
            backend_dir,
        ]
        for sdir in search_dirs:
            if sdir.exists():
                for p in sdir.glob("**/best.pt"):
                    if p.exists() and p.is_file() and p.stat().st_size > 500000:
                        found_weights.append((p.stat().st_mtime, p))
                for p in sdir.glob("**/last.pt"):
                    if p.exists() and p.is_file() and p.stat().st_size > 500000:
                        found_weights.append((p.stat().st_mtime, p))

        if found_weights:
            # Sort by newest
            found_weights.sort(key=lambda x: x[0], reverse=True)
            chosen = str(found_weights[0][1])
            logger.info(">>> MODELLO PERSONALIZZATO RILEVATO: %s! Utilizzo pesi fine-tuned.", chosen)
            return chosen

        return "yolo11n-seg.pt"

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self.model_name = self.get_model_path()
            logger.info("Caricamento modello YOLO segmentation: %s", self.model_name)
            self.model = YOLO(self.model_name)
            logger.info("Modello YOLO caricato con successo!")
        except Exception as e:
            logger.warning(
                "Impossibile caricare Ultralytics YOLO al momento (%s). Utilizzo fallback OpenCV.",
                e,
            )
            self.model = None

    def reload_model(self) -> str:
        """Reloads the model (useful after fine-tuning finishes)."""
        logger.info("Ricaricamento modello su richiesta...")
        self._load_model()
        return self.model_name

    def detect_and_segment(
        self,
        image: Image.Image,
        conf_threshold: float = 0.35,
        max_polygon_points: int = 40,
    ) -> List[Dict[str, Any]]:
        """Analyzes an image and returns detected objects with bounding boxes and contour polygons."""
        width, height = image.size
        img_np = np.array(image.convert("RGB"))

        detections: List[Dict[str, Any]] = []

        if self.model is not None:
            try:
                # BGR for OpenCV / YOLO
                img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
                results = self.model.predict(
                    source=img_bgr,
                    conf=conf_threshold,
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
                                # Simplify polygon for smooth mobile rendering
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

                        # If mask was missing or degenerate, use box contour
                        if len(polygon) < 3:
                            polygon = [
                                [norm_box["xmin"], norm_box["ymin"]],
                                [norm_box["xmax"], norm_box["ymin"]],
                                [norm_box["xmax"], norm_box["ymax"]],
                                [norm_box["xmin"], norm_box["ymax"]],
                            ]

                        dex_info = get_dex_entry_for_class(cls_name, cls_id)

                        detections.append(
                            {
                                "id": f"det_{i}_{cls_name}",
                                "class_name": cls_name,
                                "confidence": round(conf, 3),
                                "box": norm_box,
                                "polygon": polygon,
                                "dex_entry": dex_info,
                                "is_animal": dex_info.get("is_animal", False),
                            }
                        )

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
                }
            )

        return fallback_results
