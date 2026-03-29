from fastapi import APIRouter
from app.config.settings import settings
from app.models.schemas import HealthResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

@router.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        from app.services.embedding import embedding_service
        embedding_service.load_model()
        dimension = embedding_service.get_dimension()
        return HealthResponse(
            status="healthy",
            model=settings.model_name,
            version="1.0.0",
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            model=settings.model_name,
            version="1.0.0",
        )
