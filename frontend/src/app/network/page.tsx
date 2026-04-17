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
    <div className="h-screen w-full relative bg-slate-900 overflow-hidden">
      {/* Immersive Map Container */}
      <div className="absolute inset-0">
        {MAPBOX_TOKEN ? (
            <MapComponent 
                accessToken={MAPBOX_TOKEN} 
                shipments={shipments} 
                risks={risks.active_disruptions} 
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
                Mapbox Token Required
            </div>
        )}
      </div>

      {/* Floating Operational Interface */}
      <div className="absolute top-32 left-8 z-10">
          <div className="glass-vibrant p-6 rounded-[2rem] w-80 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-black text-slate-900 tracking-tighter">NETWORK STATUS</h2>
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-bold">INTELLIGENCE ACTIVE</span>
              </div>
              <div className="space-y-4">
                  <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Nodes</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">{shipments.length} <span className="text-xs text-slate-400">/ 15 Total</span></p>
                  </div>
                  <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risk Coverage</p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[92%]" />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-4">
          <div className="glass p-4 rounded-2xl w-64 animate-fade-in shadow-2xl backdrop-blur-xl border border-white/20">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Live Risk Heatmap</h3>
              <div className="space-y-3">
                  <div className="flex items-center gap-3">
                      <div className="w-full flex h-2 rounded-full overflow-hidden opacity-80">
                          <div className="w-1/4 bg-blue-400"></div>
                          <div className="w-1/4 bg-orange-400"></div>
                          <div className="w-1/2 bg-red-600"></div>
                      </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right">Severity Spectrum</p>
              </div>
          </div>
      </div>

      {/* Global Command Ticker */}
      <div className="absolute top-0 left-0 w-full h-10 bg-slate-900/90 backdrop-blur-md border-b border-white/10 z-50 flex items-center overflow-hidden">
        <div className="bg-blue-600 h-full px-6 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">Global Feed</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
            <div className="flex whitespace-nowrap animate-marquee">
                {/* Double the content for seamless infinite scroll */}
                <div className="flex items-center gap-12 pr-12">
                    {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                       <div key={idx} className="flex items-center gap-3">
                           <span className={`w-2 h-2 rounded-full ${r.severity === 'High' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}></span>
                           <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{r.location?.lat.toFixed(2)}, {r.location?.lng.toFixed(2)} - {r.description}</span>
                       </div>
                    )) : (
                        <div className="flex items-center gap-3">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                           <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">GLOBAL NETWORK STABLE - NO SEVERE DISRUPTIONS DETECTED</span>
                       </div>
                    )}
                </div>
                <div className="flex items-center gap-12 pr-12">
                    {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                       <div key={'dup'+idx} className="flex items-center gap-3">
                           <span className={`w-2 h-2 rounded-full ${r.severity === 'High' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}></span>
                           <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{r.location?.lat.toFixed(2)}, {r.location?.lng.toFixed(2)} - {r.description}</span>
                       </div>
                    )) : (
                        <div className="flex items-center gap-3">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                           <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">GLOBAL NETWORK STABLE - NO SEVERE DISRUPTIONS DETECTED</span>
                       </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

