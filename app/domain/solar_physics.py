"""Domain-level solar physics calculations for HelioPulse.
Handles solar geometry, POA transposition, cell temperature, and PVWatts DC/AC modeling.
"""

from typing import Tuple
import numpy as np
import pandas as pd
import pvlib
from pvlib import irradiance, solarposition, temperature, pvsystem, inverter


def calculate_solar_position(
    times: pd.DatetimeIndex,
    latitude: float,
    longitude: float,
) -> pd.DataFrame:
    """Calculate solar azimuth and zenith angles for given timestamps and coordinates.

    Parameters
    ----------
    times : pd.DatetimeIndex
        Time series index with UTC or localized timezone.
    latitude : float
        Latitude in degrees.
    longitude : float
        Longitude in degrees.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns 'apparent_zenith', 'zenith', 'azimuth', etc.
    """
    return solarposition.get_solarposition(times, latitude, longitude)


def calculate_poa_irradiance(
    surface_tilt: float,
    surface_azimuth: float,
    solar_zenith: pd.Series,
    solar_azimuth: pd.Series,
    dni: pd.Series,
    ghi: pd.Series,
    dhi: pd.Series,
) -> pd.DataFrame:
    """Transpose horizontal irradiance components onto a tilted plane (Plane of Array - POA).

    Uses the Hay-Davies transposition model via pvlib get_total_irradiance.

    Parameters
    ----------
    surface_tilt : float
        Tilt angle in degrees from horizontal.
    surface_azimuth : float
        Azimuth angle in degrees (180 = South).
    solar_zenith : pd.Series
        Solar zenith angles.
    solar_azimuth : pd.Series
        Solar azimuth angles.
    dni : pd.Series
        Direct Normal Irradiance in W/m².
    ghi : pd.Series
        Global Horizontal Irradiance in W/m².
    dhi : pd.Series
        Diffuse Horizontal Irradiance in W/m².

    Returns
    -------
    pd.DataFrame
        DataFrame containing 'poa_global', 'poa_direct', 'poa_diffuse', 'poa_sky_diffuse'.
    """
    dni_extra = irradiance.get_extra_radiation(solar_zenith.index)
    poa_data = irradiance.get_total_irradiance(
        surface_tilt=surface_tilt,
        surface_azimuth=surface_azimuth,
        solar_zenith=solar_zenith,
        solar_azimuth=solar_azimuth,
        dni=dni,
        ghi=ghi,
        dhi=dhi,
        dni_extra=dni_extra,
        model="haydavies",
    )
    # Clip negative values resulting from low sun angles
    poa_data["poa_global"] = poa_data["poa_global"].clip(lower=0.0)
    return poa_data


def calculate_cell_temperature(
    poa_global: pd.Series,
    temp_air: pd.Series,
    wind_speed: pd.Series,
) -> pd.Series:
    """Estimate operating PV cell temperature using standard open-rack SAPM or Faiman parameters.

    In Egyptian industrial zones (Cairo, 10th of Ramadan), high ambient temperatures
    and dust exacerbate thermal losses.
    """
    temp_cell = temperature.faiman(
        poa_global=poa_global,
        temp_air=temp_air,
        wind_speed=wind_speed,
        u0=25.0,
        u1=6.84,
    )
    return temp_cell


def calculate_pvwatts_generation(
    poa_global: pd.Series,
    temp_cell: pd.Series,
    capacity_kwp: float,
    gamma_pdc: float = -0.0035,
    inverter_efficiency: float = 0.96,
) -> Tuple[pd.Series, pd.Series]:
    """Calculate clean DC and AC power generation profiles using PVWatts.

    Parameters
    ----------
    poa_global : pd.Series
        Plane-of-array global irradiance in W/m².
    temp_cell : pd.Series
        Cell temperature in °C.
    capacity_kwp : float
        Nameplate DC capacity in kWp.
    gamma_pdc : float
        Temperature coefficient of maximum power (1/°C), default -0.35%/°C (-0.0035).
    inverter_efficiency : float
        Nominal inverter efficiency (default 96%).

    Returns
    -------
    Tuple[pd.Series, pd.Series]
        (dc_power_kw, ac_power_kw) time series.
    """
    pdc0_w = capacity_kwp * 1000.0  # Watts
    pdc_w = pvsystem.pvwatts_dc(
        effective_irradiance=poa_global,
        temp_cell=temp_cell,
        pdc0=pdc0_w,
        gamma_pdc=gamma_pdc,
        temp_ref=25.0,
    )
    pdc_w = pdc_w.clip(lower=0.0)

    # Inverter AC Power
    pac_w = inverter.pvwatts(
        pdc=pdc_w,
        pdc0=pdc0_w,
        eta_inv_nom=inverter_efficiency,
    )
    pac_w = pac_w.clip(lower=0.0)

    # Convert to kW
    dc_power_kw = pdc_w / 1000.0
    ac_power_kw = pac_w / 1000.0

    return dc_power_kw, ac_power_kw
