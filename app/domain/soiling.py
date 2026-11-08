"""Kimber Soiling Model domain implementation.
Accurately models dust accumulation, rain wash clearance, ceiling saturation,
and manual cleaning resets for Egyptian industrial PV environments.
"""

from typing import List, Optional
import numpy as np
import pandas as pd


class KimberSoilingModel:
    """Implementation of the Kimber Soiling Model for PV panels.

    Characteristics:
    - Linear daily accumulation rate (e.g. 0.35%/day).
    - Threshold rainfall (> 5.0 mm/day) triggers full or partial washing, resetting dust to 0.
    - Soiling saturation ceiling (e.g., maximum 30% transmission loss).
    - Manual wash events immediately reset accumulated soiling to zero.
    """

    def __init__(
        self,
        soiling_rate: float = 0.0035,
        rain_threshold_mm: float = 5.0,
        max_soiling: float = 0.30,
        grace_period_days: int = 0,
    ):
        """Initialize Kimber model parameters.

        Parameters
        ----------
        soiling_rate : float
            Fractional daily transmission loss rate (0.0035 = 0.35%/day).
        rain_threshold_mm : float
            Daily rainfall in mm required to wash panel surface (default 5.0 mm).
        max_soiling : float
            Maximum upper bound for dust transmission loss (default 0.30 = 30%).
        grace_period_days : int
            Number of days after rain where damp ground prevents soiling build-up (default 0 for Egyptian arid zones).
        """
        self.soiling_rate = float(soiling_rate)
        self.rain_threshold_mm = float(rain_threshold_mm)
        self.max_soiling = float(max_soiling)
        self.grace_period_days = int(grace_period_days)

    def simulate(
        self,
        daily_rainfall_mm: pd.Series,
        initial_soiling: float = 0.0,
        manual_wash_days: Optional[List[int]] = None,
    ) -> pd.DataFrame:
        """Simulate daily soiling progression over a series of daily rainfall observations.

        Parameters
        ----------
        daily_rainfall_mm : pd.Series
            Series of daily rainfall in mm (index can be integer or datetime).
        initial_soiling : float
            Initial soiling fraction at day 0 (0.0 to max_soiling).
        manual_wash_days : Optional[List[int]]
            Zero-indexed or one-indexed day numbers where manual cleaning takes place.

        Returns
        -------
        pd.DataFrame
            DataFrame with columns:
            - 'rainfall_mm': daily rainfall
            - 'soiling_loss': soiling fraction on that day [0.0 to max_soiling]
            - 'is_rain_cleaned': boolean indicating if rain washed panels
            - 'is_manually_cleaned': boolean indicating if manual wash took place
        """
        n_days = len(daily_rainfall_mm)
        manual_wash_set = set(manual_wash_days) if manual_wash_days else set()

        soiling_loss = np.zeros(n_days, dtype=float)
        is_rain_cleaned = np.zeros(n_days, dtype=bool)
        is_manually_cleaned = np.zeros(n_days, dtype=bool)

        current_soiling = min(float(initial_soiling), self.max_soiling)
        days_since_rain_event = 999

        for i in range(n_days):
            rain_mm = float(daily_rainfall_mm.iloc[i])

            # Check if manual wash occurs on this day (1-indexed or 0-indexed)
            if i in manual_wash_set or (i + 1) in manual_wash_set:
                current_soiling = 0.0
                is_manually_cleaned[i] = True

            # Check if rainfall clears the dust
            if rain_mm > self.rain_threshold_mm:
                current_soiling = 0.0
                is_rain_cleaned[i] = True
                days_since_rain_event = 0
            else:
                days_since_rain_event += 1
                # If beyond grace period, accumulate dust
                if days_since_rain_event > self.grace_period_days:
                    current_soiling = min(
                        current_soiling + self.soiling_rate,
                        self.max_soiling
                    )

            soiling_loss[i] = current_soiling

        result_df = pd.DataFrame(
            {
                "rainfall_mm": daily_rainfall_mm.values,
                "soiling_loss": soiling_loss,
                "is_rain_cleaned": is_rain_cleaned,
                "is_manually_cleaned": is_manually_cleaned,
            },
            index=daily_rainfall_mm.index,
        )
        return result_df


def compute_actual_yield(
    clean_yield_kwh: pd.Series,
    soiling_loss_fraction: pd.Series,
) -> pd.Series:
    """Calculate actual energy yield accounting for soiling degradation.

    E_actual(t) = E_clean(t) * (1 - soiling_loss(t))
    """
    actual = clean_yield_kwh * (1.0 - soiling_loss_fraction.clip(0.0, 1.0))
    return actual.clip(lower=0.0)

