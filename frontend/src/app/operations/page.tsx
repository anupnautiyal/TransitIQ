"use client";

import React, { useState, useEffect } from "react";
import { fetchShipments } from "@/lib/api";

export default function OperationsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const shps = await fetchShipments();
      setShipments(shps);
      setLoading(false);
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-32 pb-12 min-h-screen">
      <div className="container mx-auto px-6">
        <div className="mb-10 flex items-start justify-between">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">FLEET OPERATIONS</h1>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Asset Management & Telemetry Console</p>
            </div>
            <div className="flex items-center gap-4">
                <button className="glass px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors">Export Telemetry</button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Optimize Fleet</button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            <div className="bento-card p-1 animate-fade-in overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Asset ID</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Risk Score</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Fuel Level</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {shipments.map((shp: any, idx: number) => (
                            <tr key={shp.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-blue-600">0{idx + 1}</span>
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-900">{shp.id}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Global Transit v2</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${shp.status === 'Rerouted' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`} />
                                        <span className="text-[11px] font-bold text-slate-900 uppercase">{shp.status}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${shp.risk_score > 0.7 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                style={{ width: `${shp.risk_score * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-[11px] font-black ${shp.risk_score > 0.7 ? 'text-red-500' : 'text-slate-900'}`}>
                                            {(shp.risk_score * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-slate-400">OPTIMAL</span>
                                            <span className="text-[11px] font-black text-slate-900">84%</span>
                                        </div>
                                        <div className="w-20 h-1 bg-slate-100 rounded-full">
                                            <div className="h-full bg-emerald-400 w-[84%]" />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
