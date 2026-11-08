"""Weather and dust telemetry ingestion service with local JSON snapshot caching.
Fetches high-resolution hourly irradiance, temperature, precipitation, and PM10 telemetry
from the Open-Meteo REST API, with guaranteed 100% demo reproducibility via file caching.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import httpx
import numpy as np
import pandas as pd
import pvlib

from app.config import settings, SNAPSHOT_DIR

logger = logging.getLogger(__name__)


@dataclass
class WeatherTelemetry:
    """Container for processed hourly weather telemetry and cache provenance."""

    data: pd.DataFrame
    snapshot_status: str  # "loaded_from_cache" or "fetched_and_cached"
    snapshot_file: str
    metadata: Dict


class WeatherService:
    """Service to ingest and cache weather & dust telemetry for Egyptian sites."""

    def __init__(
        self,
        snapshot_dir: Path = SNAPSHOT_DIR,
        timeout_seconds: float = 10.0,
    ):
        self.snapshot_dir = Path(snapshot_dir)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout_seconds

    def _get_snapshot_path(self, latitude: float, longitude: float, ref_date: date) -> Path:
        """Construct deterministic snapshot filename for given site coordinates and date."""
        date_str = ref_date.isoformat()
        filename = f"weather_{latitude:.2f}_{longitude:.2f}_{date_str}.json"
        return self.snapshot_dir / filename

    def get_weather_telemetry(
        self,
        latitude: float,
        longitude: float,
        start_date: Optional[date] = None,
        horizon_days: int = 90,
    ) -> WeatherTelemetry:
        """Retrieve 90-day hourly weather telemetry from local snapshot cache or Open-Meteo API.

        Parameters
        ----------
        latitude : float
            Site latitude in degrees.
        longitude : float
            Site longitude in degrees.
        start_date : Optional[date]
            Reference start date (defaults to today).
        horizon_days : int
            Forward simulation horizon in days (default 90).

        Returns
        -------
        WeatherTelemetry
            Container with hourly DataFrame and caching metadata.
        """
        ref_date = start_date or date.today()
        snapshot_path = self._get_snapshot_path(latitude, longitude, ref_date)

        # 1. Check local file-based cache first for 100% reproducibility
        if snapshot_path.exists():
            try:
                telemetry = self._load_snapshot(snapshot_path)
                logger.info(f"Loaded weather telemetry from snapshot: {snapshot_path.name}")
                return WeatherTelemetry(
                    data=telemetry["data"],
                    snapshot_status="loaded_from_cache",
                    snapshot_file=str(snapshot_path),
                    metadata=telemetry["metadata"],
                )
            except Exception as e:
                logger.warning(f"Failed to read existing snapshot {snapshot_path}: {e}. Refetching.")

        # 2. Fetch fresh telemetry from Open-Meteo REST API
        data_df, metadata = self._fetch_and_blend_telemetry(
            latitude=latitude,
            longitude=longitude,
            start_date=ref_date,
            horizon_days=horizon_days,
        )

        # 3. Save payload to local JSON snapshot
        self._save_snapshot(snapshot_path, data_df, metadata)
        logger.info(f"Saved weather telemetry snapshot to: {snapshot_path.name}")

        return WeatherTelemetry(
            data=data_df,
            snapshot_status="fetched_and_cached",
            snapshot_file=str(snapshot_path),
            metadata=metadata,
        )

    def _fetch_openmeteo_forecast(
        self,
        latitude: float,
        longitude: float,
        days: int = 16,
    ) -> Optional[Dict]:
        """Fetch hourly forecast from Open-Meteo forecast endpoint."""
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": "shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m,precipitation",
            "forecast_days": min(days, 16),
            "timezone": "UTC",
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(settings.OPEN_METEO_FORECAST_URL, params=params)
                if resp.status_code == 200:
                    return resp.json().get("hourly")
                logger.warning(f"Open-Meteo forecast responded with status {resp.status_code}")
        except Exception as e:
            logger.warning(f"Error querying Open-Meteo forecast: {e}")
        return None

    def _fetch_openmeteo_air_quality(
        self,
        latitude: float,
        longitude: float,
    ) -> Optional[List[float]]:
        """Fetch PM10 particulate matter metrics from Open-Meteo Air Quality endpoint."""
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": "pm10",
            "timezone": "UTC",
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(settings.OPEN_METEO_AIR_QUALITY_URL, params=params)
                if resp.status_code == 200:
                    return resp.json().get("hourly", {}).get("pm10")
        except Exception as e:
            logger.warning(f"Error querying Open-Meteo Air Quality: {e}")
        return None

    def _fetch_and_blend_telemetry(
        self,
        latitude: float,
        longitude: float,
        start_date: date,
        horizon_days: int = 90,
    ) -> tuple[pd.DataFrame, Dict]:
        """Fetch available API telemetry and project full 90-day horizon using pvlib clear-sky physics."""
        # 1. Attempt API calls
        forecast_hourly = self._fetch_openmeteo_forecast(latitude, longitude, days=16)
        air_quality_pm10 = self._fetch_openmeteo_air_quality(latitude, longitude)

        # 2. Build full 90-day hourly DatetimeIndex in UTC
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=horizon_days)
        full_times = pd.date_range(start=start_dt, end=end_dt, freq="1h", inclusive="left")
        total_hours = len(full_times)

        # 3. Compute baseline Ineichen clear-sky irradiance for Egypt
        loc = pvlib.location.Location(latitude=latitude, longitude=longitude, tz="UTC")
        clearsky = loc.get_clearsky(full_times, model="ineichen")

        # Atmospheric dust transmittance scaling factor for Egyptian industrial atmospheres (~0.90)
        transmittance = 0.90
        synth_ghi = (clearsky["ghi"] * transmittance).clip(lower=0.0)
        synth_dni = (clearsky["dni"] * transmittance).clip(lower=0.0)
        synth_dhi = (clearsky["dhi"] * transmittance).clip(lower=0.0)

        # Diurnal profiles computed as pure numpy arrays
        hours_arr = full_times.hour.to_numpy(dtype=float)
        minutes_arr = full_times.minute.to_numpy(dtype=float)
        day_fraction = (hours_arr + minutes_arr / 60.0) / 24.0

        synth_temp = 25.0 + 8.0 * np.sin(2 * np.pi * (day_fraction - 0.35))
        synth_wind = 3.5 + 1.5 * np.cos(2 * np.pi * day_fraction)
        synth_precip = np.zeros(total_hours, dtype=float)
        synth_pm10 = 65.0 + 15.0 * np.sin(2 * np.pi * day_fraction)

        # 4. Initialize numpy arrays with synthetic physical baseline
        ghi_arr = np.asarray(synth_ghi.values, dtype=float).copy()
        dni_arr = np.asarray(synth_dni.values, dtype=float).copy()
        dhi_arr = np.asarray(synth_dhi.values, dtype=float).copy()
        temp_arr = np.asarray(synth_temp, dtype=float).copy()
        wind_arr = np.asarray(synth_wind, dtype=float).copy()
        precip_arr = np.asarray(synth_precip, dtype=float).copy()
        pm10_arr = np.asarray(synth_pm10, dtype=float).copy()

        # 5. Overlay real Open-Meteo telemetry where available
        source_desc = "synthetic_clearsky_pvlib"
        if forecast_hourly and "time" in forecast_hourly:
            source_desc = "open_meteo_forecast_hybrid"
            f_times = forecast_hourly["time"]
            n_api = min(len(f_times), total_hours)
            if "shortwave_radiation" in forecast_hourly:
                ghi_arr[:n_api] = forecast_hourly["shortwave_radiation"][:n_api]
            if "direct_normal_irradiance" in forecast_hourly:
                dni_arr[:n_api] = forecast_hourly["direct_normal_irradiance"][:n_api]
            if "diffuse_radiation" in forecast_hourly:
                dhi_arr[:n_api] = forecast_hourly["diffuse_radiation"][:n_api]
            if "temperature_2m" in forecast_hourly:
                temp_arr[:n_api] = forecast_hourly["temperature_2m"][:n_api]
            if "wind_speed_10m" in forecast_hourly:
                wind_arr[:n_api] = forecast_hourly["wind_speed_10m"][:n_api]
            if "precipitation" in forecast_hourly:
                precip_arr[:n_api] = forecast_hourly["precipitation"][:n_api]

        if air_quality_pm10:
            n_pm = min(len(air_quality_pm10), total_hours)
            valid_pm = [p if p is not None else 60.0 for p in air_quality_pm10[:n_pm]]
            pm10_arr[:n_pm] = valid_pm

        data_df = pd.DataFrame(
            {
                "time": full_times,
                "ghi": np.nan_to_num(ghi_arr, nan=0.0).clip(min=0.0),
                "dni": np.nan_to_num(dni_arr, nan=0.0).clip(min=0.0),
                "dhi": np.nan_to_num(dhi_arr, nan=0.0).clip(min=0.0),
                "temp_air": np.nan_to_num(temp_arr, nan=25.0),
                "wind_speed": np.nan_to_num(wind_arr, nan=3.0).clip(min=0.0),
                "precip": np.nan_to_num(precip_arr, nan=0.0).clip(min=0.0),
                "pm10": np.nan_to_num(pm10_arr, nan=60.0).clip(min=0.0),
            },
            index=full_times,
        )

        metadata = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "start_date": start_date.isoformat(),
            "horizon_days": horizon_days,
            "total_hours": total_hours,
            "source": source_desc,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        return data_df, metadata

    def _save_snapshot(self, path: Path, df: pd.DataFrame, metadata: Dict) -> None:
        """Serialize hourly DataFrame and metadata to local JSON snapshot file."""
        payload = {
            "metadata": metadata,
            "hourly": {
                "time": [t.isoformat() for t in df["time"]],
                "ghi": df["ghi"].round(2).tolist(),
                "dni": df["dni"].round(2).tolist(),
                "dhi": df["dhi"].round(2).tolist(),
                "temp_air": df["temp_air"].round(2).tolist(),
                "wind_speed": df["wind_speed"].round(2).tolist(),
                "precip": df["precip"].round(3).tolist(),
                "pm10": df["pm10"].round(2).tolist(),
            },
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    def _load_snapshot(self, path: Path) -> Dict:
        """Deserialize hourly DataFrame from local JSON snapshot file."""
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        hourly = payload["hourly"]
        times = pd.to_datetime(hourly["time"], utc=True)
        df = pd.DataFrame(
            {
                "time": times,
                "ghi": hourly["ghi"],
                "dni": hourly["dni"],
                "dhi": hourly["dhi"],
                "temp_air": hourly["temp_air"],
                "wind_speed": hourly["wind_speed"],
                "precip": hourly["precip"],
                "pm10": hourly.get("pm10", [60.0] * len(times)),
            },
            index=times,
        )
        return {"data": df, "metadata": payload.get("metadata", {})}
