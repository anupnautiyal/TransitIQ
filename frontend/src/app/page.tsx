"use client";

import React, { useState, useEffect, useCallback } from "react";
import MapComponent from "@/components/Map/MapComponent";
import RerouteDialog from "@/components/Intelligence/RerouteDialog";
import RerouteToast from "@/components/Intelligence/RerouteToast";
import DemoControls from "@/components/Demo/DemoControls";
import { useFleetSocket, FleetData } from "@/lib/useFleetSocket";
import { playSimulation, pauseSimulation, resetSimulation } from "@/lib/api";

export default function Home() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [risks, setRisks] = useState<any>({ active_disruptions: [] });
  const [simState, setSimState] = useState({ running: false, speed: 1, elapsed: 0 });
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [rerouteToast, setRerouteToast] = useState<any>(null);
  // Persist dismissed alert ids in sessionStorage so navigating away and back
  // (component remount) does not re-fire toasts for events already seen this tab.
  const [dismissedShipments, setDismissedShipments] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("transitiq:dismissed-reroutes") || "[]");
    } catch {
      return [];
    }
  });

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  const handleFleetUpdate = useCallback((data: FleetData) => {
    setShipments(data.shipments);
    setRisks({ active_disruptions: data.disruptions });
    setSimState(data.simulation);
    setLoading(false);

    const rerouteEvent = data.disruptions.find(
      (d: any) => d.auto_rerouted && !rerouteToast && !dismissedShipments.includes(d.id || d.shipment_id)
    );
    if (rerouteEvent) setRerouteToast(rerouteEvent);
  }, [rerouteToast, dismissedShipments]);

  const handleDismissToast = useCallback(() => {
    if (rerouteToast) {
      const id = rerouteToast.id || rerouteToast.shipment_id;
      setDismissedShipments((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        try {
          sessionStorage.setItem("transitiq:dismissed-reroutes", JSON.stringify(next));
        } catch {}
        return next;
      });
      setRerouteToast(null);
    }
  }, [rerouteToast]);

  const { connected } = useFleetSocket({
    url: "ws://localhost:8000/ws/fleet",
    onPositionUpdate: handleFleetUpdate,
  });

  useEffect(() => { setWsConnected(connected); }, [connected]);

  // HTTP fallback
  useEffect(() => {
    if (wsConnected) return;
    const fetchFallback = async () => {
      try {
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const [shpsRes, rksRes] = await Promise.all([
          fetch(`${BASE_URL}/shipments`),
          fetch(`${BASE_URL}/risks`),
        ]);
        if (shpsRes.ok) setShipments(await shpsRes.json());
        if (rksRes.ok) setRisks(await rksRes.json());
        setLoading(false);
      } catch (e) {}
    };
    fetchFallback();
    const interval = setInterval(fetchFallback, 3000);
    return () => clearInterval(interval);
  }, [wsConnected]);

  const handlePlayPause = useCallback(async () => {
    try {
      if (simState.running) {
        await pauseSimulation();
        setSimState((prev) => ({ ...prev, running: false }));
      } else {
        await playSimulation();
        setSimState((prev) => ({ ...prev, running: true }));
      }
    } catch (e) { console.error("Play/pause failed", e); }
  }, [simState.running]);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimState((prev) => ({ ...prev, speed }));
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await resetSimulation();
      setSimState({ running: false, speed: 1, elapsed: 0 });
      setRerouteToast(null);
    } catch (e) { console.error("Reset failed", e); }
  }, []);

  const handleReviewReroute = async (shipmentId: string) => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/shipments/${shipmentId}/reroute`, { method: "POST" });
      const data = await res.json();
      const shipment = shipments.find((s: any) => s.id === shipmentId);
      setSelectedShipment(shipment);
      setActiveRecommendation(data);
    } catch (e) { console.error("Failed to fetch reroute", e); }
  };

  const handleExecuteReroute = async () => {
    if (!selectedShipment) return;
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${BASE_URL}/shipments/${selectedShipment.id}/execute`, { method: "POST" });
      setShipments((prev) =>
        prev.map((s: any) => (s.id === selectedShipment.id ? { ...s, status: "rerouted" } : s))
      );
      setActiveRecommendation(null);
      setSelectedShipment(null);
    } catch (e) { console.error("Failed to execute reroute", e); }
  };

  const getProgress = (s: any) =>
    s.total_steps ? Math.round((s.current_step / s.total_steps) * 100) : 0;

  const activeDisruptions = (risks.active_disruptions || []).filter(
    (d: any) => !d.auto_rerouted && !d.resolved
  );

  const avgRisk = shipments.length
    ? (shipments.reduce((acc: number, s: any) => acc + (s.risk_score || 0), 0) / shipments.length)
    : 0;

  const onTimeRate = shipments.length
    ? Math.round((shipments.filter((s: any) => s.status !== "delayed").length / shipments.length) * 100)
    : 0;

  const stabilityIndex = shipments.length
    ? ((1 - avgRisk) * 100).toFixed(1)
    : "100.0";

  return (
    <div className="pt-16 min-h-screen">
      {/* Top status bar */}
      <div className="border-b border-white/[0.06] bg-surface-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-teal-400 animate-pulse-dot" : "bg-red-400"}`} />
              <span className="text-[10px] font-mono text-slate-500">
                {wsConnected ? "WS:CONNECTED" : "HTTP:FALLBACK"}
              </span>
            </div>
            {simState.running && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-dot" />
                <span className="text-[10px] font-mono text-accent-400">{simState.speed}x SPEED</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-600">TransitIQ v2.0</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-6 gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
              Fleet <span className="text-accent-400">Dashboard</span>
            </h1>
            <p className="text-sm text-slate-500">
              Real-time fleet monitoring, risk intelligence, and route optimization.
            </p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {/* Active Assets */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <span className="label">Active Fleet</span>
              <div className="badge-teal">
                <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse-dot" />
                Live
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{shipments.length}</p>
            <p className="text-xs text-slate-500 mt-1">tracked assets</p>
          </div>

          {/* Disruptions */}
          <div className="metric-card border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="label">Disruptions</span>
              {activeDisruptions.length > 0 && (
                <div className="badge-risk">
                  <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse-dot" />
                  Alert
                </div>
              )}
            </div>
            <p className={`text-3xl font-bold tabular-nums ${activeDisruptions.length > 0 ? "text-red-400" : "text-white"}`}>
              {activeDisruptions.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">active risks</p>
          </div>

          {/* Stability */}
          <div className="metric-card">
            <span className="label mb-3 block">Stability</span>
            <p className="text-3xl font-bold text-white tabular-nums">{stabilityIndex}%</p>
            <div className="progress-track mt-2">
              <div className="progress-fill bg-gradient-to-r from-teal-500 to-accent-500" style={{ width: `${stabilityIndex}%` }} />
            </div>
          </div>

          {/* On-Time */}
          <div className="metric-card">
            <span className="label mb-3 block">On-Time Rate</span>
            <p className="text-3xl font-bold text-teal-400 tabular-nums">{onTimeRate}%</p>
            <p className="text-xs text-slate-500 mt-1">delivery score</p>
          </div>
        </div>

        {/* Main Grid: Map + Risk Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Map */}
          <div className="lg:col-span-3 card h-[600px] relative overflow-hidden">
            {MAPBOX_TOKEN ? (
              <div className="w-full h-full relative">
                <MapComponent
                  accessToken={MAPBOX_TOKEN}
                  shipments={shipments}
                  risks={activeDisruptions}
                  routeGeoJSON={activeRecommendation?.recommended_route?.path_data}
                  selectedShipment={selectedShipment}
                />

                {/* Map overlay badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-surface-100/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.06] z-10">
                  <div className={`w-1.5 h-1.5 rounded-full ${simState.running ? "bg-teal-400 animate-pulse-dot" : "bg-slate-500"}`} />
                  <span className="text-[10px] font-mono text-slate-400">
                    {simState.running ? `SIM:RUNNING ${simState.speed}x` : "SIM:PAUSED"}
                  </span>
                </div>

                {/* Demo Controls */}
                <DemoControls
                  running={simState.running}
                  speed={simState.speed}
                  elapsed={simState.elapsed}
                  shipments={shipments}
                  onPlayPause={handlePlayPause}
                  onSpeedChange={handleSpeedChange}
                  onReset={handleReset}
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <svg className="w-10 h-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-slate-500">Map Offline</p>
                <p className="text-xs text-slate-600 mt-1">MAPBOX_ACCESS_TOKEN not configured</p>
              </div>
            )}
          </div>

          {/* Risk Intelligence Sidebar */}
          <div className="card p-4 h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-white">Risk Intelligence</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">AI event detection</p>
              </div>
              <div className="badge-accent">
                <div className="w-1 h-1 rounded-full bg-accent-400 animate-pulse-dot" />
                Live
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeDisruptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-400">All Clear</p>
                  <p className="text-xs text-slate-600 mt-1">No active disruptions detected</p>
                </div>
              ) : (
                activeDisruptions.map((risk: any) => (
                  <div
                    key={risk.id}
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      risk.severity === "Critical"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-amber-500/20 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`badge text-[9px] ${
                        risk.severity === "Critical" ? "badge-risk" : "badge-warning"
                      }`}>
                        {risk.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">{risk.description}</p>

                    {!risk.auto_rerouted && (
                      <button
                        onClick={() => handleReviewReroute(risk.shipment_id)}
                        className={`w-full py-2 text-[10px] font-semibold rounded-lg transition-all ${
                          risk.severity === "Critical"
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20"
                            : "btn-primary text-xs"
                        }`}
                      >
                        Analyze & Reroute →
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fleet Table */}
        <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Active Fleet</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Live tracking across all routes</p>
            </div>
            <span className="text-[10px] font-mono text-slate-600">{shipments.length} assets</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-200/30">
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Asset ID</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Origin</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Destination</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Progress</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Status</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s: any) => (
                  <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono font-semibold text-accent-400">{s.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-300">{s.origin?.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-300">{s.destination?.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 progress-track">
                          <div
                            className={`progress-fill ${
                              s.status === "delivered"
                                ? "bg-teal-500"
                                : s.status === "rerouted"
                                ? "bg-accent-500"
                                : "bg-accent-600"
                            }`}
                            style={{ width: `${getProgress(s)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 tabular-nums w-8">
                          {getProgress(s)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${
                        s.status === "in_transit"
                          ? "badge-accent"
                          : s.status === "delayed"
                          ? "badge-risk"
                          : s.status === "delivered"
                          ? "badge-success"
                          : "badge-teal"
                      }`}>
                        {(s.status || "unknown").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={`/shipment/${s.id}`}
                        className="btn-secondary text-[10px] inline-flex items-center gap-1.5 px-3 py-1.5"
                      >
                        Details
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-slate-600">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
                          Connecting to fleet...
                        </div>
                      ) : "No active shipments"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {activeRecommendation && selectedShipment && (
        <RerouteDialog
          shipment={selectedShipment}
          recommendation={activeRecommendation}
          onExecute={handleExecuteReroute}
          onClose={() => setActiveRecommendation(null)}
        />
      )}

      {rerouteToast && (
        <RerouteToast
          disruption={rerouteToast}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
}
