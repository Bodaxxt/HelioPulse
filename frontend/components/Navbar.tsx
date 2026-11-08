"use client";

import React, { useEffect, useState } from "react";
import { Sun, CheckCircle2, AlertCircle, ArrowUpRight, ShieldCheck } from "lucide-react";
import { checkBackendHealth } from "../lib/api";

export default function Navbar() {
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    checkBackendHealth()
      .then((res) => {
        if (res.status === "healthy") {
          setBackendStatus("online");
          setVersion(res.version);
        } else {
          setBackendStatus("offline");
        }
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-industrial-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-solar-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sun className="w-6 h-6 text-industrial-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Helio<span className="text-solar-400">Pulse</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {version}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Egyptian Industrial C&I Decision Engine
            </p>
          </div>
        </div>

        {/* Center / Egypt context */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <span className="text-base">🇪🇬</span>
          <span className="font-medium text-slate-200">Egypt C&I Grid</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-400 font-mono text-[11px]">10th Ramadan • 6th October • Sadat</span>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {backendStatus === "online" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium hidden sm:inline">Engine Online</span>
              </>
            ) : backendStatus === "checking" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-slate-400 font-medium hidden sm:inline">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-300 font-medium hidden sm:inline">API Offline (Demo Mode)</span>
              </>
            )}
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <span>Swagger API</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
}

