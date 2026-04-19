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
    <div className="pt-48 pb-20 min-h-screen px-6 lg:px-10 relative z-10 max-w-[1600px] mx-auto">
      {/* Dynamic Background Elements */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-brand-100/30 rounded-full blur-[120px] -z-10" />

      <div className="animate-fade-in">
        <div className="mb-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div>
                <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight mb-2 uppercase">
                  Ground <span className="text-brand-600">Freight</span> Control
                </h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  Asset Management & Telemetry Console
                </p>
            </div>
            <div className="flex items-center gap-4">
                <button className="bg-white/60 hover:bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:shadow-soft">
                  Export Telemetry
                </button>
                <button className="px-8 py-3.5 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all hover:-translate-y-1">
                  Optimize Global Fleet
                </button>
            </div>
        </div>

        <div className="glass-panel p-2 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Asset Identity</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">System Status</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Risk Variance</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fuel Efficiency</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Console</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {shipments.map((shp: any, idx: number) => (
                            <tr key={shp.id} className="hover:bg-brand-50/30 transition-all group">
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:border-brand-200 transition-all">
                                            <span className="text-[10px] font-black text-brand-600">#0{idx + 1}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 tracking-tight">{shp.id}</p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">National Freight Class-A</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${shp.status === 'Rerouted' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-brand-500 shadow-brand-100'}`} />
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${shp.status === 'Rerouted' ? 'text-emerald-600' : 'text-slate-800'}`}>{shp.status.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-2 w-32 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <div 
                                                className={`h-full transition-all duration-1000 rounded-full ${shp.risk_score > 0.7 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-brand-400 to-brand-600'}`} 
                                                style={{ width: `${shp.risk_score * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-[11px] font-black tabular-nums ${shp.risk_score > 0.7 ? 'text-red-600' : 'text-slate-900'}`}>
                                            {(shp.risk_score * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex flex-col gap-1.5 pt-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-[9px] font-black text-slate-400 tracking-widest">ECO-LINK</span>
                                            <span className="text-[11px] font-black text-brand-600 tabular-nums">84%</span>
                                        </div>
                                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 w-[84%] rounded-full" />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-7 text-right">
                                    <a href={`/shipment/${shp.id}`} className="inline-flex items-center gap-2 bg-white border border-brand-100 text-brand-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 hover:text-white hover:shadow-lg hover:shadow-brand-500/20 transition-all duration-300 transform group-hover:translate-x-0">
                                        <span>Assess</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {shipments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center opacity-40">
                                        <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <p className="font-display font-black text-sm uppercase tracking-widest">Establishing Secure Sync...</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
