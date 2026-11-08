"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  MessageSquare,
  Mail,
  FileDown,
  Share2,
  Table,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { OptimizationResponse, ScenarioResult, WhatsAppDispatchResponse } from "../lib/types";
import { formatNum } from "../lib/format";
import { dispatchWhatsAppDirective } from "../lib/api";

interface ReportCardProps {
  response: OptimizationResponse;
  activeScenario: ScenarioResult;
}

export default function ReportCard({ response, activeScenario }: ReportCardProps) {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<"en" | "ar">("ar");
  const [isExporting, setIsExporting] = useState(false);

  // Automated WhatsApp Dispatch state
  const [recipientPhone, setRecipientPhone] = useState("01012345678");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<WhatsAppDispatchResponse | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const { site_summary } = response;

  const englishMessage = `☀️ *HelioPulse Solar Cleaning Directive* 🇪🇬
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏭 *Facility:* ${site_summary.site_name || "Industrial Facility"}
⚡ *Plant Capacity:* ${formatNum(site_summary.capacity_kwp)} kWp (${formatNum(site_summary.panel_area_m2)} m²)
📍 *Location:* Egypt (${site_summary.latitude.toFixed(2)}°N, ${site_summary.longitude.toFixed(2)}°E)

📅 *RECOMMENDED CLEANING DATE:* ${activeScenario.optimal_cleaning_date}
⏳ *Timing:* Day ${activeScenario.optimal_day_index} of 90-day cycle
📉 *Dust Loss at Wash:* ${activeScenario.soiling_loss_at_cleaning_pct}%
💰 *Estimated Net Savings:* +${formatNum(activeScenario.egp_saved)} EGP
⚡ *Energy Recovered:* +${formatNum(activeScenario.energy_recovered_kwh)} kWh
💧 *Water Conserved:* ${formatNum(response.water_saved_liters)} Liters (Nile resource conservation)

🛡️ *Confidence Range:* ${response.optimal_date_range.earliest} to ${response.optimal_date_range.latest}
⚙️ *Physics Engine:* pvlib (Hay-Davies / Faiman) + Kimber Model (v1.0.0)`;

  const arabicMessage = `☀️ *توجيه تنظيف الخلايا الشمسية - HelioPulse* 🇪🇬
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏭 *المنشأة الصناعية:* ${site_summary.site_name || "المصنع"}
⚡ *القدرة المركبة:* ${formatNum(site_summary.capacity_kwp)} ك.و.ذ (${formatNum(site_summary.panel_area_m2)} م²)
📍 *الموقع:* مصر (${site_summary.latitude.toFixed(2)}°شمالاً، ${site_summary.longitude.toFixed(2)}°شرقاً)

📅 *تاريخ الغسيل الأمثل اقتصادياً:* ${activeScenario.optimal_cleaning_date}
⏳ *توقيت التدخل:* اليوم ${activeScenario.optimal_day_index} من دورة المحاكاة (90 يوماً)
📉 *نسبة الإشعاع المفقود بسبب الأتربة:* ${activeScenario.soiling_loss_at_cleaning_pct}%
💰 *صافي الوفر المالي المقدر:* +${formatNum(activeScenario.egp_saved)} جنيه مصري
⚡ *الطاقة الكهربائية المستردة:* +${formatNum(activeScenario.energy_recovered_kwh)} ك.و.س
💧 *كمية المياه النظيفة الموفرة:* ${formatNum(response.water_saved_liters)} لتر

🛡️ *نافذة الأمان الموصى بها:* من ${response.optimal_date_range.earliest} إلى ${response.optimal_date_range.latest}
⚙️ *المحرك الفيزيائي:* pvlib + نموذج كيمبر للترسيب الصناعي`;

  const currentMessage = lang === "en" ? englishMessage : arabicMessage;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAutomatedDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || isDispatching) return;

    setIsDispatching(true);
    setDispatchError(null);
    setDispatchResult(null);

    try {
      const result = await dispatchWhatsAppDirective({
        recipient_phone: recipientPhone.trim(),
        message: currentMessage,
        site_id: site_summary.site_id,
        site_name: site_summary.site_name,
      });
      setDispatchResult(result);
    } catch (err: any) {
      setDispatchError(
        err.response?.data?.detail || err.message || "Failed to dispatch automated WhatsApp message."
      );
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSimulatePDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 400);
  };

  const handleExportCSV = () => {
    if (!response.daily_metrics || response.daily_metrics.length === 0) return;

    const headers = [
      "Day Index",
      "Date",
      "Clean Yield (kWh)",
      "Actual Yield (kWh)",
      "Soiling Loss (%)",
      "Energy Lost (kWh)",
      "Daily Value Lost (EGP)",
      "Cumulative Loss (EGP)",
      "Precipitation (mm)",
      "Rain Cleaned Event",
    ];

    const rows = response.daily_metrics.map((m) => [
      m.day_index,
      m.date,
      m.clean_kwh,
      m.actual_kwh,
      m.soiling_loss_pct,
      m.energy_lost_kwh,
      m.energy_lost_egp,
      m.cumulative_loss_egp,
      m.precipitation_mm,
      m.is_rain_cleaned ? "YES" : "NO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `HelioPulse_${site_summary.site_id || "site"}_90Day_Simulation.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-solar-400" />
            <span>Executive Action &amp; Dispatch Center</span>
          </h3>
          <p className="text-xs text-slate-400">
            Plain-language recommendation ready to dispatch via Automated WhatsApp to factory O&amp;M managers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switcher */}
          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                lang === "ar" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                lang === "en" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            title="Download full 90-day hourly telemetry tabular data in CSV format"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleSimulatePDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <FileDown className="w-3.5 h-3.5 text-solar-400" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* Message Preview Box */}
      <div className="mt-4 relative">
        <pre
          className={`p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all overflow-x-auto ${
            lang === "ar" ? "text-right font-sans" : ""
          }`}
        >
          {currentMessage}
        </pre>

        {/* Copy Button Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
              copied
                ? "bg-emerald-500 text-industrial-950 font-bold"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🚀 Automated WhatsApp Dispatch Control Bar */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-amber-500/20">
        <form onSubmit={handleAutomatedDispatch} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 shrink-0">
              <span className="text-base leading-none">🇪🇬</span>
              <Smartphone className="w-3.5 h-3.5 text-solar-400" />
            </div>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="e.g. 01012345678 or +2010..."
              className="w-full px-3.5 py-2 rounded-lg glass-input text-xs font-mono text-white placeholder-slate-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isDispatching}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-industrial-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 shrink-0 disabled:opacity-50"
          >
            {isDispatching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Automated WhatsApp (إرسال تلقائي)</span>
              </>
            )}
          </button>
        </form>

        {/* Live Delivery Confirmation Card */}
        {dispatchResult && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">
                  {dispatchResult.status === "delivered" ? "Live WhatsApp Message Transmitted!" : "Simulated WhatsApp Dispatched!"}
                </span>
                <span className="text-slate-400 block sm:inline sm:ml-2">
                  To {dispatchResult.recipient_phone} • SID: <code className="font-mono text-emerald-300">{dispatchResult.message_id}</code>
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
              {new Date(dispatchResult.sent_at).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Error Notice */}
        {dispatchError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{dispatchError}</span>
          </div>
        )}
      </div>

      {/* Footer Dispatch Tips */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <MessageSquare className="w-3.5 h-3.5" /> Automated Twilio &amp; Mock Engine
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <Mail className="w-3.5 h-3.5" /> O&amp;M Fleet Approved
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          HelioPulse ID: {site_summary.site_id || "EGY-C&I"} • Production REST Dispatcher
        </div>
      </div>
    </div>
  );
}
