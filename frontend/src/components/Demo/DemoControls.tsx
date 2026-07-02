"use client";

import React from "react";
import { playSimulation, pauseSimulation, resetSimulation, setSimulationSpeed } from "@/lib/api";

interface DemoControlsProps {
  running: boolean;
  speed: number;
  elapsed: number;
  shipments: any[];
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getOverallProgress(shipments: any[]): number {
  if (!shipments.length) return 0;
  const total = shipments.reduce((acc, s) => acc + (s.total_steps || 1), 0);
  const current = shipments.reduce((acc, s) => acc + (s.current_step || 0), 0);
  return Math.min(100, (current / total) * 100);
}

const DemoControls: React.FC<DemoControlsProps> = ({
  running,
  speed,
  elapsed,
  shipments,
  onPlayPause,
  onSpeedChange,
  onReset,
}) => {
  const progress = getOverallProgress(shipments);
  const delivered = shipments.filter((s) => s.status === "delivered").length;

  const handlePlayPause = async () => {
    try {
      if (running) {
        await pauseSimulation();
      } else {
        await playSimulation();
      }
      onPlayPause();
    } catch (e) {
      console.error("Play/pause failed", e);
    }
  };

  const handleSpeed = async (newSpeed: number) => {
    try {
      await setSimulationSpeed(newSpeed);
      onSpeedChange(newSpeed);
    } catch (e) {
      console.error("Speed change failed", e);
    }
  };

  const handleReset = async () => {
    try {
      await resetSimulation();
      onReset();
    } catch (e) {
      console.error("Reset failed", e);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 z-20">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] w-[300px] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${running ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Demo Simulation
              </span>
            </div>
            <span className="text-xs font-bold text-slate-800 tabular-nums font-mono">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
            <span className="text-[10px] font-black text-brand-600 tabular-nums">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-slate-400 font-medium">
              {delivered}/{shipments.length} delivered
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {shipments.length - delivered} in transit
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="p-5 pt-4">
          {/* Play/Pause + Reset */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handlePlayPause}
              className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                running
                  ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                  : "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30"
              }`}
            >
              {running ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>

          {/* Speed Selector */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Speed</p>
            <div className="flex gap-2">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  className={`flex-1 h-9 rounded-lg text-[11px] font-black tabular-nums transition-all ${
                    speed === s
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoControls;
