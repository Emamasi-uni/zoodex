"""Health check endpoint, used by the app to verify backend reachability."""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    server_time: datetime


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(
        status="ok",
        app=s.app_name,
        version=s.version,
        environment=s.environment,
        server_time=datetime.now(timezone.utc),
    )
