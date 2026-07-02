"use client";

import React, { useEffect, useState } from "react";

interface RerouteToastProps {
  disruption: any;
  onDismiss: () => void;
}

const RerouteToast: React.FC<RerouteToastProps> = ({ disruption, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Auto-dismiss after 8 seconds
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 400);
    }, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 400);
  };

  if (!disruption?.auto_rerouted) return null;

  return (
    <div
      className={`
        fixed top-24 right-6 z-[9998] w-[420px]
        transition-all duration-400 ease-out
        ${visible && !exiting ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}
      `}
    >
      <div className="bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-brand-500 to-emerald-400" />
        
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Auto-Reroute Active</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{disruption.shipment_id}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Disruption Info */}
          <div className="bg-red-50/60 border border-red-100 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{disruption.type} Alert</p>
            </div>
            <p className="text-xs text-red-800 font-medium leading-relaxed">{disruption.description}</p>
          </div>

          {/* Reroute Info */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Optimized Path</p>
            </div>
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
              {disruption.auto_reroute_reason}
            </p>
          </div>

          {/* Animated progress bar */}
          <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-brand-500 rounded-full"
              style={{
                animation: "toast-progress 8s linear forwards",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default RerouteToast;
