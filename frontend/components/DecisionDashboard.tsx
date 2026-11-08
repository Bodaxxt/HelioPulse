"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  Droplets,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Clock,
  RotateCcw,
} from "lucide-react";
import { OptimizationResponse, ScenarioResult } from "../lib/types";
import { formatNum } from "../lib/format";
import SoilingCurveChart from "./SoilingCurveChart";
import UncertaintyToggle from "./UncertaintyToggle";
import ReportCard from "./ReportCard";

interface DecisionDashboardProps {
  response: OptimizationResponse;
  onReset: () => void;
}

export default function DecisionDashboard({ response, onReset }: DecisionDashboardProps) {
  const [activeScenarioKey, setActiveScenarioKey] = useState<"low_dust" | "base_dust" | "high_dust">("base_dust");

  const activeScenario = response.uncertainty_scenarios[activeScenarioKey];
  const { site_summary } = response;

  // Calculate days until optimal cleaning
  const today = new Date();
  const optDate = new Date(activeScenario.optimal_cleaning_date);
  const diffTime = optDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Site Echo & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Optimal Clean Schedule Generated
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-400">
              Snapshot: {response.weather_snapshot_status}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {site_summary.site_name || "Industrial Solar Plant"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatNum(site_summary.capacity_kwp)} kWp DC Nameplate • {formatNum(site_summary.panel_area_m2)} m² Array •{" "}
            {site_summary.latitude.toFixed(2)}°N, {site_summary.longitude.toFixed(2)}°E
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-solar-400" />
          <span>Adjust Site Inputs</span>
        </button>
      </div>

      {/* 1. Primary KPI Hero Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Optimal Cleaning Date */}
        <div className="glass-panel-glow rounded-2xl p-5 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Optimal Clean Date</span>
              <Calendar className="w-4 h-4 text-solar-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {activeScenario.optimal_cleaning_date}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Clock className="w-3 h-3" />
                {diffDays > 0 ? `In ${diffDays} days` : "Action Immediate"}
              </span>
              <span className="text-[11px] text-slate-400">Day {activeScenario.optimal_day_index} of 90</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Dust at cleaning: <strong className="text-amber-300">{activeScenario.soiling_loss_at_cleaning_pct}%</strong>
          </div>
        </div>

        {/* Card 2: Estimated Net Savings */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Net Financial Savings</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              +{formatNum(activeScenario.egp_saved)} <span className="text-sm font-sans">EGP</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Vs. routine unmanaged calendar cleaning (14-day schedule)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Energy recovered: <strong className="text-white">+{formatNum(activeScenario.energy_recovered_kwh)} kWh</strong>
          </div>
        </div>

        {/* Card 3: Water Conserved */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Nile Water Conserved</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono tracking-tight">
              {formatNum(response.water_saved_liters)} <span className="text-sm font-sans">Liters</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Calculated at national benchmark: 3.0 L/m² surface
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Per session wash: <strong className="text-white">{formatNum(response.water_per_clean_liters)} L</strong>
          </div>
        </div>

        {/* Card 4: Confidence & Parity Check */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Wilson Parity Check</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              Parity Day {activeScenario.analytical_parity_day}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Closed-Form Analytical Agreement</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Window: <strong className="text-amber-300">{response.optimal_date_range.earliest}</strong> to <strong className="text-amber-300">{response.optimal_date_range.latest}</strong>
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Recharts Soiling Graph */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800"
      >
        <SoilingCurveChart
          dailyMetrics={response.daily_metrics}
          optimalDayIndex={activeScenario.optimal_day_index}
          optimalDate={activeScenario.optimal_cleaning_date}
          soilingRatePct={activeScenario.soiling_rate_pct_day}
          initialSoilingDays={site_summary.days_since_last_clean}
        />
      </motion.div>

      {/* 3. Uncertainty & Sensitivity Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <UncertaintyToggle
          scenarios={response.uncertainty_scenarios}
          activeScenarioKey={activeScenarioKey}
          onSelectScenario={setActiveScenarioKey}
          dateRange={response.optimal_date_range}
        />
      </motion.div>

      {/* 4. Action & Report Dispatch Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ReportCard response={response} activeScenario={activeScenario} />
      </motion.div>
    </div>
  );
}

