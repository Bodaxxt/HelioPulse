"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudSun, Sun, Cpu, ShieldCheck, Activity } from "lucide-react";

const SIMULATION_STAGES = [
  {
    icon: CloudSun,
    title: "Ingesting Telemetry",
    desc: "Fetching Open-Meteo hourly GHI/DNI/DHI & PM10 dust telemetry or local snapshot cache...",
  },
  {
    icon: Sun,
    title: "Computing pvlib Baseline",
    desc: "Transposing POA irradiance via Hay-Davies and modeling Faiman thermal cell yield (2,160 hours)...",
  },
  {
    icon: Activity,
    title: "Simulating Kimber Soiling",
    desc: "Tracking daily dust accumulation, saturation ceiling, and rainfall clearance thresholds...",
  },
  {
    icon: ShieldCheck,
    title: "Wilson Economic Parity",
    desc: "Optimizing 90-day levelized cost rate and validating closed-form analytical parity...",
  },
];

export default function LoadingSkeleton() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev < SIMULATION_STAGES.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>HelioPulse Physics Engine Computing</span>
                <span className="w-2 h-2 rounded-full bg-solar-400 animate-ping" />
              </h3>
              <p className="text-xs text-slate-400">
                Executing 90-day forward solar yield & Kimber dust lifecycle simulation...
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-amber-300">
            Step {activeStage + 1} of 4
          </span>
        </div>

        {/* Progress Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SIMULATION_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;

            return (
              <div
                key={stage.title}
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10"
                    : isCompleted
                    ? "bg-slate-900/80 border-emerald-500/40 text-slate-300"
                    : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isCurrent
                        ? "bg-amber-400 text-industrial-950 font-bold"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono">
                    {isCompleted ? "DONE" : isCurrent ? "ACTIVE" : "QUEUED"}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">{stage.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-snug">{stage.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Mock Skeleton Dashboard Preview */}
        <div className="pt-2 space-y-4">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Simulating Dashboard Cards &amp; Recharts Spectrum...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-slate-900/70 border border-slate-800 p-4 animate-pulse flex flex-col justify-between"
              >
                <div className="h-3 w-24 bg-slate-800 rounded" />
                <div className="h-6 w-36 bg-slate-800/80 rounded" />
                <div className="h-2.5 w-20 bg-slate-800/50 rounded" />
              </div>
            ))}
          </div>

          <div className="h-44 rounded-2xl bg-slate-900/70 border border-slate-800 p-4 animate-pulse flex flex-col justify-end gap-3">
            <div className="flex items-end gap-2 h-32">
              {[40, 55, 70, 85, 95, 30, 45, 60, 75, 90, 100, 35, 50].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-800 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="h-3 w-48 bg-slate-800/60 rounded" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

