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
    <div className="h-screen w-full relative bg-slate-50 overflow-hidden pt-20">
      {/* Immersive Map Container */}
      <div className="absolute inset-0 top-0">
        {MAPBOX_TOKEN ? (
            <MapComponent 
                accessToken={MAPBOX_TOKEN} 
                shipments={shipments} 
                risks={risks.active_disruptions} 
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="font-display font-bold">Map Core Offline</p>
                </div>
            </div>
        )}
      </div>

      {/* Floating Operational Interface */}
      <div className="absolute top-40 left-8 z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="glass-panel p-6 w-80 shadow-2xl">
              <div className="mb-4 pb-4 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                      Active View
                  </p>
                  <p className="text-sm font-display font-black text-slate-900 uppercase">National Roadways Network</p>
              </div>
              <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-slate-700 text-[10px] uppercase tracking-widest">Network Status</h2>
                  <span className="text-[9px] bg-brand-600/10 text-brand-600 px-2.5 py-1 rounded-lg uppercase font-black tracking-widest border border-brand-200/50">Intelligence Active</span>
              </div>
              <div className="space-y-6">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Nodes</p>
                      <p className="text-3xl font-display font-black text-slate-800 tracking-tighter tabular-nums">
                        {shipments.length} <span className="text-xs text-slate-300 ml-1">/ 15 Active</span>
                      </p>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Coverage</p>
                        <p className="text-[11px] font-black text-brand-600">92%</p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 w-[92%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-1000" />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Stats legend / Side menu */}
      <div className="absolute bottom-10 right-10 z-10 flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="glass-panel p-5 w-64 shadow-2xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3">Live Risk Heatmap</h3>
              <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                      <div className="w-full flex h-2.5 rounded-full overflow-hidden border border-slate-100">
                          <div className="w-1/4 bg-brand-400" title="Low Risk"></div>
                          <div className="w-1/4 bg-amber-400" title="Moderate Risk"></div>
                          <div className="w-1/2 bg-red-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]" title="High Risk"></div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                          <span className="text-[8px] font-black text-slate-300 uppercase">Stable</span>
                          <span className="text-[8px] font-black text-red-400 uppercase">Critical</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Global Command Ticker- Optimized for Light Mode */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[calc(100%-8rem)] max-w-5xl h-12 bg-white/60 backdrop-blur-xl border border-white rounded-full z-40 flex items-center shadow-lg overflow-hidden group">
        <div className="bg-brand-600 h-full px-6 flex items-center justify-center z-10 shadow-[4px_0_20px_rgba(37,99,235,0.2)]">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.25em] whitespace-nowrap">Intelligence Stream</span>
        </div>
        <div className="flex-1 overflow-hidden relative group-hover:bg-white/40 transition-colors">
            <div className="flex whitespace-nowrap animate-marquee">
                {/* Double the content for seamless infinite scroll */}
                <div className="flex items-center gap-16 pr-16 py-1">
                    {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                       <div key={idx} className="flex items-center gap-4 group/item cursor-pointer">
                           <span className={`w-2 h-2 rounded-full shadow-sm ${r.severity === 'High' ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-brand-400 shadow-brand-100'}`}></span>
                           <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider group-hover/item:text-brand-600 transition-colors">
                            <span className="text-slate-400 tabular-nums">[{r.location?.lat.toFixed(1)}, {r.location?.lng.toFixed(1)}]</span> {r.description}
                           </span>
                       </div>
                    )) : (
                        <div className="flex items-center gap-4">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-emerald-200 animate-pulse"></span>
                           <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                            Global Network Synchronized &bull; All Latency Metrics Within Nominal Ranges &bull; DeepMind Intelligence Node Online
                           </span>
                       </div>
                    )}
                </div>
                {/* Clone for marquee */}
                <div className="flex items-center gap-16 pr-16 py-1">
                    {risks.active_disruptions.length > 0 ? risks.active_disruptions.map((r: any, idx: number) => (
                       <div key={'dup'+idx} className="flex items-center gap-4 group/item cursor-pointer">
                           <span className={`w-2 h-2 rounded-full shadow-sm ${r.severity === 'High' ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-brand-400 shadow-brand-100'}`}></span>
                           <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider group-hover/item:text-brand-600 transition-colors">
                            <span className="text-slate-400 tabular-nums">[{r.location?.lat.toFixed(1)}, {r.location?.lng.toFixed(1)}]</span> {r.description}
                           </span>
                       </div>
                    )) : (
                        <div className="flex items-center gap-4">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-emerald-200 animate-pulse"></span>
                           <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                            Global Network Synchronized &bull; All Latency Metrics Within Nominal Ranges &bull; DeepMind Intelligence Node Online
                           </span>
                       </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
