"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  SunMedium,
  Zap,
  Sliders,
  Calendar,
  Coins,
  Compass,
  Layers,
  ArrowRight,
  Info,
  Check,
  AlertTriangle,
} from "lucide-react";
import { SiteInput, EGYPTIAN_INDUSTRIAL_HUBS, EgyptianHubPreset } from "../lib/types";
import { formatNum } from "../lib/format";

const MapLocationPicker = dynamic(() => import("./MapLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs animate-pulse">
      <MapPin className="w-5 h-5 text-solar-400/50" />
      <span>Loading Interactive Solar Map of Egypt...</span>
    </div>
  ),
});

interface SiteConfigFormProps {
  onSubmit: (data: SiteInput) => void;
  isLoading: boolean;
}

export default function SiteConfigForm({ onSubmit, isLoading }: SiteConfigFormProps) {
  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultPastDate = new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [selectedHub, setSelectedHub] = useState<string>("10th of Ramadan");
  const [siteName, setSiteName] = useState("10th of Ramadan Manufacturing Plant");
  const [latitude, setLatitude] = useState<number>(30.31);
  const [longitude, setLongitude] = useState<number>(31.74);
  const [capacityKwp, setCapacityKwp] = useState<number>(500);
  const [tilt, setTilt] = useState<number>(25);
  const [azimuth, setAzimuth] = useState<number>(180);
  const [lastCleanedDate, setLastCleanedDate] = useState<string>(defaultPastDate);
  const [electricityRateEgp, setElectricityRateEgp] = useState<number>(2.5);
  const [cleaningCostEgp, setCleaningCostEgp] = useState<number>(5000);

  // Derived panel area
  const derivedAreaM2 = capacityKwp * 5.0;

  // Validation
  const isLatValid = latitude >= 22.0 && latitude <= 31.5;
  const isLonValid = longitude >= 25.0 && longitude <= 37.0;
  const isCapacityValid = capacityKwp >= 5.0 && capacityKwp <= 2000.0;
  const isDateValid = lastCleanedDate <= todayStr;
  const isFormValid = isLatValid && isLonValid && isCapacityValid && isDateValid;

  const handleHubSelect = (hub: EgyptianHubPreset) => {
    setSelectedHub(hub.name);
    setSiteName(`${hub.name} Rooftop Facility`);
    setLatitude(hub.latitude);
    setLongitude(hub.longitude);
    setCapacityKwp(hub.typicalCapacityKwp);
  };

  const handleMapLocationChange = (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
    // If customized away from preset, denote it
    setSelectedHub("Custom Pin");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    const payload: SiteInput = {
      site_id: `EGY-${selectedHub.replace(/\s+/g, "-").toUpperCase()}-01`,
      site_name: siteName,
      latitude,
      longitude,
      capacity_kwp: capacityKwp,
      tilt,
      azimuth,
      last_cleaned_date: lastCleanedDate,
      simulation_start_date: todayStr,
      electricity_rate_egp: electricityRateEgp,
      cleaning_cost_egp: cleaningCostEgp,
      panel_area_m2: derivedAreaM2,
    };

    onSubmit(payload);
  };

  return (
    <div id="config-wizard" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 lg:p-10 border border-amber-500/20 shadow-2xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-solar-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Site Configuration Wizard
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure your industrial rooftop specifications or select an Egyptian manufacturing hub preset.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-mono text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              Pydantic v2 Strict Validation
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 mt-8">
          {/* 1. Egyptian Industrial Hub Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-solar-400" />
              <span>Select Egyptian Industrial Hub Preset</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {EGYPTIAN_INDUSTRIAL_HUBS.map((hub) => {
                const isSelected = selectedHub === hub.name;
                return (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => handleHubSelect(hub)}
                    className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold leading-tight">{hub.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-solar-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 leading-snug">
                        {hub.region}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-300 font-medium mt-3 block">
                      {hub.typicalCapacityKwp} kWp typ.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.5 Interactive Map Picker */}
          <div className="pt-2">
            <MapLocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleMapLocationChange}
              siteName={siteName}
            />
          </div>

          {/* 2. Coordinates & Facility Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Facility / Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white font-medium"
                placeholder="Factory Name"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Latitude (°N) [22.0 – 31.5]
                </label>
                {!isLatValid && (
                  <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Egypt Only
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="22.0"
                max="31.5"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono ${
                  isLatValid ? "text-white" : "border-rose-500 text-rose-300"
                }`}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Longitude (°E) [25.0 – 37.0]
                </label>
                {!isLonValid && (
                  <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Egypt Only
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="25.0"
                max="37.0"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono ${
                  isLonValid ? "text-white" : "border-rose-500 text-rose-300"
                }`}
                required
              />
            </div>
          </div>

          {/* 3. Plant Capacity & Derived Panel Area */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-solar-400" />
                  <span>Installed DC Capacity (kWp)</span>
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Commercial & Industrial installations between 5.0 and 2000.0 kWp.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-lg">
                  {formatNum(capacityKwp)} <span className="text-xs font-sans text-amber-400">kWp</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-sm">
                  {formatNum(derivedAreaM2)} <span className="text-xs font-sans text-slate-400">m² area</span>
                </div>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="50"
              max="2000"
              step="25"
              value={capacityKwp}
              onChange={(e) => setCapacityKwp(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-solar-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
              <span>50 kWp (Small Rooftop)</span>
              <span>500 kWp (Typical C&I)</span>
              <span>1000 kWp</span>
              <span>2000 kWp (Mega Logistics)</span>
            </div>
          </div>

          {/* 4. Geometry: Tilt & Azimuth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-solar-400" />
                  Panel Tilt Angle: {tilt}°
                </span>
                <span className="text-[10px] text-slate-400">Egypt Optimal: 25°</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={tilt}
                onChange={(e) => setTilt(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-solar-400"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-solar-400" />
                  Azimuth Angle: {azimuth}° ({azimuth === 180 ? "Due South" : `${azimuth}°`})
                </span>
                <span className="text-[10px] text-slate-400">180° = South</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={azimuth}
                onChange={(e) => setAzimuth(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-solar-400"
              />
            </div>
          </div>

          {/* 5. Date & Financial Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-solar-400" />
                  Last Cleaned Date
                </label>
                {!isDateValid && (
                  <span className="text-[10px] text-rose-400 font-medium">Cannot be future</span>
                )}
              </div>
              <input
                type="date"
                max={todayStr}
                value={lastCleanedDate}
                onChange={(e) => setLastCleanedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Electricity Rate (EGP / kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={electricityRateEgp}
                onChange={(e) => setElectricityRateEgp(parseFloat(e.target.value) || 2.0)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-solar-400" />
                Cleaning Session Cost (EGP)
              </label>
              <input
                type="number"
                step="250"
                min="500"
                max="100000"
                value={cleaningCostEgp}
                onChange={(e) => setCleaningCostEgp(parseFloat(e.target.value) || 5000)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white font-mono"
                required
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-solar-400 shrink-0" />
              <span>Simulates 90-day forward Kimber soiling & Open-Meteo telemetry cache</span>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`px-8 py-3.5 rounded-xl font-bold flex items-center gap-2.5 text-sm transition shadow-lg ${
                isFormValid && !isLoading
                  ? "bg-gradient-to-r from-solar-400 to-amber-400 text-industrial-950 hover:from-solar-300 hover:to-amber-300 shadow-amber-500/20 hover:shadow-amber-500/35 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-industrial-950 border-t-transparent rounded-full animate-spin" />
                  <span>Computing 90-Day Solar Trajectory...</span>
                </>
              ) : (
                <>
                  <span>Optimize Cleaning Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

