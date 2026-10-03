"""Zoodex API endpoints for scanning, continent lists, catalog, and unlocks."""

import io
import base64
import logging
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body
from pydantic import BaseModel
from PIL import Image

from app.services.detector import ObjectDetector
from app.data.dex_catalog import CONTINENTS, CATALOG_BY_CONTINENT

logger = logging.getLogger("zoodex.api")

router = APIRouter(prefix="/api/v1", tags=["zoodex"])

# In-memory store for unlocked Dex entries (device_uuid -> set of dex_numbers)
UNLOCKED_ENTRIES: dict[str, set[str]] = {}

class ScanBase64Request(BaseModel):
    image_base64: str
    conf_threshold: Optional[float] = 0.35
    device_id: Optional[str] = "anon_device"

class UnlockRequest(BaseModel):
    dex_number: str
    device_id: Optional[str] = "anon_device"

@router.get("/continents")
def get_continents(device_id: str = "anon_device"):
    """Returns continents with stats on discovered animals."""
    unlocked = UNLOCKED_ENTRIES.get(device_id, set(["001", "013"]))
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
def get_animals(continent: Optional[str] = None, device_id: str = "anon_device"):
    """Returns the animal catalog with unlocked status for the device."""
    unlocked = UNLOCKED_ENTRIES.get(device_id, set(["001", "013"]))

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
        }
        if not is_unlocked:
            # Hide scientific lore for locked animals in authentic Pokédex fashion
            item["silhouette_only"] = True
            item["display_title"] = f"??? ({a['category']})"
        else:
            item["silhouette_only"] = False
            item["display_title"] = a["name"]
        result.append(item)
    return result

@router.post("/unlock")
def unlock_animal(payload: UnlockRequest):
    """Marks an animal as discovered in the user's Zoodex."""
    dev = payload.device_id or "anon_device"
    if dev not in UNLOCKED_ENTRIES:
        UNLOCKED_ENTRIES[dev] = set(["001", "013"])
    UNLOCKED_ENTRIES[dev].add(payload.dex_number)
    return {
        "status": "unlocked",
        "dex_number": payload.dex_number,
        "total_unlocked": len(UNLOCKED_ENTRIES[dev]),
    }

@router.post("/scan")
async def scan_image(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    conf_threshold: float = Form(0.35),
    device_id: str = Form("anon_device"),
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
            raise HTTPException(status_code=400, detail="Nessuna immagine fornita (file o image_base64 richiesto)")

        # Run segmentation
        detector = ObjectDetector.get_instance()
        detections = detector.detect_and_segment(image, conf_threshold=conf_threshold)

        # Automatically unlock detected animals in the user's Dex!
        newly_unlocked = []
        dev_unlocked = UNLOCKED_ENTRIES.setdefault(device_id, set(["001", "013"]))
        for det in detections:
            dex = det.get("dex_entry", {})
            dex_num = dex.get("dex_number")
            if det.get("is_animal") and dex_num and dex_num not in dev_unlocked and not dex_num.startswith("OBJ"):
                dev_unlocked.add(dex_num)
                newly_unlocked.append(dex)

        return {
            "success": True,
            "count": len(detections),
            "detections": detections,
            "newly_unlocked": newly_unlocked,
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
        conf_threshold=payload.conf_threshold or 0.35,
        device_id=payload.device_id or "anon_device",
    )
