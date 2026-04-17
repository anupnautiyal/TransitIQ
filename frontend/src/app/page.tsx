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

  // In a real app, this token would be fetched from a secure endpoint or server-side env
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  useEffect(() => {
    async function loadData() {
      const [shps, rks] = await Promise.all([fetchShipments(), fetchRisks()]);
      setShipments(shps);
      setRisks(rks);
      setLoading(false);
    }
    loadData();

    // Polling for updates every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewReroute = async (shipmentId: string) => {
    // Call Phase 3 Backend /reroute endpoint
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
      
      // Update local state for immediate feedback
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
    <div className="pt-48 pb-12 min-h-screen bg-slate-50">
      <div className="container mx-auto">
        {/* Command Center Status Bar */}
        <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter">LOGISTICS<span className="text-blue-600">HUB</span></h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Overview Console</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Fleet Status</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
                            <span className="text-[10px] font-extrabold text-slate-900 uppercase">Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Intelligence Layers</span>
                    <div className="flex items-center -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600" title="Meteorology">M</div>
                        <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-emerald-600" title="Telemetry">T</div>
                        <div className="w-6 h-6 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-amber-600" title="AIS-Live">A</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Bento Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
          {/* Large Hero Metric */}
          <div className="md:col-span-2 lg:col-span-3 bento-card p-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex flex-col h-full justify-between">
                <div>
                   <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-500 mb-6">Network Throughput</h3>
                   <p className="text-7xl font-extrabold text-slate-900 tracking-tighter text-glow">{shipments.length}</p>
                   <p className="text-sm font-medium text-slate-500 mt-2">Active intelligence-tracked shipments in-transit</p>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700 uppercase">Live Operations</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Global Fleet Link Active</span>
                </div>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="md:col-span-2 lg:col-span-3 bento-card p-10 border-red-100 animate-fade-in bg-red-50/10" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-red-500 mb-6">Disruption Alerts</h3>
            <p className="text-7xl font-extrabold text-red-600 tracking-tighter text-glow">{risks.active_disruptions.length}</p>
            <div className="mt-8">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Risk Level</p>
                    <p className="text-xs font-black text-red-600 uppercase">Critical</p>
                </div>
                <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-4/5" />
                </div>
            </div>
          </div>

          {/* Smaller Data Tiles */}
          <div className="md:col-span-2 lg:col-span-2 bento-card p-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Stability Index</h3>
            <p className="text-4xl font-extrabold text-slate-900">98.2%</p>
            <div className="mt-4 flex items-center gap-1">
                <span className="text-[10px] font-black text-emerald-500">+1.2%</span>
                <span className="text-[10px] text-slate-400 italic">vs yesterday</span>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-2 bento-card p-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Avg Risk Index</h3>
            <p className="text-4xl font-extrabold text-slate-900">
              {(shipments.reduce((acc: number, s: any) => acc + s.risk_score, 0) / (shipments.length || 1)).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">Standard Deviation: 0.05</p>
          </div>

          <div className="md:col-span-2 lg:col-span-2 bento-card p-8 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Fuel Efficiency</h3>
            <p className="text-4xl font-extrabold text-slate-900 text-glow">89%</p>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full">
                <div className="h-full bg-blue-500 w-4/5" />
            </div>
          </div>
        </div>

        {/* Intelligence Center */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Live Network Map */}
          <div className="lg:col-span-3 bento-card h-[750px] relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.6s" }}>
            {MAPBOX_TOKEN ? (
              <MapComponent 
                accessToken={MAPBOX_TOKEN} 
                shipments={shipments} 
                risks={risks.active_disruptions} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 border-2 border-dashed border-slate-200 m-2 rounded-xl">
                 <p className="font-bold">Mapbox Access Token Required</p>
                 <p className="text-[10px] uppercase tracking-widest mt-1">Check your .env file</p>
              </div>
            )}
          </div>

          {/* Real-time Risk Feed */}
          <div className="glass p-6 h-[650px] flex flex-col animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900">Risk Intelligence Feed</h2>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded">AUTO-INGEST</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 h-[500px]">
              {risks.active_disruptions.length === 0 ? (
                <div className="text-center py-12 text-slate-300">
                  <p className="text-sm font-medium">No active disruptions detected</p>
                </div>
              ) : (
                risks.active_disruptions.map((risk: any) => (
                  <div key={risk.id} className={`p-4 rounded-xl border ${risk.severity === 'High' ? 'border-red-100 bg-red-50/20' : 'border-orange-100 bg-orange-50/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-extrabold uppercase ${risk.severity === 'High' ? 'text-red-500' : 'text-orange-500'}`}>
                        {risk.type} Alert
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">LIVE</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">{risk.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button 
                        onClick={() => handleReviewReroute(shipments[0]?.id || "SHP-001")}
                        className="flex-1 py-1.5 bg-slate-900 text-white text-[9px] font-bold rounded-lg uppercase tracking-wider hover:bg-slate-800 transition-colors"
                      >
                        Analyze Impact
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active Fleet List */}
        <div className="mt-8 glass p-8 rounded-3xl animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-slate-900">Active Fleet Deployments</h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase">India Region</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="pb-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest pl-2">Asset ID</th>
                            <th className="pb-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Origin</th>
                            <th className="pb-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Destination</th>
                            <th className="pb-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Status</th>
                            <th className="pb-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right pr-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.map((s: any) => (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 pl-2">
                                    <span className="text-xs font-black text-slate-900">{s.id}</span>
                                </td>
                                <td className="py-4">
                                    <span className="text-xs font-bold text-slate-500">{s.origin.name}</span>
                                </td>
                                <td className="py-4">
                                    <span className="text-xs font-bold text-slate-500">{s.destination.name}</span>
                                </td>
                                <td className="py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${s.status === 'in_transit' ? 'bg-blue-50 text-blue-600' : s.status === 'delayed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {s.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="py-4 text-right pr-2">
                                    <a href={`/shipment/${s.id}`} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">View Details &rarr;</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Phase 3 Recommendation Dialog */}
        {activeRecommendation && (
          <RerouteDialog 
            shipment={selectedShipment}
            recommendation={activeRecommendation}
            onExecute={handleExecuteReroute}
            onClose={() => setActiveRecommendation(null)}
          />
        )}
      </div>
    </div>
  );
}
