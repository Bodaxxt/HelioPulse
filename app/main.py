"""HelioPulse Solar Decision Engine - Main FastAPI Application.
Production-grade solar physics and cleaning optimization API for Egyptian C&I rooftops.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health_router, optimization_router

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Zero-hardware Solar Panel Cleaning Decision Engine tailored for Egyptian "
        "industrial C&I rooftop installations (50 to 2000 kWp). Integrates Open-Meteo "
        "telemetry, pvlib solar baseline generation, Kimber soiling dynamics, and economic optimization."
    ),
    version=settings.MODEL_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend or dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api/v1
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(optimization_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
def root_status():
    """Welcome and quick documentation link."""
    return {
        "service": settings.APP_NAME,
        "version": settings.MODEL_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
        "optimize_endpoint": f"{settings.API_PREFIX}/optimize-cleaning",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

