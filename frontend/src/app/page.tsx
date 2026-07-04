"use client";

import React, { useState, useEffect, useCallback } from "react";
import MapComponent from "@/components/Map/MapComponent";
import RerouteDialog from "@/components/Intelligence/RerouteDialog";
import RerouteToast from "@/components/Intelligence/RerouteToast";
import DemoControls from "@/components/Demo/DemoControls";
import { useFleetSocket, FleetData } from "@/lib/useFleetSocket";
import { playSimulation, pauseSimulation, resetSimulation } from "@/lib/api";

export default function Home() {
  // ── Fleet state (from WebSocket) ──
  const [shipments, setShipments] = useState<any[]>([]);
  const [risks, setRisks] = useState<any>({ active_disruptions: [] });
  const [simState, setSimState] = useState({ running: false, speed: 1, elapsed: 0 });
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // ── UI state ──
  const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [rerouteToast, setRerouteToast] = useState<any>(null);
  const [dismissedShipments, setDismissedShipments] = useState<string[]>([]);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  // ── WebSocket connection ──
  const handleFleetUpdate = useCallback((data: FleetData) => {
    setShipments(data.shipments);
    setRisks({ active_disruptions: data.disruptions });
    setSimState(data.simulation);
    setLoading(false);

    // Check for auto-reroute events that haven't been dismissed yet for this truck
    const rerouteEvent = data.disruptions.find(
      (d: any) => d.auto_rerouted && !rerouteToast && !dismissedShipments.includes(d.shipment_id)
    );
    if (rerouteEvent) {
      setRerouteToast(rerouteEvent);
    }
  }, [rerouteToast, dismissedShipments]);

  const handleDismissToast = useCallback(() => {
    if (rerouteToast) {
      setDismissedShipments((prev) => [...prev, rerouteToast.shipment_id]);
      setRerouteToast(null);
    }
  }, [rerouteToast]);

  const { fleetData, connected } = useFleetSocket({
    url: "ws://localhost:8000/ws/fleet",
    onPositionUpdate: handleFleetUpdate,
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected]);

  // ── Fallback HTTP polling if WebSocket disconnects ──
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

  // ── Demo Controls Handlers ──
  const handlePlayPause = useCallback(async () => {
    try {
      if (simState.running) {
        await pauseSimulation();
        setSimState((prev) => ({ ...prev, running: false }));
      } else {
        await playSimulation();
        setSimState((prev) => ({ ...prev, running: true }));
      }
    } catch (e) {
      console.error("Play/pause failed", e);
    }
  }, [simState.running]);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimState((prev) => ({ ...prev, speed }));
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await resetSimulation();
      setSimState({ running: false, speed: 1, elapsed: 0 });
      setRerouteToast(null);
      // Data will update via WebSocket
    } catch (e) {
      console.error("Reset failed", e);
    }
  }, []);

  // ── Manual Reroute Handlers ──
  const handleReviewReroute = async (shipmentId: string) => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/shipments/${shipmentId}/reroute`, { method: "POST" });
      const data = await res.json();
      const shipment = shipments.find((s: any) => s.id === shipmentId);
      setSelectedShipment(shipment);
      setActiveRecommendation(data);
    } catch (e) {
      console.error("Failed to fetch reroute", e);
    }
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
    } catch (e) {
      console.error("Failed to execute reroute", e);
    }
  };

  // ── Progress helper ──
  const getProgress = (s: any) =>
    s.total_steps ? Math.round((s.current_step / s.total_steps) * 100) : 0;

  return (
    <div className="pt-52 pb-32 min-h-screen relative w-full max-w-[1700px] mx-auto px-8 lg:px-12">
      {/* Background Orbs */}
      <div className="absolute top-40 left-10 w-[500px] h-[500px] bg-brand-200/40 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-96 right-20 w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <div
        className="flex flex-col md:flex-row items-start md:items-end justify-between mb-20 gap-8 animate-fade-in"
        style={{ animationDelay: "0.2s" }}
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight leading-tight mb-2">
            Operational <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">Overview</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Real-time visibility matrix and AI-powered disruption detection across the active fleet.
          </p>
        </div>
        <div className="glass-vibrant px-5 py-3 rounded-2xl flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Feeds</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
              <span className="text-[9px] font-bold text-slate-600 uppercase">
                {wsConnected ? "WS Live" : "Fallback"}
              </span>
            </div>
            {simState.running && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[9px] font-bold text-brand-600 uppercase">
                  {simState.speed}x
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-20 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {/* Network Throughput */}
        <div className="md:col-span-2 lg:col-span-3 bento-card border-t-4 border-t-brand-500">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-600">Network Throughput</h3>
                <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">Live</span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-7xl lg:text-8xl font-display font-black text-slate-800 tracking-tighter tabular-nums drop-shadow-sm">
                  {shipments.length}
                </p>
                <span className="text-lg font-bold text-slate-400">active assets</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Tracked and intelligently routed shipments across all regions.
              </p>
            </div>
          </div>
        </div>

        {/* Disruption Alerts */}
        <div className="md:col-span-2 lg:col-span-3 bento-card bg-gradient-to-br from-red-50/50 to-white border-t-4 border-t-red-500 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">Disruption Alerts</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-[9px] font-extrabold text-red-700 uppercase tracking-widest">
              Action Req
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-7xl lg:text-8xl font-display font-black text-red-600 tracking-tighter tabular-nums drop-shadow-sm">
              {risks.active_disruptions.filter((d: any) => !d.auto_rerouted && !d.resolved).length}
            </p>
            <span className="text-lg font-bold text-red-400">severe risks</span>
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</p>
              <p className="text-xs font-black text-red-600 uppercase tracking-wider">
                {risks.active_disruptions.filter((d: any) => !d.auto_rerouted && !d.resolved).length > 2 ? "Critical" : "Elevated"}
              </p>
            </div>
            <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden border border-red-200">
              <div className="h-full bg-gradient-to-r from-red-400 to-red-600 w-3/4 rounded-full" />
            </div>
          </div>
        </div>

        {/* Stability Index */}
        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Stability Index</h3>
          <p className="text-4xl font-display font-black text-slate-800 tabular-nums">98.2%</p>
        </div>

        {/* Avg Risk Index */}
        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Avg Risk Index</h3>
          <p className="text-4xl font-display font-black text-slate-800 tabular-nums">
            {(shipments.reduce((acc: number, s: any) => acc + (s.risk_score || 0), 0) / (shipments.length || 1)).toFixed(2)}
          </p>
        </div>

        {/* On-Time Rate */}
        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">On-Time Rate</h3>
          <p className="text-4xl font-display font-black text-brand-600 tabular-nums drop-shadow-sm">
            {shipments.length
              ? Math.round(
                  (shipments.filter((s: any) => s.status !== "delayed").length / shipments.length) * 100
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Main Command & Control */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Map */}
        <div className="lg:col-span-3 bg-white/40 border border-white/60 rounded-[2rem] h-[700px] relative overflow-hidden group p-1 shadow-glass">
          {MAPBOX_TOKEN ? (
            <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative shadow-inner">
              <MapComponent
                accessToken={MAPBOX_TOKEN}
                shipments={shipments}
                risks={risks.active_disruptions}
                routeGeoJSON={activeRecommendation?.route_geometry}
                selectedShipment={selectedShipment}
              />

              {/* Map overlay */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/40 z-10 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  {simState.running ? `Simulation Running (${simState.speed}x)` : "Simulation Paused"}
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm rounded-[1.8rem]">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-display text-lg font-bold text-slate-800">Map Interface Offline</p>
              <p className="text-xs font-semibold text-slate-400 mt-2">
                NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing
              </p>
            </div>
          )}
        </div>

        {/* Risk Sidebar */}
        <div className="glass-panel p-6 h-[700px] flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display font-bold text-slate-900 text-lg">Risk Intelligence</h2>
              <p className="text-[10px] font-medium text-slate-400 mt-1">AI Event Detection Stream</p>
            </div>
            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 rounded-lg">
              Live
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {risks.active_disruptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">All Systems Nominal</p>
                <p className="text-xs text-slate-400 mt-1">No active disruptions.</p>
              </div>
            ) : (
              risks.active_disruptions.map((risk: any) => (
                <div
                  key={risk.id}
                  className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                    risk.severity === "Critical"
                      ? "border-red-100 bg-gradient-to-b from-white to-red-50/30"
                      : "border-orange-100 bg-gradient-to-b from-white to-orange-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        risk.severity === "Critical"
                          ? "bg-red-50 text-red-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {risk.type} Alert
                    </span>
                    {risk.auto_rerouted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 ml-1">
                        Auto-Rerouted
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-4 leading-relaxed">
                    {risk.description}
                  </p>

                  {!risk.auto_rerouted && (
                    <button
                      onClick={() => handleReviewReroute(risk.shipment_id)}
                      className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 text-[10px] font-bold rounded-xl uppercase tracking-widest transition-all ${
                        risk.severity === "Critical"
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                      }`}
                    >
                      <span>Analyze Impact</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fleet Deployments Table */}
      <div className="mt-20 glass-panel p-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 pb-6 border-b border-slate-100 gap-4">
          <div>
            <h2 className="font-display font-bold text-slate-900 text-xl">Active Fleet Deployments</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Comprehensive view of all transit assets with live progress.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100 pl-4 w-52">Asset ID</th>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Origin</th>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Destination</th>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Progress</th>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Status</th>
                <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s: any) => (
                <tr key={s.id} className="group hover:bg-brand-50/50 transition-colors border-b border-slate-50 last:border-0">
                  <td className="py-6 pl-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-slate-200 rounded-full group-hover:bg-brand-400 transition-colors" />
                      <span className="text-xs font-black text-slate-800">{s.id}</span>
                    </span>
                  </td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{s.origin?.name}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{s.destination?.name}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            s.status === "delivered"
                              ? "bg-emerald-500"
                              : s.status === "rerouted"
                              ? "bg-brand-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${getProgress(s)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums w-8">
                        {getProgress(s)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                        s.status === "in_transit"
                          ? "bg-brand-50/50 text-brand-600 border-brand-100"
                          : s.status === "delayed"
                          ? "bg-red-50 text-red-600 border-red-100"
                          : s.status === "delivered"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      }`}
                    >
                      {(s.status || "unknown").replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-6 text-right pr-4">
                    <a
                      href={`/shipment/${s.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-brand-600 hover:text-brand-800 uppercase tracking-[0.1em] transition-colors bg-white hover:bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Assess
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                    {loading ? "Connecting to simulation..." : "No active shipments"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reroute Dialog (manual) */}
      {activeRecommendation && selectedShipment && (
        <RerouteDialog
          shipment={selectedShipment}
          recommendation={activeRecommendation}
          onExecute={handleExecuteReroute}
          onClose={() => setActiveRecommendation(null)}
        />
      )}

      {/* Auto-Reroute Toast */}
      {rerouteToast && (
        <RerouteToast
          disruption={rerouteToast}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
}
