"""Unit tests for WeatherService and local JSON snapshot caching."""

from datetime import date
import json
from pathlib import Path
import shutil
import pytest
import pandas as pd

from app.services.weather_service import WeatherService
from app.config import BASE_DIR

TEST_SNAPSHOT_DIR = BASE_DIR / "snapshots" / "test_run_cache"


@pytest.fixture(autouse=True)
def clean_test_cache():
    """Setup and teardown local test snapshot directory."""
    TEST_SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    yield
    if TEST_SNAPSHOT_DIR.exists():
        shutil.rmtree(TEST_SNAPSHOT_DIR, ignore_errors=True)


def test_weather_snapshot_caching_and_reproducibility():
    """Verify that fetching weather creates a JSON snapshot and subsequent calls load from cache."""
    service = WeatherService(snapshot_dir=TEST_SNAPSHOT_DIR)
    lat, lon = 30.04, 31.23
    start = date(2026, 11, 8)

    # 1. First retrieval: should fetch or generate and save to snapshot
    telemetry_1 = service.get_weather_telemetry(
        latitude=lat,
        longitude=lon,
        start_date=start,
        horizon_days=90,
    )
    assert telemetry_1.snapshot_status == "fetched_and_cached"
    snapshot_path = Path(telemetry_1.snapshot_file)
    assert snapshot_path.exists()

    # Verify snapshot file contents
    with open(snapshot_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "metadata" in data
    assert "hourly" in data
    assert len(data["hourly"]["time"]) == 90 * 24  # 2160 hours
    assert "ghi" in data["hourly"]
    assert "dni" in data["hourly"]
    assert "dhi" in data["hourly"]
    assert "temp_air" in data["hourly"]
    assert "wind_speed" in data["hourly"]
    assert "precip" in data["hourly"]
    assert "pm10" in data["hourly"]

    # 2. Second retrieval: must load from local cache with 100% reproducibility
    telemetry_2 = service.get_weather_telemetry(
        latitude=lat,
        longitude=lon,
        start_date=start,
        horizon_days=90,
    )
    assert telemetry_2.snapshot_status == "loaded_from_cache"
    # Ensure exact identical values within roundtrip serialization precision
    pd.testing.assert_frame_equal(
        telemetry_1.data,
        telemetry_2.data,
        check_freq=False,
        check_exact=False,
        atol=1e-2,
    )


def test_weather_dataframe_structure():
    """Ensure dataframe has all required columns and 2160 hourly records for 90 days."""
    service = WeatherService(snapshot_dir=TEST_SNAPSHOT_DIR)
    lat, lon = 29.95, 31.53
    start = date(2026, 11, 8)

    telemetry = service.get_weather_telemetry(lat, lon, start, horizon_days=90)
    df = telemetry.data

    assert len(df) == 90 * 24
    expected_cols = ["time", "ghi", "dni", "dhi", "temp_air", "wind_speed", "precip", "pm10"]
    for col in expected_cols:
        assert col in df.columns

    # Irradiance and wind speed cannot be negative
    assert (df["ghi"] >= 0.0).all()
    assert (df["dni"] >= 0.0).all()
    assert (df["dhi"] >= 0.0).all()
    assert (df["wind_speed"] >= 0.0).all()
    assert (df["precip"] >= 0.0).all()
