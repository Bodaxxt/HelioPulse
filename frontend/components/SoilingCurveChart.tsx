"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { DailyMetric } from "../lib/types";

interface SoilingCurveChartProps {
  dailyMetrics: DailyMetric[];
  optimalDayIndex: number;
  optimalDate: string;
  soilingRatePct: number;
  initialSoilingDays: number;
}

export default function SoilingCurveChart({
  dailyMetrics,
  optimalDayIndex,
  optimalDate,
  soilingRatePct,
  initialSoilingDays,
}: SoilingCurveChartProps) {
  // Pre-process data to create comparative "Unmanaged Status Quo" vs "Optimized Cleaning" curve
  let unmanagedAccum = Math.min(30.0, initialSoilingDays * soilingRatePct);

  const chartData = dailyMetrics.map((m) => {
    // Unmanaged accumulates without manual intervention up to 30%
    if (m.precipitation_mm > 5.0) {
      unmanagedAccum = 0.0;
    } else {
      unmanagedAccum = Math.min(30.0, unmanagedAccum + soilingRatePct);
    }

    return {
      day: `D${m.day_index}`,
      dayNum: m.day_index,
      date: m.date,
      optimizedLoss: parseFloat(m.soiling_loss_pct.toFixed(2)),
      unmanagedLoss: parseFloat(unmanagedAccum.toFixed(2)),
      cleanYieldKwh: m.clean_kwh,
      actualYieldKwh: m.actual_kwh,
      rainMm: m.precipitation_mm,
      isRain: m.is_rain_cleaned,
    };
  });

  const optimalPoint = chartData[optimalDayIndex - 1] || chartData[0];

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Kimber Soiling Trajectory vs Unmanaged Degradation</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              90-Day Simulation
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Compares unmanaged dust accumulation with the cost-optimal wash intervention on Day {optimalDayIndex}.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-0.5 bg-rose-400" />
            <span>Unmanaged</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Optimized Wash</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px] sm:h-[360px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="optimizedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="day"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={14}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[0, 32]}
              unit="%"
              tickLine={false}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="glass-panel p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 font-sans">
                      <div className="font-bold text-white flex justify-between gap-4 border-b border-slate-800 pb-1">
                        <span>Day {data.dayNum} ({data.date})</span>
                        {data.dayNum === optimalDayIndex && (
                          <span className="text-amber-400 font-bold">⭐ OPTIMAL WASH</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4 text-amber-300">
                        <span>Optimized Soiling:</span>
                        <span className="font-mono font-bold">{data.optimizedLoss}%</span>
                      </div>
                      <div className="flex justify-between gap-4 text-rose-400">
                        <span>Unmanaged Soiling:</span>
                        <span className="font-mono">{data.unmanagedLoss}%</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800">
                        <span>Clean Yield:</span>
                        <span className="font-mono text-slate-200">{Math.round(data.cleanYieldKwh)} kWh</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-300">
                        <span>Actual Yield:</span>
                        <span className="font-mono text-amber-300">{Math.round(data.actualYieldKwh)} kWh</span>
                      </div>
                      {data.rainMm > 0 && (
                        <div className="text-cyan-400 text-[11px] pt-1">
                          🌧️ Rain: {data.rainMm} mm {data.isRain ? "(Natural Clean!)" : ""}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Reference Line at Kimber 30% Ceiling */}
            <ReferenceLine
              y={30}
              stroke="#e11d48"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: "30% Saturation Ceiling",
                position: "insideTopRight",
                fill: "#fda4af",
                fontSize: 10,
              }}
            />

            {/* Optimal Intervention Reference Line */}
            <ReferenceLine
              x={optimalPoint.day}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `Wash Day ${optimalDayIndex}`,
                position: "insideTopLeft",
                fill: "#fbbf24",
                fontSize: 11,
                fontWeight: 700,
              }}
            />

            {/* Unmanaged Status Quo Curve */}
            <Line
              type="monotone"
              dataKey="unmanagedLoss"
              name="Unmanaged Soiling Loss"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />

            {/* HelioPulse Optimized Cleaning Trajectory */}
            <Area
              type="monotone"
              dataKey="optimizedLoss"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="url(#optimizedGradient)"
              name="HelioPulse Optimized Loss"
              dot={false}
            />

            {/* Optimal Day Dot Marker */}
            <ReferenceDot
              x={optimalPoint.day}
              y={optimalPoint.optimizedLoss}
              r={6}
              fill="#fbbf24"
              stroke="#0f172a"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Rain events &gt; 5.0 mm reset dust to 0% automatically without OPEX</span>
        </div>
        <div className="font-mono text-slate-500 text-[11px]">
          Transposition: Hay-Davies • Thermal: Faiman
        </div>
      </div>
    </div>
  );
}

