"""Optimization and decision schemas for HelioPulse.
Covers optimization results, scenario analysis, daily telemetry breakdowns, and API response models.
"""

from datetime import date as dt_date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class DailyMetric(BaseModel):
    """Daily generation, soiling, and economic metrics over the 90-day simulation."""

    day_index: int = Field(..., description="Day index in simulation horizon (1-90)")
    date: dt_date = Field(..., description="Calendar date")
    clean_kwh: float = Field(..., description="Theoretical clean panel yield in kWh")
    actual_kwh: float = Field(..., description="Actual yield accounting for cumulative dust in kWh")
    soiling_loss_pct: float = Field(..., description="Soiling degradation percentage on this day [0-30%]")
    energy_lost_kwh: float = Field(..., description="Energy lost due to soiling in kWh")
    energy_lost_egp: float = Field(..., description="Monetary value of lost energy in EGP")
    cumulative_loss_egp: float = Field(..., description="Running cumulative loss from simulation day 1 in EGP")
    precipitation_mm: float = Field(..., description="Total precipitation on this day in mm")
    is_rain_cleaned: bool = Field(..., description="Whether rain cleared panel dust on this day")


class ScenarioResult(BaseModel):
    """Optimization metrics under a specific dust/soiling scenario."""

    scenario_name: str = Field(..., description="Scenario identifier (Low Dust, Base Dust, High Dust)")
    soiling_rate_pct_day: float = Field(..., description="Daily soiling rate in %/day")
    optimal_day_index: int = Field(..., description="Optimal day index to perform cleaning (1-90)")
    optimal_cleaning_date: dt_date = Field(..., description="Calendar date recommended for cleaning")
    egp_saved: float = Field(..., description="Net economic savings achieved over 90-day horizon in EGP")
    energy_recovered_kwh: float = Field(..., description="Additional kWh generated due to timely cleaning")
    soiling_loss_at_cleaning_pct: float = Field(..., description="Dust loss percentage accumulated by cleaning day")
    analytical_parity_day: int = Field(..., description="Closed-form Wilson parity optimal day check")
    is_cleaning_recommended: bool = Field(
        ...,
        description="Whether cleaning yields a positive net economic return within horizon"
    )


class OptimalDateRange(BaseModel):
    """Window of optimal cleaning dates across uncertainty scenarios."""

    earliest: dt_date = Field(..., description="Earliest cleaning date (typically High Dust scenario)")
    latest: dt_date = Field(..., description="Latest cleaning date (typically Low Dust scenario)")
    recommended: dt_date = Field(..., description="Primary recommendation (Base Dust scenario)")


class SiteSummary(BaseModel):
    """Echoed summary of site physical and economic properties."""

    site_id: Optional[str]
    site_name: Optional[str]
    latitude: float
    longitude: float
    capacity_kwp: float
    panel_area_m2: float
    tilt: float
    azimuth: float
    last_cleaned_date: dt_date
    days_since_last_clean: int
    electricity_rate_egp: float
    cleaning_cost_egp: float


class OptimizationResponse(BaseModel):
    """Complete response payload for the solar panel cleaning decision engine."""

    model_version: str = Field(default="1.0.0-uncalibrated")
    site_summary: SiteSummary
    optimal_cleaning_date: dt_date = Field(..., description="Recommended date for panel cleaning session")
    optimal_day_index: int = Field(..., description="Recommended day index (1-90)")
    is_cleaning_recommended: bool = Field(
        ...,
        description="Whether cleaning yields positive net EGP savings within the 90-day horizon"
    )
    egp_saved: float = Field(..., description="Net monetary savings in EGP (Base Dust)")
    water_saved_liters: float = Field(
        ...,
        description="Liters of water saved by deferring unnecessary calendar cleanings"
    )
    water_per_clean_liters: float = Field(
        ...,
        description="Total water consumed per single cleaning session based on panel area"
    )
    optimal_date_range: OptimalDateRange
    uncertainty_scenarios: Dict[str, ScenarioResult]
    weather_snapshot_status: str = Field(
        ...,
        description="Origin of weather telemetry ('loaded_from_cache' or 'fetched_and_cached')"
    )
    weather_snapshot_file: Optional[str] = Field(
        default=None,
        description="Local path to cached JSON telemetry payload"
    )
    daily_metrics: List[DailyMetric] = Field(
        ...,
        description="Hourly-aggregated daily time-series over 90-day forward horizon"
    )
