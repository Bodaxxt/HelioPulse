"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, MapPin, Satellite, CheckCircle2, AlertCircle } from "lucide-react";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lon: number) => void;
  siteName?: string;
}

export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  siteName,
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapType, setMapType] = useState<"dark" | "satellite">("dark");

  const isInsideEgypt =
    latitude >= 22.0 && latitude <= 31.5 && longitude >= 25.0 && longitude <= 37.0;

  // Custom Solar Marker Icon using divIcon (avoids broken default png assets in Next.js)
  const createSolarIcon = () => {
    return L.divIcon({
      className: "custom-solar-pin",
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(245, 158, 11, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #f59e0b; border: 2.5px solid #ffffff; box-shadow: 0 0 14px rgba(245, 158, 11, 0.9); display: flex; align-items: center; justify-content: center; color: #0f172a;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  // Base tile layers
  const darkLayerUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const satelliteLayerUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = latitude || 30.0444;
    const initialLon = longitude || 31.2357;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 8,
      zoomControl: true,
      minZoom: 5,
      maxZoom: 18,
    });

    // Egypt bounds constraint (loose around Egypt)
    const southWest = L.latLng(21.5, 24.0);
    const northEast = L.latLng(32.5, 37.5);
    const bounds = L.latLngBounds(southWest, northEast);
    map.setMaxBounds(bounds);

    // Initial Tile Layer
    const tileLayer = L.tileLayer(darkLayerUrl, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add Marker
    const marker = L.marker([initialLat, initialLon], {
      icon: createSolarIcon(),
      draggable: true,
    }).addTo(map);

    if (siteName) {
      marker.bindPopup(`<b style="color: #0f172a;">${siteName}</b><br/>${initialLat.toFixed(4)}°N, ${initialLon.toFixed(4)}°E`);
    }

    // Click handler to select coordinates
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const roundedLat = parseFloat(lat.toFixed(4));
      const roundedLon = parseFloat(lng.toFixed(4));

      marker.setLatLng([roundedLat, roundedLon]);
      onLocationChange(roundedLat, roundedLon);
    });

    // Drag marker handler
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const roundedLat = parseFloat(pos.lat.toFixed(4));
      const roundedLon = parseFloat(pos.lng.toFixed(4));
      onLocationChange(roundedLat, roundedLon);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker & pan map when latitude / longitude changes externally (e.g. from preset selection)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    const currentPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentPos.lat - latitude) > 0.0001 ||
      Math.abs(currentPos.lng - longitude) > 0.0001
    ) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude]);

  // Handle Map Type Toggle (Dark Mode vs Satellite)
  const toggleMapType = (type: "dark" | "satellite") => {
    if (!mapInstanceRef.current || mapType === type) return;

    // Remove existing tile layers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add new selected layer
    const url = type === "dark" ? darkLayerUrl : satelliteLayerUrl;
    const attribution =
      type === "dark"
        ? '&copy; <a href="https://carto.com/">CARTO</a>'
        : "&copy; Esri &mdash; Earthstar Geographics";

    L.tileLayer(url, { attribution, maxZoom: 18 }).addTo(mapInstanceRef.current);
    setMapType(type);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/80 shadow-xl flex flex-col">
      {/* Map Control Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-solar-400" />
          <span className="font-semibold text-slate-200">
            Interactive Rooftop Location Picker
          </span>
          <span className="hidden sm:inline text-slate-500">• Click or drag pin anywhere in Egypt</span>
        </div>

        {/* View Switcher: Dark vs Satellite */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => toggleMapType("dark")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              mapType === "dark"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => toggleMapType("satellite")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              mapType === "satellite"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Satellite className="w-3 h-3" />
            <span>Satellite</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-64 sm:h-72 relative z-0 cursor-crosshair"
      />

      {/* Coordinates Status Bar */}
      <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800/90 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-3">
          <div className="font-mono text-slate-300 flex items-center gap-2">
            <span className="text-solar-400 font-bold">LAT:</span>
            <span>{latitude.toFixed(4)}°N</span>
            <span className="text-slate-600">|</span>
            <span className="text-solar-400 font-bold">LON:</span>
            <span>{longitude.toFixed(4)}°E</span>
          </div>
        </div>

        <div>
          {isInsideEgypt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Valid Egyptian Location
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              <AlertCircle className="w-3 h-3" /> Outside Egypt Boundaries
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

