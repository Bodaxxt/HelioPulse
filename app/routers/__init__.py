"""API routers package."""

from app.routers.health import router as health_router
from app.routers.optimization import router as optimization_router
from app.routers.dispatch import router as dispatch_router

__all__ = ["health_router", "optimization_router", "dispatch_router"]
