"""Site Input Schema and Validation using Pydantic v2.
Strict boundaries for Egyptian industrial C&I solar rooftop installations.
"""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class SiteInput(BaseModel):
    """Input payload for a solar rooftop plant requiring cleaning optimization."""

    site_id: Optional[str] = Field(
        default=None,
        description="Unique site identifier (e.g., 'EGY-CAI-ROOFTOP-01')",
        examples=["EGY-CAI-ROOFTOP-01"],
    )
    site_name: Optional[str] = Field(
        default="Industrial Rooftop Facility",
        description="Human-readable site name (e.g. 10th of Ramadan Plastics Factory)",
        examples=["10th of Ramadan Plastics Plant"],
    )
    latitude: float = Field(
        ...,
        ge=22.0,
        le=31.5,
        description="Site latitude strictly within Egypt territory [22.0, 31.5]",
        examples=[30.0444],
    )
    longitude: float = Field(
        ...,
        ge=25.0,
        le=37.0,
        description="Site longitude strictly within Egypt territory [25.0, 37.0]",
        examples=[31.2357],
    )
    capacity_kwp: float = Field(
        ...,
        ge=5.0,
        le=2000.0,
        description="Installed DC capacity in kWp [5.0 to 2000.0 kWp]",
        examples=[500.0],
    )
    tilt: float = Field(
        default=25.0,
        ge=0.0,
        le=60.0,
        description="Panel tilt angle in degrees from horizontal [0.0, 60.0]",
        examples=[25.0],
    )
    azimuth: float = Field(
        default=180.0,
        ge=0.0,
        le=360.0,
        description="Panel azimuth angle in degrees [0.0, 360.0] (180.0 = South facing)",
        examples=[180.0],
    )
    last_cleaned_date: date = Field(
        ...,
        description="Date of the last panel cleaning session. Must not be in the future.",
        examples=["2026-10-15"],
    )
    simulation_start_date: Optional[date] = Field(
        default=None,
        description="Reference start date for forward simulation (defaults to today).",
        examples=["2026-11-08"],
    )
    electricity_rate_egp: float = Field(
        default=2.0,
        gt=0.0,
        description="Cost of electricity per kWh in Egyptian Pounds (EGP)",
        examples=[2.5],
    )
    cleaning_cost_egp: float = Field(
        default=5000.0,
        gt=0.0,
        description="Flat operational cost per cleaning event in Egyptian Pounds (EGP)",
        examples=[4500.0],
    )
    panel_area_m2: Optional[float] = Field(
        default=None,
        gt=0.0,
        description="Total solar panel surface area in m². Auto-calculated as capacity_kwp * 5.0 if omitted.",
        examples=[2500.0],
    )

    @model_validator(mode="after")
    def validate_and_compute_derived(self) -> "SiteInput":
        """Validate logical date constraints and auto-compute missing derived fields."""
        # 1. Determine effective reference date
        ref_date = self.simulation_start_date or date.today()

        # 2. Strict validation: last_cleaned_date must not be in the future relative to ref_date
        if self.last_cleaned_date > ref_date:
            raise ValueError(
                f"last_cleaned_date ({self.last_cleaned_date}) cannot be in the future relative to "
                f"simulation start date ({ref_date})."
            )

        # 3. Auto-calculate panel area if missing
        if self.panel_area_m2 is None:
            self.panel_area_m2 = round(self.capacity_kwp * 5.0, 2)

        return self

