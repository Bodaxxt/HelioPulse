"""Economic Optimizer and Scenario Analysis for Solar Panel Cleaning.
Performs 90-day forward simulation to discover the cost-optimal cleaning day t*,
evaluates Low/Base/High dust uncertainty scenarios, calculates EGP and water savings,
and validates against the closed-form Wilson cleaning parity equation.
"""

from datetime import date, timedelta
import math
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.config import settings
from app.schemas.optimization import (
    DailyMetric,
    ScenarioResult,
    OptimalDateRange,
    SiteSummary,
    OptimizationResponse,
)
from app.schemas.site import SiteInput
from app.services.physics_engine import PhysicsEngine, DailySimulationResult


def analytical_optimal_day(
    cleaning_cost_egp: float,
    daily_value_loss_egp: float,
    soiling_rate: float,
) -> float:
    """Calculate the closed-form theoretical optimal cleaning interval t*.

    Formula:
    t* = sqrt( (2 * Cleaning Cost) / (Daily Clean Generation Value * Soiling Rate) )

    Parameters
    ----------
    cleaning_cost_egp : float
        Flat cost per cleaning session in EGP.
    daily_value_loss_egp : float
        Average daily clean generation monetary value (kWh/day * EGP/kWh).
    soiling_rate : float
        Daily fractional dust degradation rate (e.g. 0.0035 for 0.35%/day).

    Returns
    -------
    float
        Continuous optimal cleaning day t*.
    """
    denominator = daily_value_loss_egp * soiling_rate
    if denominator <= 0:
        return 90.0
    return math.sqrt((2.0 * cleaning_cost_egp) / denominator)


class CleaningOptimizer:
    """Simulates 90-day forward economic trajectories to recommend optimal cleaning dates."""

    def __init__(self, physics_engine: Optional[PhysicsEngine] = None):
        self.physics = physics_engine or PhysicsEngine()

    def optimize_scenario(
        self,
        daily_clean_kwh: pd.Series,
        daily_rainfall_mm: pd.Series,
        start_date: date,
        days_since_last_clean: int,
        cleaning_cost_egp: float,
        electricity_rate_egp: float,
        soiling_rate: float,
        scenario_name: str,
    ) -> Tuple[ScenarioResult, DailySimulationResult, int]:
        """Run 90-day forward trajectory simulation for a specific soiling rate scenario.

        Parameters
        ----------
        daily_clean_kwh : pd.Series
            90-day clean baseline yield.
        daily_rainfall_mm : pd.Series
            90-day precipitation.
        start_date : date
            Simulation reference start date.
        days_since_last_clean : int
            Number of days since site was last cleaned.
        cleaning_cost_egp : float
            Flat cleaning session cost.
        electricity_rate_egp : float
            Tariff rate in EGP per kWh.
        soiling_rate : float
            Daily soiling rate for this scenario.
        scenario_name : str
            Scenario label ('Low Dust', 'Base Dust', 'High Dust').

        Returns
        -------
        Tuple[ScenarioResult, DailySimulationResult, int]
            (ScenarioResult, Optimal DailySimulationResult, optimal_day_index)
        """
        n_days = len(daily_clean_kwh)
        initial_soiling = min(
            days_since_last_clean * soiling_rate,
            settings.SOILING_LOSS_CEILING
        )

        # 1. Simulate Status Quo (No Cleaning performed across the 90 days)
        baseline_sim = self.physics.simulate_soiling_trajectory(
            daily_clean_kwh=daily_clean_kwh,
            daily_rainfall_mm=daily_rainfall_mm,
            soiling_rate=soiling_rate,
            initial_soiling=initial_soiling,
            manual_wash_days=None,
            electricity_rate_egp=electricity_rate_egp,
        )
        total_loss_no_clean_egp = float(baseline_sim.loss_egp.sum())

        # 2. Closed-form analytical parity check
        mean_daily_clean_value = float(daily_clean_kwh.mean() * electricity_rate_egp)
        continuous_t_star = analytical_optimal_day(
            cleaning_cost_egp=cleaning_cost_egp,
            daily_value_loss_egp=mean_daily_clean_value,
            soiling_rate=soiling_rate,
        )
        analytical_day = max(1, min(n_days, int(round(continuous_t_star))))

        # 3. Discover optimal cleaning day t* by minimizing lifecycle cost rate:
        # Cost Rate(t) = (Cleaning Cost + sum_{tau=1}^t Loss EGP(tau)) / t
        best_cost_rate = float("inf")
        best_day_idx = 1
        cum_loss = 0.0

        for candidate_day in range(1, n_days + 1):
            day_loss_egp = float(baseline_sim.loss_egp.iloc[candidate_day - 1])
            cum_loss += day_loss_egp
            cost_rate = (cleaning_cost_egp + cum_loss) / candidate_day
            if cost_rate < best_cost_rate:
                best_cost_rate = cost_rate
                best_day_idx = candidate_day

        # 4. Simulate full 90-day trajectory with cleaning scheduled at best_day_idx
        best_sim_result = self.physics.simulate_soiling_trajectory(
            daily_clean_kwh=daily_clean_kwh,
            daily_rainfall_mm=daily_rainfall_mm,
            soiling_rate=soiling_rate,
            initial_soiling=initial_soiling,
            manual_wash_days=[best_day_idx],
            electricity_rate_egp=electricity_rate_egp,
        )

        total_loss_with_clean_egp = float(best_sim_result.loss_egp.sum())
        total_cost_candidate = cleaning_cost_egp + total_loss_with_clean_egp
        net_savings = total_loss_no_clean_egp - total_cost_candidate
        energy_recovered = float((best_sim_result.actual_kwh - baseline_sim.actual_kwh).sum())

        is_recommended = net_savings > 0

        # Calculate soiling loss fraction at the chosen cleaning day
        soiling_at_clean = float(baseline_sim.soiling_loss.iloc[best_day_idx - 1] * 100.0)
        optimal_date = start_date + timedelta(days=(best_day_idx - 1))

        scenario_res = ScenarioResult(
            scenario_name=scenario_name,
            soiling_rate_pct_day=round(soiling_rate * 100.0, 3),
            optimal_day_index=best_day_idx,
            optimal_cleaning_date=optimal_date,
            egp_saved=round(max(0.0, net_savings), 2),
            energy_recovered_kwh=round(max(0.0, energy_recovered), 2),
            soiling_loss_at_cleaning_pct=round(soiling_at_clean, 2),
            analytical_parity_day=analytical_day,
            is_cleaning_recommended=is_recommended,
        )

        return scenario_res, best_sim_result, best_day_idx

    def run_optimization(
        self,
        site: SiteInput,
        weather_df: pd.DataFrame,
        snapshot_status: str,
        snapshot_file: Optional[str] = None,
    ) -> OptimizationResponse:
        """Run full 90-day forward optimization pipeline for a site.

        Parameters
        ----------
        site : SiteInput
            Validated site specifications.
        weather_df : pd.DataFrame
            90-day hourly weather data.
        snapshot_status : str
            Caching origin description.
        snapshot_file : Optional[str]
            Path to snapshot file.

        Returns
        -------
        OptimizationResponse
            Complete structured decision payload.
        """
        ref_date = site.simulation_start_date or date.today()
        days_since_last_clean = (ref_date - site.last_cleaned_date).days

        # 1. Compute pvlib clean generation baseline
        _, daily_clean_kwh = self.physics.compute_clean_baseline(
            weather_df=weather_df,
            latitude=site.latitude,
            longitude=site.longitude,
            capacity_kwp=site.capacity_kwp,
            tilt=site.tilt,
            azimuth=site.azimuth,
        )

        # 2. Daily rainfall aggregation
        daily_rainfall_mm = self.physics.compute_daily_rainfall(weather_df)

        # 3. Multi-Scenario Uncertainty Analysis
        scenarios = {
            "low_dust": (settings.DEFAULT_SOILING_RATE_LOW, "Low Dust"),
            "base_dust": (settings.DEFAULT_SOILING_RATE_BASE, "Base Dust"),
            "high_dust": (settings.DEFAULT_SOILING_RATE_HIGH, "High Dust"),
        }

        scenario_results: Dict[str, ScenarioResult] = {}
        base_sim: Optional[DailySimulationResult] = None
        base_day_idx: int = 1

        for key, (rate, label) in scenarios.items():
            res, sim_traj, opt_day = self.optimize_scenario(
                daily_clean_kwh=daily_clean_kwh,
                daily_rainfall_mm=daily_rainfall_mm,
                start_date=ref_date,
                days_since_last_clean=days_since_last_clean,
                cleaning_cost_egp=site.cleaning_cost_egp,
                electricity_rate_egp=site.electricity_rate_egp,
                soiling_rate=rate,
                scenario_name=label,
            )
            scenario_results[key] = res
            if key == "base_dust":
                base_sim = sim_traj
                base_day_idx = opt_day

        assert base_sim is not None

        # 4. Optimal Date Range across uncertainties
        high_res = scenario_results["high_dust"]
        base_res = scenario_results["base_dust"]
        low_res = scenario_results["low_dust"]

        all_dates = [
            high_res.optimal_cleaning_date,
            base_res.optimal_cleaning_date,
            low_res.optimal_cleaning_date,
        ]
        earliest_date = min(all_dates)
        latest_date = max(all_dates)

        date_range = OptimalDateRange(
            earliest=earliest_date,
            latest=latest_date,
            recommended=base_res.optimal_cleaning_date,
        )

        # 5. Water Savings Estimation
        panel_area = site.panel_area_m2 or (site.capacity_kwp * settings.PANEL_AREA_FACTOR_M2_PER_KWP)
        water_per_clean = panel_area * settings.WATER_CONSUMPTION_LITERS_PER_M2

        # Standard Egyptian C&I unoptimized routine: clean every 14 days = ~6 cleans in 90 days
        unoptimized_cleanings = settings.HORIZON_DAYS // settings.UNOPTIMIZED_CLEANING_INTERVAL_DAYS
        # HelioPulse optimal cleanings count in horizon: 1 if recommended, 0 if deferred/cleaned by rain
        optimal_cleanings = 1 if base_res.is_cleaning_recommended else 0
        cleans_avoided = max(0, unoptimized_cleanings - optimal_cleanings)
        water_saved_liters = cleans_avoided * water_per_clean

        # 6. Build Daily Breakdown Metrics for the Base Dust scenario
        dates = base_sim.dates
        daily_metrics: List[DailyMetric] = []
        running_cum_loss = 0.0

        for i, d in enumerate(dates):
            day_idx = i + 1
            loss_egp_val = float(base_sim.loss_egp.iloc[i])
            running_cum_loss += loss_egp_val

            daily_metrics.append(
                DailyMetric(
                    day_index=day_idx,
                    date=d,
                    clean_kwh=round(float(base_sim.clean_kwh.iloc[i]), 2),
                    actual_kwh=round(float(base_sim.actual_kwh.iloc[i]), 2),
                    soiling_loss_pct=round(float(base_sim.soiling_loss.iloc[i] * 100.0), 2),
                    energy_lost_kwh=round(float(base_sim.loss_kwh.iloc[i]), 2),
                    energy_lost_egp=round(loss_egp_val, 2),
                    cumulative_loss_egp=round(running_cum_loss, 2),
                    precipitation_mm=round(float(base_sim.rainfall_mm.iloc[i]), 2),
                    is_rain_cleaned=bool(base_sim.is_rain_cleaned.iloc[i]),
                )
            )

        # 7. Site Summary Echo
        summary = SiteSummary(
            site_id=site.site_id,
            site_name=site.site_name,
            latitude=site.latitude,
            longitude=site.longitude,
            capacity_kwp=site.capacity_kwp,
            panel_area_m2=panel_area,
            tilt=site.tilt,
            azimuth=site.azimuth,
            last_cleaned_date=site.last_cleaned_date,
            days_since_last_clean=days_since_last_clean,
            electricity_rate_egp=site.electricity_rate_egp,
            cleaning_cost_egp=site.cleaning_cost_egp,
        )

        return OptimizationResponse(
            model_version=settings.MODEL_VERSION,
            site_summary=summary,
            optimal_cleaning_date=base_res.optimal_cleaning_date,
            optimal_day_index=base_res.optimal_day_index,
            is_cleaning_recommended=base_res.is_cleaning_recommended,
            egp_saved=base_res.egp_saved,
            water_saved_liters=round(water_saved_liters, 1),
            water_per_clean_liters=round(water_per_clean, 1),
            optimal_date_range=date_range,
            uncertainty_scenarios=scenario_results,
            weather_snapshot_status=snapshot_status,
            weather_snapshot_file=snapshot_file,
            daily_metrics=daily_metrics,
        )
