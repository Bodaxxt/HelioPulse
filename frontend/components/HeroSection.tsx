"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Droplets, TrendingDown, ArrowDown, Zap, BarChart3, ShieldCheck } from "lucide-react";

interface HeroSectionProps {
  onLaunchClick: () => void;
}

export default function HeroSection({ onLaunchClick }: HeroSectionProps) {
  return (
    <section className="relative pt-12 pb-16 overflow-hidden">
      {/* Background ambient solar glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-solar-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Top pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6 shadow-inner"
        >
          <Sparkles className="w-3.5 h-3.5 text-solar-400" />
          <span>Sprint 2 Zero-Hardware Industrial Intelligence</span>
          <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
            Egypt C&I
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none"
        >
          Stop Cleaning By Calendar. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-solar-400 via-amber-300 to-yellow-200">
            Clean By Physics & Profit.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
        >
          HelioPulse combines <strong>pvlib solar physics</strong>, satellite telemetry, and the
          <strong> Kimber Soiling Model</strong> to pinpoint the exact economic day to wash Egyptian
          industrial rooftops (50 to 2000 kWp) — without expensive sensor hardware.
        </motion.p>

        {/* Quick Stats Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-10"
        >
          {/* Stat 1 */}
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3.5 border-slate-800 text-left hover:border-amber-500/40 transition">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono">0.3% - 0.5%</div>
              <div className="text-xs text-slate-400">Daily Egyptian Industrial Dust Loss</div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3.5 border-slate-800 text-left hover:border-solar-500/40 transition">
            <div className="w-11 h-11 rounded-xl bg-solar-500/10 border border-solar-500/20 flex items-center justify-center text-solar-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono">7 - 15 EGP/m²</div>
              <div className="text-xs text-slate-400">Avoided Unnecessary Cleaning OPEX</div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3.5 border-slate-800 text-left hover:border-cyan-500/40 transition">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono">3.0 L / m²</div>
              <div className="text-xs text-slate-400">Nile Water Conserved Per Clean</div>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onLaunchClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-industrial-950 bg-gradient-to-r from-solar-400 to-amber-300 hover:from-solar-300 hover:to-amber-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-2.5 text-base"
          >
            <span>Launch Decision Engine</span>
            <ArrowDown className="w-4 h-4 text-industrial-950" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

