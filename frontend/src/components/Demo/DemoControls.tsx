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
      if (running) await pauseSimulation();
      else await playSimulation();
      onPlayPause();
    } catch (e) { console.error("Play/pause failed", e); }
  };

  const handleSpeed = async (newSpeed: number) => {
    try {
      await setSimulationSpeed(newSpeed);
      onSpeedChange(newSpeed);
    } catch (e) { console.error("Speed change failed", e); }
  };

  const handleReset = async () => {
    try {
      await resetSimulation();
      onReset();
    } catch (e) { console.error("Reset failed", e); }
  };

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <div className="bg-surface-100/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-panel w-[260px] overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${running ? "bg-teal-400 animate-pulse-dot" : "bg-slate-500"}`} />
              <span className="text-[10px] font-mono text-slate-400">SIMULATION</span>
            </div>
            <span className="text-xs font-mono font-semibold text-accent-400 tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-mono text-slate-500">PROGRESS</span>
            <span className="text-[10px] font-mono text-accent-400 tabular-nums">{progress.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill bg-gradient-to-r from-accent-600 to-teal-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-slate-600">{delivered}/{shipments.length} delivered</span>
            <span className="text-[9px] text-slate-600">{shipments.length - delivered} in transit</span>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-semibold transition-all ${
                running
                  ? "bg-surface-300 text-slate-300 hover:bg-surface-400 border border-white/[0.06]"
                  : "bg-accent-600 text-white hover:bg-accent-500 shadow-glow-accent"
              }`}
            >
              {running ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="h-9 px-3 rounded-lg bg-surface-200 border border-white/[0.06] text-slate-400 hover:text-white hover:bg-surface-300 transition-all flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Speed */}
          <div>
            <p className="text-[9px] font-mono text-slate-500 mb-1.5">SPEED</p>
            <div className="flex gap-1.5">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  className={`flex-1 h-7 rounded text-[10px] font-mono font-semibold transition-all ${
                    speed === s
                      ? "bg-accent-600 text-white shadow-glow-accent"
                      : "bg-surface-200 text-slate-500 border border-white/[0.06] hover:text-slate-300"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Hazard on Any Truck */}
          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-[9px] font-mono text-slate-500 mb-1.5">SIMULATE HAZARD</p>
            <div className="flex flex-col gap-1.5">
              <select
                id="hazard-truck-select"
                aria-label="Select truck to disrupt"
                className="w-full bg-surface-200 border border-white/[0.06] rounded px-2 py-1 text-[10px] font-mono text-slate-300 outline-none"
                defaultValue={shipments[0]?.id || ""}
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({s.origin?.name?.split(" ")[0]} → {s.destination?.name?.split(" ")[0]})
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <button
                  onClick={async () => {
                    const sel = (document.getElementById("hazard-truck-select") as HTMLSelectElement)?.value;
                    if (!sel) return;
                    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                    await fetch(`${BASE_URL}/simulation/inject-disruption`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        shipment_id: sel,
                        disruption_type: "Traffic",
                        description: `Sudden congestion and road hazard reported on route ${sel}`,
                        severity: "Critical",
                      }),
                    });
                  }}
                  className="flex-1 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[9px] font-semibold transition-all text-center"
                >
                  🚨 Inject Traffic
                </button>
                <button
                  onClick={async () => {
                    const sel = (document.getElementById("hazard-truck-select") as HTMLSelectElement)?.value;
                    if (!sel) return;
                    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                    await fetch(`${BASE_URL}/simulation/inject-disruption`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        shipment_id: sel,
                        disruption_type: "Weather",
                        description: `Severe squall and flash flood warning on sector ${sel}`,
                        severity: "Critical",
                      }),
                    });
                  }}
                  className="flex-1 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[9px] font-semibold transition-all text-center"
                >
                  ⛈️ Inject Storm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoControls;
