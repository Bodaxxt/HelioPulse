"use client";

import React from "react";
import { ScenarioResult, OptimalDateRange } from "../lib/types";
import { formatNum } from "../lib/format";
import { CloudDrizzle, SunMedium, Wind, ShieldAlert, CheckCircle2 } from "lucide-react";

interface UncertaintyToggleProps {
  scenarios: {
    low_dust: ScenarioResult;
    base_dust: ScenarioResult;
    high_dust: ScenarioResult;
  };
  activeScenarioKey: "low_dust" | "base_dust" | "high_dust";
  onSelectScenario: (key: "low_dust" | "base_dust" | "high_dust") => void;
  dateRange: OptimalDateRange;
}

export default function UncertaintyToggle({
  scenarios,
  activeScenarioKey,
  onSelectScenario,
  dateRange,
}: UncertaintyToggleProps) {
  const scenarioKeys: Array<{
    key: "low_dust" | "base_dust" | "high_dust";
    label: string;
    rate: string;
    icon: React.ReactNode;
    desc: string;
  }> = [
    {
      key: "low_dust",
      label: "Low Dust",
      rate: "0.15% / day",
      icon: <CloudDrizzle className="w-4 h-4 text-emerald-400" />,
      desc: "Mild desert winds or frequent cleaning zone",
    },
    {
      key: "base_dust",
      label: "Base Egyptian Dust",
      rate: "0.35% / day",
      icon: <SunMedium className="w-4 h-4 text-amber-400" />,
      desc: "Realistic 10th of Ramadan & 6th October industrial baseline",
    },
    {
      key: "high_dust",
      label: "High Dust Saturation",
      rate: "0.50% / day",
      icon: <Wind className="w-4 h-4 text-rose-400" />,
      desc: "Heavy dust corridor (cement, ceramics, quarry vicinity)",
    },
  ];

  const active = scenarios[activeScenarioKey];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Dust Model Uncertainty & Sensitivity Matrix</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              3 Scenarios
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Compare cleaning timing and financial returns across low, standard, and aggressive soiling rates.
          </p>
        </div>

        {/* Date Window Badge */}
        <div className="text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 flex items-center gap-2">
          <span className="text-slate-400">Window:</span>
          <span className="text-rose-400 font-bold">{dateRange.earliest}</span>
          <span className="text-slate-500">→</span>
          <span className="text-emerald-400 font-bold">{dateRange.latest}</span>
        </div>
      </div>

      {/* Segmented Controller */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {scenarioKeys.map(({ key, label, rate, icon, desc }) => {
          const isSelected = activeScenarioKey === key;
          const data = scenarios[key];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectScenario(key)}
              className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                isSelected
                  ? "bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    {icon}
                    <span>{label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {rate}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">{desc}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Optimal Date</span>
                  <span className="font-bold text-white">{data.optimal_cleaning_date}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Net EGP Saved</span>
                  <span className="font-bold text-emerald-400">
                    +{formatNum(data.egp_saved)} EGP
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scenario Details Strip */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-400">Intervention Day:</span>{" "}
            <span className="font-mono font-bold text-amber-300">
              Day {active.optimal_day_index} of 90
            </span>
          </div>
          <div>
            <span className="text-slate-400">Dust at Wash:</span>{" "}
            <span className="font-mono font-bold text-white">
              {active.soiling_loss_at_cleaning_pct}%
            </span>
          </div>
          <div>
            <span className="text-slate-400">Energy Recovered:</span>{" "}
            <span className="font-mono font-bold text-emerald-400">
              +{formatNum(active.energy_recovered_kwh)} kWh
            </span>
          </div>
          <div>
            <span className="text-slate-400">Wilson Parity Day:</span>{" "}
            <span className="font-mono font-bold text-slate-300">
              Day {active.analytical_parity_day}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Cost-Optimal Wash Confirmed</span>
        </div>
      </div>
    </div>
  );
}

