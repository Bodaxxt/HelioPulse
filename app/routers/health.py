"""Health check API router."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check endpoint")
async def health_check():
    """Returns the operational status, current time, and model version."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.MODEL_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
