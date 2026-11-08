"""Unit tests for CleaningOptimizer and closed-form analytical parity check."""

from datetime import date, timedelta
import math
import numpy as np
import pandas as pd
import pytest

from app.services.optimizer import CleaningOptimizer, analytical_optimal_day
from app.services.physics_engine import PhysicsEngine


def test_analytical_parity_closed_form_formula():
    """Verify analytical_optimal_day implements t* = sqrt(2*C / (V*s))."""
    c_clean = 5000.0
    daily_value = 1000.0  # EGP / day
    soiling_rate = 0.0035

    expected_t = math.sqrt((2.0 * c_clean) / (daily_value * soiling_rate))
    actual_t = analytical_optimal_day(c_clean, daily_value, soiling_rate)

    assert pytest.approx(actual_t, rel=1e-4) == expected_t
    assert round(actual_t) == 53


def test_simulation_matches_analytical_parity():
    """Verify that forward discrete simulation aligns with the analytical closed-form solution.

    For constant generation E_clean and zero rain, the average cost rate minimum
    t* must match round(sqrt(2*C / (V*s))) within +/- 1 day.
    """
    optimizer = CleaningOptimizer()
    n_days = 90
    dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(n_days)]

    # Constant generation: 550 kWh/day
    daily_clean_kwh = pd.Series([550.0] * n_days, index=dates)
    daily_rainfall_mm = pd.Series([0.0] * n_days, index=dates)

    cleaning_cost = 5000.0
    electricity_rate = 2.0  # Daily value = 1100 EGP/day
    soiling_rate = 0.0035   # 0.35%/day

    daily_value_egp = 550.0 * electricity_rate  # 1100.0
    analytical_day = round(math.sqrt((2.0 * cleaning_cost) / (daily_value_egp * soiling_rate)))
    # analytical_day = round(sqrt(10000 / 3.85)) = round(50.96) = 51

    scenario_res, _, optimal_day = optimizer.optimize_scenario(
        daily_clean_kwh=daily_clean_kwh,
        daily_rainfall_mm=daily_rainfall_mm,
        start_date=dates[0],
        days_since_last_clean=0,
        cleaning_cost_egp=cleaning_cost,
        electricity_rate_egp=electricity_rate,
        soiling_rate=soiling_rate,
        scenario_name="Base Dust",
    )

    # Parity check: discrete simulation optimal day and analytical parity day match within 1 day
    assert abs(optimal_day - analytical_day) <= 1
    assert scenario_res.analytical_parity_day == analytical_day
    assert scenario_res.egp_saved >= 0.0


def test_uncertainty_scenarios_ordering():
    """Higher dust rates must produce earlier optimal cleaning days:

    t*(High Dust) <= t*(Base Dust) <= t*(Low Dust)
    """
    optimizer = CleaningOptimizer()
    n_days = 90
    dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(n_days)]

    daily_clean_kwh = pd.Series([600.0] * n_days, index=dates)
    daily_rainfall_mm = pd.Series([0.0] * n_days, index=dates)
    cleaning_cost = 4000.0
    electricity_rate = 2.0

    rates = {
        "low": 0.0015,
        "base": 0.0035,
        "high": 0.0050,
    }

    opt_days = {}
    for key, rate in rates.items():
        res, _, opt_day = optimizer.optimize_scenario(
            daily_clean_kwh=daily_clean_kwh,
            daily_rainfall_mm=daily_rainfall_mm,
            start_date=dates[0],
            days_since_last_clean=0,
            cleaning_cost_egp=cleaning_cost,
            electricity_rate_egp=electricity_rate,
            soiling_rate=rate,
            scenario_name=key,
        )
        opt_days[key] = opt_day

    # Verify monotonic relationship
    assert opt_days["high"] <= opt_days["base"]
    assert opt_days["base"] <= opt_days["low"]


def test_heavy_rain_event_defers_manual_wash():
    """If heavy rain (> 5 mm) occurs, dust is naturally cleared by rain."""
    optimizer = CleaningOptimizer()
    n_days = 90
    dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(n_days)]

    daily_clean_kwh = pd.Series([500.0] * n_days, index=dates)
    # Heavy rain event at day 30 (15 mm rain)
    rain = [0.0] * n_days
    rain[29] = 15.0
    daily_rainfall_mm = pd.Series(rain, index=dates)

    scenario_res, sim_result, opt_day = optimizer.optimize_scenario(
        daily_clean_kwh=daily_clean_kwh,
        daily_rainfall_mm=daily_rainfall_mm,
        start_date=dates[0],
        days_since_last_clean=0,
        cleaning_cost_egp=5000.0,
        electricity_rate_egp=2.0,
        soiling_rate=0.0035,
        scenario_name="Rain Aware",
    )

    # Rain cleared dust at day 30
    assert bool(sim_result.is_rain_cleaned.iloc[29]) is True
    # The optimal cleaning day shifts significantly past day 30 because panels were cleaned for free by rain
    assert opt_day > 30
