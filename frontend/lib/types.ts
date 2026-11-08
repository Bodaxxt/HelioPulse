export interface SiteInput {
  site_id?: string;
  site_name?: string;
  latitude: number;
  longitude: number;
  capacity_kwp: number;
  tilt: number;
  azimuth: number;
  last_cleaned_date: string;
  simulation_start_date?: string;
  electricity_rate_egp: number;
  cleaning_cost_egp: number;
  panel_area_m2?: number;
}

export interface DailyMetric {
  day_index: number;
  date: string;
  clean_kwh: number;
  actual_kwh: number;
  soiling_loss_pct: number;
  energy_lost_kwh: number;
  energy_lost_egp: number;
  cumulative_loss_egp: number;
  precipitation_mm: number;
  is_rain_cleaned: boolean;
}

export interface ScenarioResult {
  scenario_name: string;
  soiling_rate_pct_day: number;
  optimal_day_index: number;
  optimal_cleaning_date: string;
  egp_saved: number;
  energy_recovered_kwh: number;
  soiling_loss_at_cleaning_pct: number;
  analytical_parity_day: number;
  is_cleaning_recommended: boolean;
}

export interface OptimalDateRange {
  earliest: string;
  latest: string;
  recommended: string;
}

export interface SiteSummary {
  site_id?: string;
  site_name?: string;
  latitude: number;
  longitude: number;
  capacity_kwp: number;
  panel_area_m2: number;
  tilt: number;
  azimuth: number;
  last_cleaned_date: string;
  days_since_last_clean: number;
  electricity_rate_egp: number;
  cleaning_cost_egp: number;
}

export interface OptimizationResponse {
  model_version: string;
  site_summary: SiteSummary;
  optimal_cleaning_date: string;
  optimal_day_index: number;
  is_cleaning_recommended: boolean;
  egp_saved: number;
  water_saved_liters: number;
  water_per_clean_liters: number;
  optimal_date_range: OptimalDateRange;
  uncertainty_scenarios: {
    low_dust: ScenarioResult;
    base_dust: ScenarioResult;
    high_dust: ScenarioResult;
  };
  weather_snapshot_status: string;
  weather_snapshot_file?: string;
  daily_metrics: DailyMetric[];
}

export interface EgyptianHubPreset {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  typicalCapacityKwp: number;
  description: string;
}

export const EGYPTIAN_INDUSTRIAL_HUBS: EgyptianHubPreset[] = [
  {
    name: "10th of Ramadan",
    region: "Sharqia Governorate",
    latitude: 30.31,
    longitude: 31.74,
    typicalCapacityKwp: 500,
    description: "High dust industrial manufacturing zone (textiles, ceramics, steel)",
  },
  {
    name: "6th of October",
    region: "Giza Governorate",
    latitude: 29.93,
    longitude: 30.92,
    typicalCapacityKwp: 400,
    description: "Major automotive, electronics & food processing rooftop belt",
  },
  {
    name: "Sadat City",
    region: "Monufia / Desert Road",
    latitude: 30.38,
    longitude: 30.52,
    typicalCapacityKwp: 600,
    description: "Desert highway industrial corridor with high particulate dust",
  },
  {
    name: "Borg El Arab",
    region: "Alexandria Governorate",
    latitude: 30.92,
    longitude: 29.67,
    typicalCapacityKwp: 350,
    description: "Coastal industrial hub with occasional winter rain events",
  },
  {
    name: "Ain Sokhna",
    region: "Suez / Red Sea",
    latitude: 29.60,
    longitude: 32.32,
    typicalCapacityKwp: 750,
    description: "Heavy logistics, petrochemical & port rooftop complexes",
  },
];

