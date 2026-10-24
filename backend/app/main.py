"""Zoodex FastAPI application entrypoint.

Run locally (reachable from the phone on the same Wi-Fi):
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, dex
from app.core.config import get_settings

logger = logging.getLogger("zoodex")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown lifecycle management.
    Pre-initializes YOLO and pre-computes BioCLIP species text embeddings in VRAM.
    """
    logger.info("Avvio Zoodex API: caricamento pipeline YOLO + BioCLIP in memoria...")
    try:
        from app.services.detector import get_detector
        detector = get_detector()
        logger.info(
            "AI Vision Engine inizializzato con successo: YOLO (%s) + BioCLIP (pronto: %s, VRAM/RAM: %s)",
            detector.model_name,
            detector.bioclip.is_ready if detector.bioclip else False,
            detector.bioclip.device if detector.bioclip else "N/A",
        )
    except Exception as e:
        logger.error("Errore durante precaricamento modelli AI all'avvio: %s", e)
    yield
    logger.info("Arresto Zoodex API.")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(dex.router)
