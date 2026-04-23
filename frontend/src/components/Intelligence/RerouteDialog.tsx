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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.3)] border border-white/20 relative">
        {/* Scanning Simulation Overlay */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500/30 overflow-hidden">
            <div className="w-1/3 h-full bg-brand-500 animate-marquee" />
        </div>
        
        <div className="p-10 md:p-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-[11px] font-black text-brand-600 uppercase tracking-[0.3em] mb-2">Intelligence Recommendation</p>
              <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Dynamic Reroute: <span className="text-slate-500">{shipment.id}</span></h2>
            </div>
            <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"
            >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Current Path */}
            <div className="p-6 rounded-3xl bg-red-50 border border-red-100/50">
              <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">High Risk Exposure</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Est. Time</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">{recommendation.current_route.time}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-red-100/30">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Conflict Risk</span>
                  <span className="text-lg font-black text-red-600 tabular-nums">{(recommendation.current_route.risk * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-red-800 font-bold leading-relaxed italic opacity-80">
                   "Critical environment saturation detected in Sector Delta-9."
                </p>
              </div>
            </div>

            {/* Recommended Path */}
            <div className="p-6 rounded-3xl bg-brand-50 border border-brand-200 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/10">
              <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-brand-600" />
                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">TransitIQ Optimized</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Est. Time</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">{recommendation.recommended_route.time}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-brand-200/30">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Safety Score</span>
                  <span className="text-lg font-black text-brand-600 tabular-nums">{(recommendation.recommended_route.risk * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-brand-800 font-bold leading-relaxed italic opacity-80">
                   {recommendation.recommended_route.reason}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl mb-12 border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Impact Intelligence</p>
             <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Applying this realignment increases transit duration by <span className="text-slate-900 font-black">36 mins</span> but decreases total asset risk by <span className="text-brand-600 font-black">70%</span>.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 text-[11px] font-black rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-[0.2em]"
            >
              Discard Analysis
            </button>
            <button 
              onClick={onExecute}
              className="flex-1 py-4 bg-brand-600 text-white text-[11px] font-black rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all active:scale-95 uppercase tracking-[0.2em]"
            >
              Execute One-Click Reroute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RerouteDialog;
