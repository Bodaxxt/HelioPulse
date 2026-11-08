"""Configuration settings for HelioPulse.
Handles environment variables, API endpoints, snapshot paths, and default physical constants.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SNAPSHOT_DIR = BASE_DIR / "snapshots"
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


class Settings:
    """Application settings and constants."""

    APP_NAME: str = "HelioPulse Solar Decision Engine"
    MODEL_VERSION: str = "1.0.0-uncalibrated"
    API_PREFIX: str = "/api/v1"

    # Open-Meteo Endpoints
    OPEN_METEO_FORECAST_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_AIR_QUALITY_URL: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    OPEN_METEO_ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1/archive"

    # Egypt Geographic Boundaries
    EGYPT_LAT_MIN: float = 22.0
    EGYPT_LAT_MAX: float = 31.5
    EGYPT_LON_MIN: float = 25.0
    EGYPT_LON_MAX: float = 37.0

    # Solar Capacity Limits (kWp)
    CAPACITY_MIN_KWP: float = 5.0
    CAPACITY_MAX_KWP: float = 2000.0

    # Physical & Operational Defaults
    DEFAULT_TILT: float = 25.0
    DEFAULT_AZIMUTH: float = 180.0  # South-facing
    DEFAULT_ELECTRICITY_RATE_EGP: float = 2.0
    DEFAULT_CLEANING_COST_EGP: float = 5000.0
    PANEL_AREA_FACTOR_M2_PER_KWP: float = 5.0
    WATER_CONSUMPTION_LITERS_PER_M2: float = 3.0

    # Kimber Soiling Defaults for Egyptian Industrial Zones
    DEFAULT_SOILING_RATE_BASE: float = 0.0035   # 0.35%/day (Base)
    DEFAULT_SOILING_RATE_LOW: float = 0.0015    # 0.15%/day (Low dust)
    DEFAULT_SOILING_RATE_HIGH: float = 0.0050   # 0.50%/day (High dust)
    RAIN_CLEARANCE_THRESHOLD_MM: float = 5.0    # Rain > 5.0 mm clears dust
    SOILING_LOSS_CEILING: float = 0.30          # Capped at 30% loss

    # Simulation Horizon
    HORIZON_DAYS: int = 90
    UNOPTIMIZED_CLEANING_INTERVAL_DAYS: int = 14  # Standard bi-weekly routine in Egyptian C&I


settings = Settings()
