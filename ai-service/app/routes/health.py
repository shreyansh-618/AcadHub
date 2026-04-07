from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import logging

from app.config.settings import settings
from app.models.schemas import HealthResponse
from app.services.runtime_state import runtime_state

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    snapshot = runtime_state.snapshot()
    is_healthy = snapshot["ready"]
    payload = HealthResponse(
        status="healthy" if is_healthy else "degraded",
        model=settings.model_name,
        version="1.0.0",
        ready=snapshot["ready"],
        database_status=snapshot["database"]["status"],
        model_status=snapshot["model"]["status"],
        model_dimension=snapshot["model"]["dimension"],
        model_loaded_at=snapshot["model"]["loaded_at"],
        uptime_seconds=snapshot["uptime_seconds"],
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload.model_dump(),
    )
