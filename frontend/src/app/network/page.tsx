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
          <div className="glass p-4 rounded-2xl w-64 animate-fade-in shadow-2xl">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Risk Zones</h3>
              <div className="space-y-2">
                  {risks.active_disruptions.slice(0, 2).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${r.severity === 'High' ? 'bg-red-500' : 'bg-orange-500'}`} />
                          <p className="text-[11px] font-bold text-slate-900 truncate">{r.description}</p>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}
