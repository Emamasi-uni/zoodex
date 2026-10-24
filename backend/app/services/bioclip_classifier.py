"""BioCLIP Fine-Grained Zoological Classification Service.

Loads the pretrained BioCLIP foundation model (hf-hub:imageomics/bioclip)
and pre-computes normalized text embeddings in VRAM/RAM using Multi-Template Prompt Ensembling
and Visual Trait Anchors for high-precision species discrimination.
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

import torch
from PIL import Image

logger = logging.getLogger("zoodex.bioclip")

SPECIES_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "pokedex_species.json"

# Visual Trait Anchors for species that are commonly confused in zero-shot vision
VISUAL_TRAITS_MAP: Dict[str, str] = {
    # Giant Panda vs Red Panda vs Brown Bear vs Polar Bear
    "ailuropoda melanoleuca": "a black and white giant panda bear with black eye patches, white face, and black ears and shoulders",
    "ailurus fulgens": "a small arboreal red panda with reddish-orange fur, white facial markings, and a long ringed bushy tail",
    "ursus arctos": "a massive brown bear with thick dark brown fur, long claws, and a prominent shoulder hump",
    "ursus maritimus": "a large polar bear with dense white fur adapted to arctic ice",
    # Big Cats
    "acinonyx jubatus": "a slender cheetah with solid round black spots, small head, and distinctive black tear lines on face",
    "panthera pardus": "a leopard with spotted rosettes having no center spot, climbing trees",
    "panthera onca": "a stocky muscular jaguar with large rosette markings containing black central dots",
    "panthera uncia": "a snow leopard with thick smoky-gray fur, faint dark rosettes, and an extra long bushy tail",
    "panthera tigris": "a large tiger with bright orange coat and distinct black vertical stripes",
    "panthera leo": "a majestic African lion with tawny coat and thick male mane",
    # Canids
    "canis lupus": "a large wild gray wolf with thick grizzled coat, broad muzzle, and erect ears",
    "canis lupus italicus": "an Apennine wolf with greyish-brown coat, dark stripes on forelegs, and slender build",
    "vulpes vulpes": "a wild red fox with bright orange-red fur, pointed snout, and bushy white-tipped tail",
    "felis silvestris": "a wildcat with dense tabby coat, blunt black-ringed tail, and wild demeanor",
    # Marsupials & Monotremes
    "phascolarctos cinereus": "a koala with round fluffy ears, large black leathery nose, and grey fur in eucalyptus",
    "osphranter rufus": "a large red kangaroo with powerful hind legs, muscular tail, and reddish-tan fur",
    "ornithorhynchus anatinus": "a platypus with a duck-like rubbery bill, webbed feet, and beaver-like tail",
    "sarcophilus harrisii": "a stocky black Tasmanian devil with white chest mark and broad jaw",
    # Birds & Reptiles
    "aquila chrysaetos": "a golden eagle with dark brown plumage and golden-buff nape feathers",
    "haliaeetus leucocephalus": "a bald eagle with distinct pure white head and tail contrasting dark brown body",
    "equus quagga": "a plains zebra with bold black and white vertical stripes",
    "ophiophagus hannah": "a king cobra with expandable narrow neck hood and chevron markings",
    "alligator mississippiensis": "an American alligator with broad rounded snout and dark armored hide",
}


class BioClipClassifier:
    _instance: Optional["BioClipClassifier"] = None

    def __init__(self, model_name: str = "hf-hub:imageomics/bioclip"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.species_data: Dict[str, Dict[str, Any]] = {}
        self.species_keys: List[str] = []
        self.text_features: Optional[torch.Tensor] = None
        self.is_ready: bool = False
        self.load_error: Optional[str] = None

        self._load_species_database()
        self.load_model()

    @classmethod
    def get_instance(cls) -> "BioClipClassifier":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_species_database(self):
        """Loads the species JSON defining target fauna and continents."""
        try:
            if SPECIES_JSON_PATH.exists():
                with open(SPECIES_JSON_PATH, "r", encoding="utf-8") as f:
                    self.species_data = json.load(f)
                self.species_keys = list(self.species_data.keys())
                logger.info(
                    "Caricato database Pokédex: %d specie pronte per BioCLIP.",
                    len(self.species_keys),
                )
            else:
                logger.warning("File %s non trovato!", SPECIES_JSON_PATH)
                self.species_data = {}
                self.species_keys = []
        except Exception as e:
            logger.error("Errore caricamento pokedex_species.json: %s", e)
            self.species_data = {}
            self.species_keys = []

    def load_model(self):
        """Initializes BioCLIP and precomputes all text embeddings in GPU memory."""
        self.load_error = None
        try:
            import open_clip

            logger.info("Caricamento modello BioCLIP (%s) su %s...", self.model_name, self.device)
            model, _, preprocess = open_clip.create_model_and_transforms(self.model_name)
            model = model.to(self.device).eval()
            tokenizer = open_clip.get_tokenizer(self.model_name)

            self.model = model
            self.preprocess = preprocess
            self.tokenizer = tokenizer

            self._precompute_text_embeddings()
            self.is_ready = True
            logger.info("BioCLIP inizializzato e pronto in VRAM!")
        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)}"
            logger.error("Impossibile caricare BioCLIP: %s", err_msg)
            self.load_error = err_msg
            self.is_ready = False

    def _generate_prompts_for_species(self, key: str, info: Dict[str, Any]) -> List[str]:
        """Generates a rich ensemble of natural language & taxonomic prompts for a species."""
        sci_name = info.get("scientific_name") or key.split("(")[0].strip()
        sci_clean = sci_name.lower().strip()

        # Extract English common name if present in key: "Ailuropoda melanoleuca (Giant Panda)"
        eng_name = sci_name
        m = re.search(r"\((.*?)\)", key)
        if m:
            eng_name = m.group(1).strip()
        elif info.get("nome_it"):
            eng_name = info["nome_it"]

        prompts = [
            f"a photo of {sci_name}, commonly known as {eng_name}",
            f"{sci_name} ({eng_name})",
            f"a wild {eng_name} ({sci_name}) in its natural habitat",
            f"a close-up portrait photo of a {eng_name}",
        ]

        # Add visual trait anchor if available
        if sci_clean in VISUAL_TRAITS_MAP:
            trait = VISUAL_TRAITS_MAP[sci_clean]
            prompts.append(f"a photo of {sci_name}, {trait}")

        # Add family level anchor for certain species
        for genus in ["canis", "panthera", "ursus", "equus"]:
            if sci_clean.startswith(genus) and sci_clean in VISUAL_TRAITS_MAP:
                prompts.append(f"a wildlife photo of {eng_name}")

        return prompts

    def _precompute_text_embeddings(self):
        """Pre-computes text embeddings for all target species in RAM/VRAM using Prompt Ensembling."""
        if not self.species_keys or self.model is None or self.tokenizer is None:
            return

        logger.info(
            "Pre-calcolo embeddings di testo con Prompt Ensembling per %d specie...",
            len(self.species_keys),
        )

        all_species_feats = []

        with torch.no_grad():
            for key in self.species_keys:
                info = self.species_data.get(key, {})
                prompts = self._generate_prompts_for_species(key, info)

                tokens = self.tokenizer(prompts).to(self.device)
                prompt_feats = self.model.encode_text(tokens)
                prompt_feats = prompt_feats / prompt_feats.norm(dim=-1, keepdim=True)

                # Average normalized ensemble prompts
                avg_feat = prompt_feats.mean(dim=0, keepdim=True)
                avg_feat = avg_feat / avg_feat.norm(dim=-1, keepdim=True)
                all_species_feats.append(avg_feat)

            # Stack into single [N, 512] normalized tensor
            self.text_features = torch.cat(all_species_feats, dim=0)

        logger.info(
            "Embeddings Prompt Ensembling completati: tensore %s in memoria su %s.",
            tuple(self.text_features.shape),
            self.device,
        )

    def classify_crop(
        self,
        crop_image: Image.Image,
        top_k: int = 3,
    ) -> Optional[Dict[str, Any]]:
        """Classifies an animal crop image against precomputed species embeddings.
        
        Uses multi-scale feature blending (full crop + center focused crop)
        to capture both body silhouette and distinctive facial markings.
        """
        if not self.is_ready or self.model is None or self.text_features is None:
            return None

        try:
            # Ensure RGB
            if crop_image.mode != "RGB":
                crop_image = crop_image.convert("RGB")

            # 1. Full image tensor
            img_tensor_full = self.preprocess(crop_image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                feat_full = self.model.encode_image(img_tensor_full)
                feat_full = feat_full / feat_full.norm(dim=-1, keepdim=True)

                # 2. Multi-scale: Center 75% focused crop for facial/color details
                w, h = crop_image.size
                if w >= 64 and h >= 64:
                    cx, cy = w / 2.0, h / 2.0
                    crop_w, crop_h = w * 0.75, h * 0.75
                    box_focused = (
                        int(cx - crop_w / 2.0),
                        int(cy - crop_h / 2.0),
                        int(cx + crop_w / 2.0),
                        int(cy + crop_h / 2.0),
                    )
                    crop_focused = crop_image.crop(box_focused)
                    img_tensor_foc = self.preprocess(crop_focused).unsqueeze(0).to(self.device)
                    feat_foc = self.model.encode_image(img_tensor_foc)
                    feat_foc = feat_foc / feat_foc.norm(dim=-1, keepdim=True)

                    # Blend full (65%) and focused (35%)
                    img_feat = 0.65 * feat_full + 0.35 * feat_foc
                    img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)
                else:
                    img_feat = feat_full

                # Cosine similarity scaled by model logit_scale
                scale = self.model.logit_scale.exp()
                similarity = scale * (img_feat @ self.text_features.T)
                probs = similarity.softmax(dim=-1).squeeze(0)

            # Extract best match
            best_idx = probs.argmax().item()
            best_prob = float(probs[best_idx].item())
            best_key = self.species_keys[best_idx]
            best_info = self.species_data.get(best_key, {})

            # Extract top-K matches
            top_indices = torch.topk(probs, min(top_k, len(self.species_keys))).indices.tolist()
            top_matches = []
            for idx in top_indices:
                key = self.species_keys[idx]
                info = self.species_data.get(key, {})
                top_matches.append(
                    {
                        "species_key": key,
                        "confidence": round(float(probs[idx].item()), 4),
                        "nome_it": info.get("nome_it", key),
                        "continente": info.get("continente", "Globale"),
                        "continent_id": info.get("continent_id", "europa"),
                        "dex_number": info.get("dex_number"),
                        "scientific_name": info.get("scientific_name"),
                    }
                )

            return {
                "species_key": best_key,
                "confidence": round(best_prob, 4),
                "nome_it": best_info.get("nome_it", best_key),
                "continente": best_info.get("continente", "Globale"),
                "continent_id": best_info.get("continent_id", "europa"),
                "dex_number": best_info.get("dex_number"),
                "scientific_name": best_info.get("scientific_name"),
                "top_matches": top_matches,
            }

        except Exception as e:
            logger.error("Errore durante classificazione BioCLIP crop: %s", e)
            return None


def get_bioclip_classifier() -> BioClipClassifier:
    """Convenience accessor for the BioClip singleton."""
    return BioClipClassifier.get_instance()
