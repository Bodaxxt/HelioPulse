"use client";

import React, { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import SiteConfigForm from "../components/SiteConfigForm";
import DecisionDashboard from "../components/DecisionDashboard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { SiteInput, OptimizationResponse } from "../lib/types";
import { optimizeCleaningSchedule, parseApiError, ApiErrorDetails } from "../lib/api";
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Sparkles, Sun, X } from "lucide-react";

export default function Home() {
  const [response, setResponse] = useState<OptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorDetails | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [lastSubmittedSite, setLastSubmittedSite] = useState<SiteInput | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const handleLaunchClick = () => {
    const el = document.getElementById("config-wizard");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleFormSubmit = async (site: SiteInput) => {
    setIsLoading(true);
    setApiError(null);
    setSuccessToast(null);
    setLastSubmittedSite(site);

    // Scroll smoothly to loading skeleton
    setTimeout(() => {
      loaderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    try {
      // 1. Send SiteInput payload to FastAPI backend POST /api/v1/optimize-cleaning
      const data = await optimizeCleaningSchedule(site);
      setResponse(data);
      setSuccessToast(
        `Physics engine computed 90-day trajectory successfully (${data.weather_snapshot_status}).`
      );

      // Smooth scroll to decision dashboard
      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: unknown) {
      console.error("API error during optimization:", err);
      const parsed = parseApiError(err);
      setApiError(parsed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastSubmittedSite) {
      handleFormSubmit(lastSubmittedSite);
    }
  };

  const handleRunOfflineDemo = () => {
    if (!lastSubmittedSite) return;
    const fallbackResponse = generateDemoFallbackResponse(lastSubmittedSite);
    setResponse(fallbackResponse);
    setApiError(null);
    setSuccessToast("Rendered offline physical simulation benchmark.");
    setTimeout(() => {
      dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const handleReset = () => {
    setResponse(null);
    setApiError(null);
    setSuccessToast(null);
    handleLaunchClick();
  };

  return (
    <main className="min-h-screen bg-industrial-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/20">
      <div>
        <Navbar />

        <HeroSection onLaunchClick={handleLaunchClick} />

        {/* Global Toast / Notification Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 mb-4">
          {/* Success Banner */}
          {successToast && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{successToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-emerald-400 hover:text-white transition p-1"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner with Graceful Fallback / Retry Actions */}
          {apiError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs shadow-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-rose-300">{apiError.title}</h4>
                    <p className="text-slate-300 mt-1 leading-relaxed">{apiError.message}</p>

                    {/* Field specific validation errors from Pydantic */}
                    {apiError.fieldErrors && apiError.fieldErrors.length > 0 && (
                      <ul className="mt-2.5 space-y-1 list-disc list-inside text-rose-300/90 font-mono text-[11px] bg-rose-950/40 p-3 rounded-xl border border-rose-900/50">
                        {apiError.fieldErrors.map((f, idx) => (
                          <li key={idx}>
                            <span className="font-bold text-rose-200">{f.field}:</span> {f.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="text-rose-400 hover:text-white transition p-1 shrink-0"
                  aria-label="Close error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons for Error Recovery */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-semibold flex items-center gap-1.5 transition text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Request</span>
                </button>

                {apiError.isNetworkError && (
                  <button
                    type="button"
                    onClick={handleRunOfflineDemo}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold flex items-center gap-1.5 transition text-xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Run in Offline Simulation Mode</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Site Configuration Form Wizard */}
        <SiteConfigForm onSubmit={handleFormSubmit} isLoading={isLoading} />

        {/* Loading State / Computation Skeleton */}
        {isLoading && (
          <div ref={loaderRef}>
            <LoadingSkeleton />
          </div>
        )}

        {/* Analytical Decision Dashboard */}
        {response && !isLoading && (
          <div ref={dashboardRef} className="pt-6">
            <DecisionDashboard response={response} onReset={handleReset} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-800/80 bg-industrial-950/90 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-solar-400" />
            <span className="font-semibold text-slate-300">HelioPulse</span>
            <span>• Zero-Hardware Egyptian C&amp;I Solar Decision Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Powered by pvlib &amp; Open-Meteo</span>
            <span>•</span>
            <span className="text-amber-400 font-mono">Sprint 2 Production Integration</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** Embedded fallback simulation generator for offline demo resilience */
function generateDemoFallbackResponse(site: SiteInput): OptimizationResponse {
  const nDays = 90;
  const start = new Date(site.simulation_start_date || new Date().toISOString().split("T")[0]);
  const panelArea = site.panel_area_m2 || site.capacity_kwp * 5.0;
  const dailyCleanKwh = site.capacity_kwp * 5.6; // 5.6 specific yield in Egypt
  const dailyCleanValue = dailyCleanKwh * site.electricity_rate_egp;

  // Wilson parity: t* = sqrt(2*C / (V*s))
  const optDayBase = Math.min(
    90,
    Math.max(1, Math.round(Math.sqrt((2.0 * site.cleaning_cost_egp) / (dailyCleanValue * 0.0035))))
  );
  const optDayLow = Math.min(
    90,
    Math.max(1, Math.round(Math.sqrt((2.0 * site.cleaning_cost_egp) / (dailyCleanValue * 0.0015))))
  );
  const optDayHigh = Math.min(
    90,
    Math.max(1, Math.round(Math.sqrt((2.0 * site.cleaning_cost_egp) / (dailyCleanValue * 0.005))))
  );

  const addDays = (d: Date, days: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split("T")[0];
  };

  const waterPerClean = panelArea * 3.0;
  const waterSaved = 5 * waterPerClean; // 6 unmanaged - 1 optimal

  // Generate 90 daily metrics
  const dailyMetrics = [];
  let cumLoss = 0;
  for (let i = 1; i <= nDays; i++) {
    const dStr = addDays(start, i - 1);
    const dustPct = i < optDayBase ? i * 0.35 : (i - optDayBase) * 0.35;
    const actualKwh = dailyCleanKwh * (1.0 - Math.min(0.3, dustPct / 100.0));
    const lostKwh = dailyCleanKwh - actualKwh;
    const lostEgp = lostKwh * site.electricity_rate_egp;
    cumLoss += lostEgp;

    dailyMetrics.push({
      day_index: i,
      date: dStr,
      clean_kwh: Math.round(dailyCleanKwh),
      actual_kwh: Math.round(actualKwh),
      soiling_loss_pct: Math.min(30.0, dustPct),
      energy_lost_kwh: Math.round(lostKwh),
      energy_lost_egp: Math.round(lostEgp),
      cumulative_loss_egp: Math.round(cumLoss),
      precipitation_mm: i === 42 ? 8.2 : 0.0,
      is_rain_cleaned: i === 42,
    });
  }

  const baseSavings = Math.round(site.capacity_kwp * 28.5);

  return {
    model_version: "1.0.0-uncalibrated",
    site_summary: {
      site_id: site.site_id,
      site_name: site.site_name,
      latitude: site.latitude,
      longitude: site.longitude,
      capacity_kwp: site.capacity_kwp,
      panel_area_m2: panelArea,
      tilt: site.tilt,
      azimuth: site.azimuth,
      last_cleaned_date: site.last_cleaned_date,
      days_since_last_clean: 18,
      electricity_rate_egp: site.electricity_rate_egp,
      cleaning_cost_egp: site.cleaning_cost_egp,
    },
    optimal_cleaning_date: addDays(start, optDayBase - 1),
    optimal_day_index: optDayBase,
    is_cleaning_recommended: true,
    egp_saved: baseSavings,
    water_saved_liters: waterSaved,
    water_per_clean_liters: waterPerClean,
    optimal_date_range: {
      earliest: addDays(start, optDayHigh - 1),
      latest: addDays(start, optDayLow - 1),
      recommended: addDays(start, optDayBase - 1),
    },
    uncertainty_scenarios: {
      low_dust: {
        scenario_name: "Low Dust",
        soiling_rate_pct_day: 0.15,
        optimal_day_index: optDayLow,
        optimal_cleaning_date: addDays(start, optDayLow - 1),
        egp_saved: Math.round(baseSavings * 0.65),
        energy_recovered_kwh: Math.round((baseSavings * 0.65) / site.electricity_rate_egp),
        soiling_loss_at_cleaning_pct: parseFloat((optDayLow * 0.15).toFixed(2)),
        analytical_parity_day: optDayLow,
        is_cleaning_recommended: true,
      },
      base_dust: {
        scenario_name: "Base Dust",
        soiling_rate_pct_day: 0.35,
        optimal_day_index: optDayBase,
        optimal_cleaning_date: addDays(start, optDayBase - 1),
        egp_saved: baseSavings,
        energy_recovered_kwh: Math.round(baseSavings / site.electricity_rate_egp),
        soiling_loss_at_cleaning_pct: parseFloat((optDayBase * 0.35).toFixed(2)),
        analytical_parity_day: optDayBase,
        is_cleaning_recommended: true,
      },
      high_dust: {
        scenario_name: "High Dust",
        soiling_rate_pct_day: 0.5,
        optimal_day_index: optDayHigh,
        optimal_cleaning_date: addDays(start, optDayHigh - 1),
        egp_saved: Math.round(baseSavings * 1.35),
        energy_recovered_kwh: Math.round((baseSavings * 1.35) / site.electricity_rate_egp),
        soiling_loss_at_cleaning_pct: parseFloat((optDayHigh * 0.5).toFixed(2)),
        analytical_parity_day: optDayHigh,
        is_cleaning_recommended: true,
      },
    },
    weather_snapshot_status: "offline_demo_fallback",
    daily_metrics: dailyMetrics,
  };
}
