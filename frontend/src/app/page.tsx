"use client";

import React, { useState, useEffect } from "react";
import MapComponent from "@/components/Map/MapComponent";
import RerouteDialog from "@/components/Intelligence/RerouteDialog";
import { fetchShipments, fetchRisks } from "@/lib/api";

export default function Home() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [risks, setRisks] = useState<any>({ active_disruptions: [] });
  const [loading, setLoading] = useState(true);
  
  // Phase 3 State
  const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  useEffect(() => {
    async function loadData() {
      const [shps, rks] = await Promise.all([fetchShipments(), fetchRisks()]);
      setShipments(shps);
      setRisks(rks);
      setLoading(false);
    }
    loadData();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewReroute = async (shipmentId: string) => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/shipments/${shipmentId}/reroute`, { method: "POST" });
      const data = await res.json();
      
      const shipment = shipments.find((s: any) => s.id === shipmentId);
      setSelectedShipment(shipment);
      setActiveRecommendation(data);
    } catch (e) {
      console.error("Failed to fetch reroute recommendation", e);
    }
  };

  const handleExecuteReroute = async () => {
    if (!selectedShipment) return;
    
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${BASE_URL}/shipments/${selectedShipment.id}/execute`, { method: "POST" });
      
      setShipments(prev => prev.map((s: any) => 
        s.id === selectedShipment.id ? { ...s, status: "Rerouted" } : s
      ));
      
      setActiveRecommendation(null);
      setSelectedShipment(null);
      alert(`Optimization successfully executed for ${selectedShipment.id}`);
    } catch (e) {
      console.error("Failed to execute reroute", e);
    }
  };

  return (
    <div className="pt-52 pb-32 min-h-screen relative w-full max-w-[1700px] mx-auto px-8 lg:px-12">
      
      {/* Background Orbs for extra premium feel */}
      <div className="absolute top-40 left-10 w-[500px] h-[500px] bg-brand-200/40 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-96 right-20 w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-[100px] -z-10" />

      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-20 gap-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight leading-tight mb-2">
                Operational <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">Overview</span>
              </h1>
              <p className="text-slate-500 font-medium max-w-xl">
                Real-time visibility matrix and AI-powered disruption detection across the active global fleet.
              </p>
          </div>
          <div className="glass-vibrant px-5 py-3 rounded-2xl flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Intelligence Feeds</span>
              <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-brand-50 border-[3px] border-white flex items-center justify-center shadow-sm z-30" title="Meteorology">
                    <span className="text-[10px] font-bold text-brand-600">M</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border-[3px] border-white flex items-center justify-center shadow-sm z-20" title="Telemetry">
                    <span className="text-[10px] font-bold text-emerald-600">T</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-50 border-[3px] border-white flex items-center justify-center shadow-sm z-10" title="AIS-Live">
                    <span className="text-[10px] font-bold text-amber-600">A</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Primary KPI Grid rendered without individual stagger animations for scroll speed */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-20 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        
        {/* Main Network Throughput Block */}
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
                   <p className="text-7xl lg:text-8xl font-display font-black text-slate-800 tracking-tighter tabular-nums drop-shadow-sm">{shipments.length}</p>
                   <span className="text-lg font-bold text-slate-400">active assets</span>
                 </div>
                 <p className="text-sm font-medium text-slate-500 mt-2">Actively tracked and intelligently routed shipments in transit across all regions.</p>
              </div>
          </div>
        </div>

        {/* Critical Alerts Block */}
        <div className="md:col-span-2 lg:col-span-3 bento-card bg-gradient-to-br from-red-50/50 to-white border-t-4 border-t-red-500 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">Disruption Alerts</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-[9px] font-extrabold text-red-700 uppercase tracking-widest">Action Req</span>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-7xl lg:text-8xl font-display font-black text-red-600 tracking-tighter tabular-nums drop-shadow-sm">{risks.active_disruptions.length}</p>
            <span className="text-lg font-bold text-red-400">severe risks</span>
          </div>
          <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity Threshold</p>
                  <p className="text-xs font-black text-red-600 uppercase tracking-wider">{risks.active_disruptions.length > 2 ? 'Critical' : 'Elevated'}</p>
              </div>
              <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden border border-red-200">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-600 w-3/4 rounded-full" />
              </div>
          </div>
        </div>

        {/* Small Data Tiles */}
        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Stability Index</h3>
          <p className="text-4xl font-display font-black text-slate-800 tabular-nums">98.2%</p>
          <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                1.2%
              </div>
              <span className="text-[10px] font-medium text-slate-400">vs yesterday</span>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Avg Risk Index</h3>
          <p className="text-4xl font-display font-black text-slate-800 tabular-nums">
            {(shipments.reduce((acc: number, s: any) => acc + s.risk_score, 0) / (shipments.length || 1)).toFixed(2)}
          </p>
          <div className="mt-4">
             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Std Dev: 0.05</p>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 bento-card p-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Fuel Efficiency</h3>
          <p className="text-4xl font-display font-black text-brand-600 tabular-nums drop-shadow-sm">89%</p>
          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-400 to-emerald-400 w-[89%]" />
          </div>
        </div>
      </div>

      {/* Main Command & Control Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Live Network Map - Simplified container for better Mapbox performance */}
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
               
               {/* Map overlay UI */}
               <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/40 z-10 flex items-center gap-3">
                 <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
                 <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Global Mapping Engine Online</span>
               </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm rounded-[1.8rem]">
               <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <p className="font-display text-lg font-bold text-slate-800">Map Interface Offline</p>
               <p className="text-xs font-semibold text-slate-400 mt-2">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing in .env</p>
            </div>
          )}
        </div>

        {/* Real-time Risk Feed Sidebar */}
        <div className="glass-panel p-6 h-[700px] flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
               <h2 className="font-display font-bold text-slate-900 text-lg">Risk Intelligence</h2>
               <p className="text-[10px] font-medium text-slate-400 mt-1">AI Event Detection Stream</p>
            </div>
            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 rounded-lg">Live</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {risks.active_disruptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">All Systems Nominal</p>
                <p className="text-xs text-slate-400 mt-1">No active disruptions detected across the network.</p>
              </div>
            ) : (
              risks.active_disruptions.map((risk: any) => (
                <div key={risk.id} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg ${risk.severity === 'High' ? 'border-red-100 bg-gradient-to-b from-white to-red-50/30' : 'border-orange-100 bg-gradient-to-b from-white to-orange-50/30'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${risk.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                      {risk.type} Alert
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap ml-2">Just now</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-4 leading-relaxed">{risk.description}</p>
                  
                  <button 
                    onClick={() => handleReviewReroute(risk.shipment_id)}
                    className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 text-[10px] font-bold rounded-xl uppercase tracking-widest transition-all ${risk.severity === 'High' ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200'}`}
                  >
                    <span>Analyze Impact</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Fleet Deployments Table */}
      <div className="mt-20 glass-panel p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 pb-6 border-b border-slate-100 gap-4">
              <div>
                  <h2 className="font-display font-bold text-slate-900 text-xl">Active Fleet Deployments</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Comprehensive view of all regional and global transit assets.</p>
              </div>
              <div className="flex items-center gap-3">
                 <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-colors">
                    Export Log
                 </button>
                 <button className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-brand-100 transition-colors">
                    Filter View
                 </button>
              </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100 pl-4 w-52">Asset ID</th>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Origin Node</th>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Destination Node</th>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">ETA / Priority</th>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100">Current Phase</th>
                          <th className="pb-4 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] border-b border-slate-100 text-right pr-4">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {shipments.map((s: any) => (
                          <tr key={s.id} className="group hover:bg-brand-50/50 transition-colors border-b border-slate-50 last:border-0">
                              <td className="py-8 pl-4">
                                  <span className="inline-flex items-center gap-2">
                                     <span className="w-1.5 h-6 bg-slate-200 rounded-full group-hover:bg-brand-400 transition-colors"></span>
                                     <span className="text-xs font-black text-slate-800">{s.id}</span>
                                  </span>
                              </td>
                              <td className="py-8">
                                  <div className="flex flex-col">
                                     <span className="text-sm font-bold text-slate-700">{s.origin.name}</span>
                                     <span className="text-[10px] font-semibold text-slate-400">{s.origin.lat.toFixed(2)}, {s.origin.lng.toFixed(2)}</span>
                                  </div>
                              </td>
                              <td className="py-8">
                                  <div className="flex flex-col">
                                     <span className="text-sm font-bold text-slate-700">{s.destination.name}</span>
                                     <span className="text-[10px] font-semibold text-slate-400">{s.destination.lat.toFixed(2)}, {s.destination.lng.toFixed(2)}</span>
                                  </div>
                              </td>
                              <td className="py-8">
                                  <span className="text-sm font-semibold text-slate-600 placeholder:">—</span>
                              </td>
                              <td className="py-8">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${s.status === 'in_transit' ? 'bg-brand-50/50 text-brand-600 border-brand-100' : s.status === 'delayed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                      {s.status.replace('_', ' ')}
                                  </span>
                              </td>
                              <td className="py-5 text-right pr-4">
                                  <a href={`/shipment/${s.id}`} className="inline-flex items-center gap-1 text-[10px] font-black text-brand-600 hover:text-brand-800 uppercase tracking-[0.1em] transition-colors bg-white hover:bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg shadow-sm">
                                    Assess <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                  </a>
                              </td>
                          </tr>
                      ))}
                      {/* Empty state padding if few shipments */}
                      {shipments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">Loading fleet data or no active shipments...</td>
                        </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {activeRecommendation && selectedShipment && (
        <RerouteDialog 
          shipment={selectedShipment}
          recommendation={activeRecommendation}
          onExecute={handleExecuteReroute}
          onClose={() => setActiveRecommendation(null)}
        />
      )}
    </div>
  );
}
