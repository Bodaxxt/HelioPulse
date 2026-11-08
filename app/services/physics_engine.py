"""Physics Engine combining pvlib Solar Baseline Generation and the Kimber Soiling Model.
Computes hourly transposition, cell temperature, PVWatts DC/AC yield, daily aggregation,
and actual soiling-degraded energy yield.
"""

from dataclasses import dataclass
from datetime import date
from typing import List, Optional, Tuple
import pandas as pd
import numpy as np

from app.domain.solar_physics import (
    calculate_solar_position,
    calculate_poa_irradiance,
    calculate_cell_temperature,
    calculate_pvwatts_generation,
)
from app.domain.soiling import KimberSoilingModel, compute_actual_yield


@dataclass
class DailySimulationResult:
    """Consolidated daily physics and generation metrics."""

    dates: List[date]
    clean_kwh: pd.Series
    actual_kwh: pd.Series
    soiling_loss: pd.Series
    loss_kwh: pd.Series
    loss_egp: pd.Series
    rainfall_mm: pd.Series
    is_rain_cleaned: pd.Series


class PhysicsEngine:
    """High-performance solar physics and soiling engine for Egyptian C&I rooftops."""

    def __init__(
        self,
        rain_threshold_mm: float = 5.0,
        max_soiling: float = 0.30,
        gamma_pdc: float = -0.0035,
        inverter_efficiency: float = 0.96,
    ):
        self.rain_threshold_mm = rain_threshold_mm
        self.max_soiling = max_soiling
        self.gamma_pdc = gamma_pdc
        self.inverter_efficiency = inverter_efficiency

    def compute_clean_baseline(
        self,
        weather_df: pd.DataFrame,
        latitude: float,
        longitude: float,
        capacity_kwp: float,
        tilt: float = 25.0,
        azimuth: float = 180.0,
    ) -> Tuple[pd.Series, pd.Series]:
        """Compute hourly and daily clean baseline energy yield ($E_{clean}$) using pvlib.

        Parameters
        ----------
        weather_df : pd.DataFrame
            Hourly weather dataframe with index DatetimeIndex and columns:
            ['ghi', 'dni', 'dhi', 'temp_air', 'wind_speed', 'precip']
        latitude : float
            Site latitude in degrees.
        longitude : float
            Site longitude in degrees.
        capacity_kwp : float
            DC capacity in kWp.
        tilt : float
            Tilt angle in degrees.
        azimuth : float
            Azimuth angle in degrees (180 = South).

        Returns
        -------
        Tuple[pd.Series, pd.Series]
            (hourly_ac_kwh, daily_clean_kwh)
        """
        times = weather_df.index
        # 1. Solar position
        solar_pos = calculate_solar_position(times, latitude, longitude)

        # 2. Transposition to Plane of Array (POA)
        poa = calculate_poa_irradiance(
            surface_tilt=tilt,
            surface_azimuth=azimuth,
            solar_zenith=solar_pos["apparent_zenith"],
            solar_azimuth=solar_pos["azimuth"],
            dni=weather_df["dni"],
            ghi=weather_df["ghi"],
            dhi=weather_df["dhi"],
        )

        # 3. Cell temperature
        temp_cell = calculate_cell_temperature(
            poa_global=poa["poa_global"],
            temp_air=weather_df["temp_air"],
            wind_speed=weather_df["wind_speed"],
        )

        # 4. PVWatts DC and AC power (kW)
        _, ac_power_kw = calculate_pvwatts_generation(
            poa_global=poa["poa_global"],
            temp_cell=temp_cell,
            capacity_kwp=capacity_kwp,
            gamma_pdc=self.gamma_pdc,
            inverter_efficiency=self.inverter_efficiency,
        )

        # Hourly energy in kWh = AC power in kW * 1 hour interval
        hourly_ac_kwh = ac_power_kw.copy()

        # Aggregate to daily total kWh
        daily_clean_kwh = hourly_ac_kwh.groupby(hourly_ac_kwh.index.date).sum()

        return hourly_ac_kwh, daily_clean_kwh

    def compute_daily_rainfall(self, weather_df: pd.DataFrame) -> pd.Series:
        """Aggregate hourly precipitation into daily rainfall in mm."""
        return weather_df["precip"].groupby(weather_df.index.date).sum()

    def simulate_soiling_trajectory(
        self,
        daily_clean_kwh: pd.Series,
        daily_rainfall_mm: pd.Series,
        soiling_rate: float,
        initial_soiling: float = 0.0,
        manual_wash_days: Optional[List[int]] = None,
        electricity_rate_egp: float = 2.0,
    ) -> DailySimulationResult:
        """Simulate the daily Kimber soiling trajectory and economic loss.

        Parameters
        ----------
        daily_clean_kwh : pd.Series
            Daily clean baseline energy generation.
        daily_rainfall_mm : pd.Series
            Daily rainfall series in mm.
        soiling_rate : float
            Daily fractional dust accumulation rate (e.g. 0.0035 for 0.35%/day).
        initial_soiling : float
            Initial soiling fraction at day 0.
        manual_wash_days : Optional[List[int]]
            Days on which manual washing occurs.
        electricity_rate_egp : float
            Electricity tariff rate in EGP per kWh.

        Returns
        -------
        DailySimulationResult
            Detailed daily metrics.
        """
        soiling_model = KimberSoilingModel(
            soiling_rate=soiling_rate,
            rain_threshold_mm=self.rain_threshold_mm,
            max_soiling=self.max_soiling,
        )

        soiling_df = soiling_model.simulate(
            daily_rainfall_mm=daily_rainfall_mm,
            initial_soiling=initial_soiling,
            manual_wash_days=manual_wash_days,
        )

        dates = list(daily_clean_kwh.index)
        soiling_loss = pd.Series(soiling_df["soiling_loss"].values, index=dates)
        rainfall_series = pd.Series(soiling_df["rainfall_mm"].values, index=dates)
        rain_cleaned_series = pd.Series(soiling_df["is_rain_cleaned"].values, index=dates)

        # Actual yield accounting for soiling degradation: E_actual = E_clean * (1 - soiling_loss)
        actual_kwh = compute_actual_yield(daily_clean_kwh, soiling_loss)

        # Lost energy and monetary value
        loss_kwh = (daily_clean_kwh - actual_kwh).clip(lower=0.0)
        loss_egp = loss_kwh * electricity_rate_egp

        return DailySimulationResult(
            dates=dates,
            clean_kwh=daily_clean_kwh,
            actual_kwh=actual_kwh,
            soiling_loss=soiling_loss,
            loss_kwh=loss_kwh,
            loss_egp=loss_egp,
            rainfall_mm=rainfall_series,
            is_rain_cleaned=rain_cleaned_series,
        )

