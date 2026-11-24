"use client";

import React from "react";

interface RerouteDialogProps {
  shipment: any;
  recommendation: any;
  onExecute: () => void;
  onClose: () => void;
}

const RerouteDialog: React.FC<RerouteDialogProps> = ({
  shipment,
  recommendation,
  onExecute,
  onClose,
}) => {
  if (!shipment || !recommendation) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-100 rounded-2xl w-full max-w-2xl overflow-hidden shadow-panel border border-white/[0.08] relative">
        {/* Scan bar */}
        <div className="h-[2px] bg-surface-200 overflow-hidden">
          <div className="w-1/3 h-full bg-accent-500 animate-scan" />
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="badge-accent mb-2">Route Intelligence</div>
              <h2 className="text-xl font-bold text-white">
                Reroute Analysis: <span className="text-accent-400 font-mono">{shipment.id}</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-surface-200 hover:bg-surface-300 rounded-lg transition-all text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Current Route */}
            <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/15">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-dot" />
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Current — High Risk</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Est. Time</span>
                  <span className="text-sm font-semibold text-white font-mono tabular-nums">{recommendation.current_route.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Risk Level</span>
                  <span className="text-lg font-bold text-red-400 font-mono tabular-nums">{(recommendation.current_route.risk * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Recommended */}
            <div className="p-5 rounded-xl bg-accent-500/5 border border-accent-500/15 ring-1 ring-accent-500/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                <p className="text-[10px] font-semibold text-accent-400 uppercase tracking-wider">Optimized Route</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Est. Time</span>
                  <span className="text-sm font-semibold text-white font-mono tabular-nums">{recommendation.recommended_route.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Safety Score</span>
                  <span className="text-lg font-bold text-accent-400 font-mono tabular-nums">{(recommendation.recommended_route.risk * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-200/50 p-4 rounded-xl mb-8 border border-white/[0.04]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Impact Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Applying this reroute adds <span className="text-white font-semibold">~36 mins</span> transit time but reduces risk exposure by <span className="text-teal-400 font-semibold">70%</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary py-3"
            >
              Dismiss
            </button>
            <button
              onClick={onExecute}
              className="flex-1 btn-primary py-3"
            >
              Execute Reroute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RerouteDialog;
