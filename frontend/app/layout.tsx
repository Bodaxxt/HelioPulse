import type { Metadata } from "next";
import "./globals.css";
import Providers from "../lib/providers";

export const metadata: Metadata = {
  title: "HelioPulse ☀️ | Solar Cleaning Decision Engine for Egyptian Rooftops",
  description:
    "Zero-hardware Solar Panel Cleaning Decision Engine for Egyptian industrial C&I rooftop installations (50 to 2000 kWp). Driven by pvlib physics and Kimber soiling models.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-industrial-950 text-slate-100 min-h-screen selection:bg-solar-500/30 selection:text-solar-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

