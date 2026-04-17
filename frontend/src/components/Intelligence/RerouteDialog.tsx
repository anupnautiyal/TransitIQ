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
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-500/10 backdrop-blur-md animate-fade-in">
      <div className="glass w-full max-w-2xl overflow-hidden shadow-[0_32px_120px_rgba(0,0,0,0.15)] border-white/60">
        <div className="p-8 relative">
          {/* Scanning Simulation Overlay (Can be toggled) */}
          <div className="scanning-line" />
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Intelligence Recommendation</p>
              <h2 className="text-2xl font-extrabold text-slate-900">Dynamic Reroute: {shipment.id}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                 <span className="text-slate-400">✕</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Current Path */}
            <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100">
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-3">Current Path (High Risk)</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Est. Time</span>
                  <span className="font-bold text-slate-900">{recommendation.current_route.time}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Risk Score</span>
                  <span className="font-bold text-red-600">{(recommendation.current_route.risk * 100).toFixed(0)}%</span>
                </div>
                <div className="pt-2 border-t border-red-100">
                   <p className="text-[9px] text-red-700 font-medium">Critical Weather Warning in Sector Delta-9</p>
                </div>
              </div>
            </div>

            {/* Recommended Path */}
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 ring-2 ring-blue-600/20">
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-3">Optimize Path (TransitIQ)</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Est. Time</span>
                  <span className="font-bold text-slate-900">{recommendation.recommended_route.time}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Risk Score</span>
                  <span className="font-bold text-blue-600">{(recommendation.recommended_route.risk * 100).toFixed(0)}%</span>
                </div>
                <div className="pt-2 border-t border-blue-100">
                   <p className="text-[9px] text-blue-700 font-medium">{recommendation.recommended_route.reason}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl mb-8">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impact Analysis</p>
             <p className="text-xs text-slate-600">Executing this reroute increases transit time by <span className="text-slate-900 font-bold">36 mins</span> but reduces risk of shipment loss by <span className="text-blue-600 font-bold">70%</span>.</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-widest"
            >
              Discard Recommendation
            </button>
            <button 
              onClick={onExecute}
              className="flex-1 py-4 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest"
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
