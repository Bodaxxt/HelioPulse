"""Cleaning optimization API router."""

import logging
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.site import SiteInput
from app.schemas.optimization import OptimizationResponse
from app.services.weather_service import WeatherService
from app.services.optimizer import CleaningOptimizer

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Optimization"])


def get_weather_service() -> WeatherService:
    """Dependency provider for WeatherService."""
    return WeatherService()


def get_optimizer() -> CleaningOptimizer:
    """Dependency provider for CleaningOptimizer."""
    return CleaningOptimizer()


@router.post(
    "/optimize-cleaning",
    response_model=OptimizationResponse,
    summary="Optimize solar rooftop cleaning schedule",
    description=(
        "Simulates 90-day forward yield, Kimberley dust accumulation, and rain clearance "
        "to discover the net-cost-optimal cleaning date t* for Egyptian C&I rooftops."
    ),
)
async def optimize_cleaning(
    site: SiteInput,
    weather_svc: WeatherService = Depends(get_weather_service),
    optimizer: CleaningOptimizer = Depends(get_optimizer),
) -> OptimizationResponse:
    """Execute forward simulation and decision engine for site."""
    try:
        # 1. Retrieve or cache weather telemetry
        telemetry = weather_svc.get_weather_telemetry(
            latitude=site.latitude,
            longitude=site.longitude,
            start_date=site.simulation_start_date,
            horizon_days=90,
        )

        # 2. Run forward optimization pipeline
        response = optimizer.run_optimization(
            site=site,
            weather_df=telemetry.data,
            snapshot_status=telemetry.snapshot_status,
            snapshot_file=telemetry.snapshot_file,
        )

        return response
    except ValueError as ve:
        logger.error(f"Validation or domain error during optimization: {ve}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error during solar cleaning optimization: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal decision engine error: {str(e)}",
        )

