"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RerouteDialog from "@/components/Intelligence/RerouteDialog";
import MapComponent from "@/components/Map/MapComponent";

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [shipment, setShipment] = useState<any>(null);
  const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  useEffect(() => {
    fetch("http://localhost:8000/shipments")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((s: any) => s.id === params.id);
        setShipment(found);
        if (found) {
          fetch(`http://localhost:8000/shipments/${found.id}/route`)
            .then((r) => r.json())
            .then((rData) => { if (rData.path_data) setRouteData(rData.path_data); })
            .catch((e) => console.error("Error fetching route", e));
        }
      })
      .catch((err) => console.error("Error fetching shipment", err));
  }, [params.id]);

  const handleReviewReroute = async () => {
    if (!shipment) return;
    setIsCalculating(true);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/shipments/${shipment.id}/reroute`, { method: "POST" });
      const data = await res.json();
      setActiveRecommendation(data);
    } catch (e) { console.error("Failed to fetch reroute", e); }
    finally { setIsCalculating(false); }
  };

  const handleExecuteReroute = async () => {
    if (!shipment) return;
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${BASE_URL}/shipments/${shipment.id}/execute`, { method: "POST" });
      setShipment({ ...shipment, status: "rerouted", risk_score: 0.1 });
      if (activeRecommendation?.recommended_route?.path_data) {
        const newRouteData = activeRecommendation.recommended_route.path_data;
        newRouteData.properties = { isOptimized: true };
        setRouteData({ ...newRouteData });
      }
      setActiveRecommendation(null);
    } catch (e) { console.error("Failed to execute reroute", e); }
  };

  if (!shipment) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Loading telemetry...</p>
      </div>
    </div>
  );

  const isDelayed = shipment.status === "delayed";
  const progress = shipment.total_steps ? Math.round((shipment.current_step / shipment.total_steps) * 100) : 0;

  return (
    <div className="min-h-screen pt-16">
      {/* Top bar */}
      <div className="border-b border-white/[0.06] bg-surface-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="w-px h-4 bg-white/[0.06]" />
            <h1 className="text-sm font-mono font-semibold text-accent-400">{shipment.id}</h1>
          </div>
          <div className={`badge ${isDelayed ? "badge-risk" : "badge-teal"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isDelayed ? "bg-red-400 animate-pulse-dot" : "bg-teal-400"}`} />
            {shipment.status.replace("_", " ")}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Map */}
          <div className="lg:col-span-2 card h-[500px] relative overflow-hidden">
            {MAPBOX_TOKEN ? (
              <div className="w-full h-full relative">
                <MapComponent
                  accessToken={MAPBOX_TOKEN}
                  shipments={[shipment]}
                  routeGeoJSON={routeData}
                />
                {/* Overlay */}
                <div className="absolute top-3 left-3 z-10 space-y-2">
                  <div className="bg-surface-100/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-dot" />
                    <span className="text-[9px] font-mono text-slate-400">GPS TRACKING</span>
                  </div>
                  <div className="bg-surface-100/90 backdrop-blur-md px-3 py-2.5 rounded-lg border border-white/[0.06] space-y-2 w-44">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-slate-500">FROM</span>
                      <span className="text-[10px] font-semibold text-white">{shipment.origin.name}</span>
                    </div>
                    <div className="w-full h-px bg-white/[0.06]" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-slate-500">TO</span>
                      <span className="text-[10px] font-semibold text-white">{shipment.destination.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-slate-600">Map Offline</p>
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.06]">
              <span className="label">Risk Analysis</span>
              <span className="text-[9px] font-mono text-accent-400">ML v4.1</span>
            </div>

            {isDelayed ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <p className="text-4xl font-bold text-red-400 tabular-nums">+3.2h</p>
                    <p className="text-xs text-slate-500 mt-1">Projected Delay</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-red-400 tabular-nums">{(shipment.risk_score * 100).toFixed(0)}%</p>
                    <p className="text-xs text-slate-500 mt-1">Risk Score</p>
                  </div>
                  <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/15">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Anomaly Detected</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Heavy traffic and adverse weather conditions detected on route. AI recommends immediate rerouting.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReviewReroute}
                  disabled={isCalculating}
                  className={`w-full py-3 mt-6 text-xs font-semibold rounded-lg transition-all ${
                    isCalculating
                      ? "bg-surface-300 text-slate-500"
                      : "btn-primary"
                  }`}
                >
                  {isCalculating ? "Computing..." : "Analyze & Reroute"}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-surface-200 flex items-center justify-center mb-4">
                  <div className="w-4 h-4 bg-teal-500 rounded-full animate-pulse-dot" />
                </div>
                <p className="text-sm font-semibold text-slate-300 mb-1">Route Nominal</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No disruptions. Risk within safe parameters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Route Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="metric-card">
            <span className="label mb-2 block">Origin</span>
            <p className="text-sm font-semibold text-white">{shipment.origin.name}</p>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">Destination</span>
            <p className="text-sm font-semibold text-white">{shipment.destination.name}</p>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">Progress</span>
            <p className="text-sm font-semibold text-white tabular-nums">{progress}%</p>
            <div className="progress-track mt-2">
              <div className="progress-fill bg-accent-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">Cargo</span>
            <p className="text-sm font-semibold text-white">{shipment.cargo_type}</p>
            <p className="text-[10px] text-slate-500 mt-1">{shipment.priority} priority</p>
          </div>
        </div>

        {/* Event Stream */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <span className="label">Event Log</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
              <span className="text-[9px] font-mono text-slate-500">LIVE</span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex justify-between items-center bg-surface-200/30 border border-white/[0.04] p-4 rounded-xl group hover:border-accent-500/15 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center text-teal-400 group-hover:text-accent-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-300">Checkpoint Passed</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">System Update</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-600 tabular-nums">10:42:15</span>
            </div>
            <div className="flex justify-between items-center bg-surface-200/30 border border-white/[0.04] p-4 rounded-xl group hover:border-accent-500/15 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center text-teal-400 group-hover:text-accent-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-300">GPS Position Updated</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Telemetry</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-600 tabular-nums">08:15:00</span>
            </div>
          </div>
        </div>
      </div>

      {activeRecommendation && (
        <RerouteDialog
          shipment={shipment}
          recommendation={activeRecommendation}
          onExecute={handleExecuteReroute}
          onClose={() => setActiveRecommendation(null)}
        />
      )}
    </div>
  );
}
