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
    <div className="pt-16 min-h-screen">
      <div className="border-b border-white/[0.06] bg-surface-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <span className="text-[10px] font-mono text-slate-600">OPERATIONS / FLEET MANAGEMENT</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-6 gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
              Fleet <span className="text-accent-400">Management</span>
            </h1>
            <p className="text-sm text-slate-500">Complete fleet overview with risk and telemetry data.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-[10px]">
              Export Data
            </button>
            <button className="btn-primary text-[10px]">
              Optimize Fleet
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="metric-card">
            <span className="label mb-2 block">Total Assets</span>
            <p className="text-2xl font-bold text-white tabular-nums">{shipments.length}</p>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">In Transit</span>
            <p className="text-2xl font-bold text-accent-400 tabular-nums">
              {shipments.filter(s => s.status === "in_transit").length}
            </p>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">Delivered</span>
            <p className="text-2xl font-bold text-teal-400 tabular-nums">
              {shipments.filter(s => s.status === "delivered").length}
            </p>
          </div>
          <div className="metric-card">
            <span className="label mb-2 block">At Risk</span>
            <p className="text-2xl font-bold text-red-400 tabular-nums">
              {shipments.filter(s => s.risk_score > 0.7).length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-200/30">
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Asset</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Status</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Risk</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04]">Progress</th>
                  <th className="px-5 py-3 label border-b border-white/[0.04] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shp: any, idx: number) => (
                  <tr key={shp.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center border border-white/[0.06] group-hover:border-accent-500/20 transition-colors">
                          <span className="text-[9px] font-mono font-semibold text-accent-400">#{String(idx + 1).padStart(2, "0")}</span>
                        </div>
                        <div>
                          <p className="text-xs font-mono font-semibold text-white">{shp.id}</p>
                          <p className="text-[9px] text-slate-600 mt-0.5">{shp.cargo_type || "Freight"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          shp.status === "rerouted" ? "bg-teal-400" :
                          shp.status === "delivered" ? "bg-teal-400" :
                          shp.status === "delayed" ? "bg-red-400 animate-pulse-dot" :
                          "bg-accent-400"
                        }`} />
                        <span className="text-xs text-slate-300 capitalize">{shp.status.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 progress-track">
                          <div
                            className={`progress-fill ${shp.risk_score > 0.7 ? "bg-red-500" : shp.risk_score > 0.4 ? "bg-amber-500" : "bg-teal-500"}`}
                            style={{ width: `${shp.risk_score * 100}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono tabular-nums ${shp.risk_score > 0.7 ? "text-red-400" : "text-slate-400"}`}>
                          {(shp.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {shp.total_steps ? Math.round((shp.current_step / shp.total_steps) * 100) : 0}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={`/shipment/${shp.id}`}
                        className="btn-secondary text-[10px] inline-flex items-center gap-1.5 px-3 py-1.5"
                      >
                        Details
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                      </a>
                    </td>
                  </tr>
                ))}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-600">
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
                            <span className="text-xs">Loading fleet data...</span>
                          </div>
                        ) : (
                          <span className="text-xs">No assets found</span>
                        )}
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
