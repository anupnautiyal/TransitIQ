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
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
        fixed top-20 right-4 z-[9998] w-[380px]
        transition-all duration-400 ease-out
        ${visible && !exiting ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}
      `}
    >
      <div className="bg-surface-100/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-panel overflow-hidden">
        {/* Top accent */}
        <div className="h-[2px] bg-gradient-to-r from-teal-500 via-accent-500 to-teal-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">Auto-Rerouted</p>
                <p className="text-xs font-mono font-semibold text-white mt-0.5">{disruption.shipment_id}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded bg-surface-200 hover:bg-surface-300 flex items-center justify-center transition-colors"
            >
              <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Disruption info */}
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2.5 mb-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse-dot" />
              <p className="text-[9px] font-semibold text-red-400 uppercase tracking-wider">{disruption.type}</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{disruption.description}</p>
          </div>

          {/* Reroute info */}
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-2.5 h-2.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[9px] font-semibold text-teal-400 uppercase tracking-wider">Optimized</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{disruption.auto_reroute_reason}</p>
          </div>

          {/* Timer bar */}
          <div className="mt-3 h-[2px] bg-surface-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-accent-500 rounded-full"
              style={{ animation: "toast-progress 8s linear forwards" }}
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
