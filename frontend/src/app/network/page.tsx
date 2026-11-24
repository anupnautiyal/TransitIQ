"use client";

import React, { useState, useEffect } from "react";
import MapComponent from "@/components/Map/MapComponent";
import { fetchShipments, fetchRisks } from "@/lib/api";

export default function NetworkPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [risks, setRisks] = useState<any>({ active_disruptions: [] });
  const [loading, setLoading] = useState(true);
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  useEffect(() => {
    async function loadData() {
      const [shps, rks] = await Promise.all([fetchShipments(), fetchRisks()]);
      setShipments(shps);
      setRisks(rks);
      setLoading(false);
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full relative overflow-hidden pt-14">
      {/* Full-screen Map */}
      <div className="absolute inset-0 top-14">
        {MAPBOX_TOKEN ? (
          <MapComponent
            accessToken={MAPBOX_TOKEN}
            shipments={shipments}
            risks={risks.active_disruptions}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-50">
            <div className="flex flex-col items-center">
              <svg className="w-10 h-10 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-slate-500">Map Offline</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Panels */}
      <div className="absolute top-20 left-4 z-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="card p-4 w-72 bg-surface-100/90 backdrop-blur-xl shadow-panel">
          <div className="mb-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-dot" />
              <span className="text-[10px] font-mono text-slate-500">NETWORK VIEW</span>
            </div>
            <p className="text-sm font-semibold text-white">National Freight Map</p>
          </div>

          <div className="space-y-4">
            <div>
              <span className="label">Active Trucks</span>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                {shipments.length}
                <span className="text-xs text-slate-500 ml-2 font-normal">tracked</span>
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="label">Coverage</span>
                <span className="text-[10px] font-mono text-accent-400">92%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-accent-500 w-[92%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Legend */}
      <div className="absolute bottom-6 right-4 z-10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <div className="card p-4 w-56 bg-surface-100/90 backdrop-blur-xl shadow-panel">
          <span className="label mb-3 block">Risk Heatmap</span>
          <div className="space-y-2">
            <div className="w-full flex h-2 rounded-full overflow-hidden">
              <div className="w-1/4 bg-accent-500/60" title="Low" />
              <div className="w-1/4 bg-amber-500/60" title="Medium" />
              <div className="w-1/2 bg-red-500/70" title="High" />
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] text-slate-600">Stable</span>
              <span className="text-[9px] text-red-400">Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Ticker */}
      <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 w-[calc(100%-6rem)] max-w-4xl h-10 bg-surface-100/80 backdrop-blur-xl border border-white/[0.06] rounded-lg z-40 flex items-center overflow-hidden">
        <div className="bg-accent-600 h-full px-4 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-white whitespace-nowrap">ALERTS</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-marquee">
            <div className="flex items-center gap-12 pr-12 py-1">
              {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.severity === "High" || r.severity === "Critical" ? "bg-red-400 animate-pulse-dot" : "bg-accent-400"}`} />
                  <span className="text-[11px] text-slate-400">
                    <span className="font-mono text-slate-600">[{r.location?.lat.toFixed(1)},{r.location?.lng.toFixed(1)}]</span> {r.description}
                  </span>
                </div>
              )) : (
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
                  <span className="text-[11px] text-slate-400">All routes nominal • No active disruptions • Fleet synced</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-12 pr-12 py-1">
              {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                <div key={"dup"+idx} className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.severity === "High" || r.severity === "Critical" ? "bg-red-400 animate-pulse-dot" : "bg-accent-400"}`} />
                  <span className="text-[11px] text-slate-400">
                    <span className="font-mono text-slate-600">[{r.location?.lat.toFixed(1)},{r.location?.lng.toFixed(1)}]</span> {r.description}
                  </span>
                </div>
              )) : (
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
                  <span className="text-[11px] text-slate-400">All routes nominal • No active disruptions • Fleet synced</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
