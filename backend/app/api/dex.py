"""Zoodex API endpoints for scanning, continent lists, catalog, and unlocks."""

import io
import json
import base64
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from PIL import Image

from app.services.detector import ObjectDetector
from app.data.dex_catalog import CONTINENTS, CATALOG_BY_CONTINENT, MASTER_ANIMALS

logger = logging.getLogger("zoodex.api")

router = APIRouter(prefix="/api/v1", tags=["zoodex"])

STORAGE_FILE = Path(__file__).resolve().parent.parent.parent / "unlocked_dex.json"

def get_unlocked_set(device_id: str = "pixel8a_user") -> set[str]:
    """Always loads fresh state from disk with safe fallback."""
    if STORAGE_FILE.exists():
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                unlocked_list = data.get(device_id, ["001", "013"])
                res = set(unlocked_list)
                res.add("001")
                res.add("013")
                return res
        except Exception as e:
            logger.warning("Impossibile caricare storage sblocchi: %s", e)
    return set(["001", "013"])

def save_user_unlocked(device_id: str, new_set: set[str]):
    try:
        data = {}
        if STORAGE_FILE.exists():
            try:
                with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        data[device_id] = sorted(list(new_set))
        with open(STORAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error("Errore salvataggio sblocchi su disco: %s", e)

class ScanBase64Request(BaseModel):
    image_base64: str
    conf_threshold: Optional[float] = 0.25
    device_id: Optional[str] = "pixel8a_user"

class UnlockRequest(BaseModel):
    dex_number: str
    device_id: Optional[str] = "pixel8a_user"

@router.get("/continents")
def get_continents(device_id: str = "pixel8a_user"):
    """Returns continents with stats on discovered animals."""
    unlocked = get_unlocked_set(device_id)
    res = []
    for c in CONTINENTS:
        cid = c["id"]
        animals = CATALOG_BY_CONTINENT.get(cid, [])
        total = len(animals)
        discovered = sum(1 for a in animals if a["dex_number"] in unlocked or a.get("unlocked_default", False))
        res.append({
            **c,
            "total_animals": total,
            "discovered_animals": discovered,
            "progress_percentage": round((discovered / max(1, total)) * 100),
        })
    return res

@router.get("/animals")
def get_animals(continent: Optional[str] = None, device_id: str = "pixel8a_user"):
    """Returns the animal catalog with unlocked status for the device."""
    unlocked = get_unlocked_set(device_id)

    if continent and continent in CATALOG_BY_CONTINENT:
        animals = CATALOG_BY_CONTINENT[continent]
    else:
        animals = [a for sub in CATALOG_BY_CONTINENT.values() for a in sub]

    result = []
    for a in animals:
        is_unlocked = a["dex_number"] in unlocked or a.get("unlocked_default", False)
        item = {
            **a,
            "is_unlocked": is_unlocked,
            "silhouette_only": not is_unlocked,
            "display_title": a["name"] if is_unlocked else f"??? ({a['category']})",
        }
        result.append(item)
    return result

@router.get("/catalog-export")
def export_catalog():
    """Returns the complete continental fauna catalog with photography URLs and biological traits."""
    return {
        "continents": CONTINENTS,
        "total_species": len(MASTER_ANIMALS),
        "animals": MASTER_ANIMALS,
    }

@router.get("/model-info")
def get_model_info():
    """Returns active YOLO model information."""
    detector = ObjectDetector.get_instance()
    model_name_lower = detector.model_name.lower()
    is_custom = any(k in model_name_lower for k in ["best.pt", "last.pt", "runs", "zoodex"])
    
    file_size_mb = 0.0
    from pathlib import Path
    p = Path(detector.model_name)
    if p.exists() and p.is_file():
        file_size_mb = round(p.stat().st_size / (1024 * 1024), 2)
        
    num_classes = len(detector.model.names) if detector.model is not None and hasattr(detector.model, "names") else 0
    return {
        "model_name": detector.model_name,
        "file_size_mb": file_size_mb,
        "is_custom_weights": is_custom,
        "model_active": detector.model is not None,
        "num_classes": num_classes,
        "load_error": detector.load_error,
    }

@router.get("/reload-model")
@router.post("/reload-model")
def reload_model(model: Optional[str] = None):
    """Hot-reloads detector weights. Pass ?model=coco to use official pretrained COCO or ?model=custom for best.pt."""
    detector = ObjectDetector.get_instance()
    path = detector.reload_model(model_choice=model)
    model_name_lower = path.lower()
    is_custom = any(k in model_name_lower for k in ["best.pt", "last.pt", "runs", "zoodex"])
    num_classes = len(detector.model.names) if detector.model is not None and hasattr(detector.model, "names") else 0
    return {
        "status": "reloaded",
        "model_path": path,
        "is_custom_weights": is_custom,
        "model_active": detector.model is not None,
        "num_classes": num_classes,
        "load_error": detector.load_error,
    }

@router.post("/unlock")
def unlock_animal(payload: UnlockRequest):
    """Marks an animal as discovered in the user's Zoodex."""
    dev = payload.device_id or "pixel8a_user"
    unlocked = get_unlocked_set(dev)
    unlocked.add(payload.dex_number)
    save_user_unlocked(dev, unlocked)
    return {
        "status": "unlocked",
        "dex_number": payload.dex_number,
        "total_unlocked": len(unlocked),
    }

@router.post("/scan")
async def scan_image(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    conf_threshold: float = Form(0.25),
    device_id: str = Form("pixel8a_user"),
):
    """Performs object detection and segmentation on the camera capture."""
    try:
        if file is not None:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
        elif image_base64:
            clean_b64 = image_base64
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",")[1]
            decoded = base64.b64decode(clean_b64)
            image = Image.open(io.BytesIO(decoded))
        else:
            raise HTTPException(status_code=400, detail="Nessuna immagine fornita")

        # Run segmentation
        detector = ObjectDetector.get_instance()
        detections = detector.detect_and_segment(image, conf_threshold=conf_threshold)

        # Extract animal candidates for user confirmation
        candidates = []
        dev_unlocked = get_unlocked_set(device_id)
        for det in detections:
            dex = det.get("dex_entry", {})
            dex_num = dex.get("dex_number")
            if det.get("is_animal") and dex_num and not dex_num.startswith("OBJ") and not dex_num.startswith("GEN"):
                candidates.append({
                    **dex,
                    "confidence": det.get("confidence", 0.0),
                    "is_already_unlocked": dex_num in dev_unlocked,
                })

        return {
            "success": True,
            "count": len(detections),
            "detections": detections,
            "candidates": candidates,
            "newly_unlocked": [],  # Requires explicit confirmation before saving
            "image_size": {"width": image.width, "height": image.height},
        }

    except Exception as e:
        logger.exception("Errore scansione")
        raise HTTPException(status_code=500, detail=f"Errore durante l'elaborazione dell'immagine: {str(e)}")

@router.post("/scan-json")
async def scan_image_json(payload: ScanBase64Request):
    """Performs object detection and segmentation via JSON payload."""
    return await scan_image(
        file=None,
        image_base64=payload.image_base64,
        conf_threshold=payload.conf_threshold or 0.25,
        device_id=payload.device_id or "pixel8a_user",
    )
