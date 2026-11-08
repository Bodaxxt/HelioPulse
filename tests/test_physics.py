"""Unit tests for pvlib solar physics baseline and Kimber soiling engine."""

from datetime import date, datetime, timedelta
import numpy as np
import pandas as pd
import pytest

from app.domain.solar_physics import (
    calculate_solar_position,
    calculate_poa_irradiance,
    calculate_cell_temperature,
    calculate_pvwatts_generation,
)
from app.domain.soiling import KimberSoilingModel, compute_actual_yield
from app.services.physics_engine import PhysicsEngine


def test_pvlib_physics_pipeline():
    """Verify pvlib solar geometry, POA transposition, and PVWatts generation."""
    # 24 hours of data for Cairo (lat 30.04, lon 31.23)
    times = pd.date_range("2026-06-21 00:00", "2026-06-21 23:00", freq="1h", tz="UTC")
    lat, lon = 30.04, 31.23

    # Simulated clear-sky day in Cairo
    solar_pos = calculate_solar_position(times, lat, lon)
    zenith = solar_pos["apparent_zenith"]

    # Simple Bell curve for daylight irradiance
    is_day = zenith < 85.0
    ghi = pd.Series(np.where(is_day, np.maximum(0, 950.0 * np.cos(np.radians(zenith))), 0.0), index=times)
    dni = pd.Series(np.where(is_day, np.maximum(0, 850.0 * np.cos(np.radians(zenith))), 0.0), index=times)
    dhi = pd.Series(np.where(is_day, 100.0, 0.0), index=times)
    temp_air = pd.Series(30.0, index=times)
    wind_speed = pd.Series(3.0, index=times)

    poa = calculate_poa_irradiance(
        surface_tilt=25.0,
        surface_azimuth=180.0,
        solar_zenith=zenith,
        solar_azimuth=solar_pos["azimuth"],
        dni=dni,
        ghi=ghi,
        dhi=dhi,
    )
    assert (poa["poa_global"] >= 0.0).all()
    # Daylight hours should have high POA irradiance
    assert poa["poa_global"].max() > 700.0

    temp_cell = calculate_cell_temperature(poa["poa_global"], temp_air, wind_speed)
    # Operating cell should be warmer than ambient at peak midday sun
    assert temp_cell.max() > temp_air.max()

    # 100 kWp plant
    dc_kw, ac_kw = calculate_pvwatts_generation(poa["poa_global"], temp_cell, capacity_kwp=100.0)
    assert (ac_kw >= 0.0).all()
    assert (ac_kw <= 100.0).all()

    daily_yield_kwh = ac_kw.sum()
    # Specific yield for Cairo summer day should be realistically ~5.0 - 7.0 kWh/kWp
    specific_yield = daily_yield_kwh / 100.0
    assert 4.5 <= specific_yield <= 7.5


def test_kimber_soiling_linear_accumulation():
    """Verify linear accumulation of dust at 0.35%/day without rain."""
    model = KimberSoilingModel(soiling_rate=0.0035, rain_threshold_mm=5.0, max_soiling=0.30)
    # 10 completely dry days
    dry_rain = pd.Series([0.0] * 10)
    df = model.simulate(dry_rain, initial_soiling=0.0)

    # Day 1: 0.0035, Day 10: 0.035
    assert pytest.approx(df["soiling_loss"].iloc[0], rel=1e-3) == 0.0035
    assert pytest.approx(df["soiling_loss"].iloc[9], rel=1e-3) == 0.035
    assert not df["is_rain_cleaned"].any()


def test_kimber_rain_clearance_threshold():
    """Rain > 5.0 mm resets cumulative dust to 0; rain <= 5.0 mm does not."""
    model = KimberSoilingModel(soiling_rate=0.0035, rain_threshold_mm=5.0, max_soiling=0.30)

    # 6-day sequence: 3 dry days, light rain 3 mm (no clean), dry day, heavy rain 8 mm (cleans!)
    rainfall = pd.Series([0.0, 0.0, 0.0, 3.0, 0.0, 8.0])
    df = model.simulate(rainfall, initial_soiling=0.0)

    # Days 0, 1, 2: dust builds: 0.0035, 0.0070, 0.0105
    assert pytest.approx(df["soiling_loss"].iloc[2], rel=1e-3) == 0.0105

    # Day 3: light rain 3 mm (<= 5.0 mm threshold) -> does NOT clear, accumulates dust to 0.0140
    assert pytest.approx(df["soiling_loss"].iloc[3], rel=1e-3) == 0.0140
    assert not df["is_rain_cleaned"].iloc[3]

    # Day 4: dry -> accumulates to 0.0175
    assert pytest.approx(df["soiling_loss"].iloc[4], rel=1e-3) == 0.0175

    # Day 5: heavy rain 8 mm (> 5.0 mm) -> clears dust completely to 0.0!
    assert df["soiling_loss"].iloc[5] == 0.0
    assert df["is_rain_cleaned"].iloc[5]


def test_kimber_soiling_ceiling_cap():
    """Dust degradation is strictly capped at max_soiling (30% / 0.30)."""
    model = KimberSoilingModel(soiling_rate=0.0035, rain_threshold_mm=5.0, max_soiling=0.30)
    # 150 days dry: 150 * 0.0035 = 0.525, but must be capped at 0.30
    dry_150 = pd.Series([0.0] * 150)
    df = model.simulate(dry_150, initial_soiling=0.0)

    assert df["soiling_loss"].max() == 0.30
    assert df["soiling_loss"].iloc[-1] == 0.30


def test_actual_yield_and_energy_loss():
    """Test actual energy calculation with soiling loss."""
    clean_kwh = pd.Series([500.0, 500.0, 500.0])
    soiling_loss = pd.Series([0.0, 0.10, 0.30])  # 0%, 10%, 30% loss
    actual_kwh = compute_actual_yield(clean_kwh, soiling_loss)

    assert actual_kwh.iloc[0] == 500.0
    assert actual_kwh.iloc[1] == 450.0
    assert actual_kwh.iloc[2] == 350.0

