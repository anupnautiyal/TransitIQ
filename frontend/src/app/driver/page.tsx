"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchShipments } from "@/lib/api";

export default function DriverPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [tracking, setTracking] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("Ready to transmit");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchShipments().then((data) => {
      setShipments(data);
      if (data.length > 0) setSelectedTruck(data[0].id);
    });
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 8)]);
  };

  const transmitLocation = useCallback(async (lat: number, lng: number) => {
    if (!selectedTruck) return;
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE_URL}/driver/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id: selectedTruck,
          lat,
          lng,
        }),
      });
      if (res.ok) {
        addLog(`Transmitted GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} to ${selectedTruck}`);
        setStatusMsg("Live Telemetry Active");
      }
    } catch (e) {
      addLog("Transmission error to backend");
      setStatusMsg("Transmission Error");
    }
  }, [selectedTruck]);

  useEffect(() => {
    let watchId: number | null = null;
    if (tracking) {
      if ("geolocation" in navigator) {
        setStatusMsg("Acquiring GPS Signal...");
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            transmitLocation(latitude, longitude);
          },
          (err) => {
            setStatusMsg(`GPS Error: ${err.message}`);
            addLog(`Location error: ${err.message}`);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      } else {
        setStatusMsg("Geolocation not supported by device");
      }
    } else {
      setStatusMsg("Tracking paused");
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [tracking, transmitLocation]);

  const activeShipment = shipments.find((s) => s.id === selectedTruck);

  return (
    <div className="pt-20 min-h-screen max-w-xl mx-auto px-4 pb-12">
      <div className="card p-6 border-accent-500/20 shadow-panel">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="badge-teal mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
              Mobile Driver Beacon
            </div>
            <h1 className="text-xl font-bold text-white">Driver Terminal</h1>
          </div>
          <span className="text-[10px] font-mono text-slate-500">OBD-II VIRTUAL</span>
        </div>

        {/* Truck Selector */}
        <div className="space-y-2 mb-6">
          <label className="label">Select Assigned Asset</label>
          <select
            value={selectedTruck}
            onChange={(e) => setSelectedTruck(e.target.value)}
            disabled={tracking}
            className="w-full bg-surface-200 border border-white/[0.06] rounded-lg p-3 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-accent-500/40"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.origin?.name} → {s.destination?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Truck Status Card */}
        {activeShipment && (
          <div className="bg-surface-200/50 p-4 rounded-xl border border-white/[0.04] mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Cargo:</span>
              <span className="text-xs font-semibold text-white">{activeShipment.cargo_type}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Status:</span>
              <span className="badge badge-accent uppercase text-[9px]">
                {activeShipment.status.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Risk Score:</span>
              <span className={`text-xs font-mono font-bold ${activeShipment.risk_score > 0.7 ? "text-red-400" : "text-teal-400"}`}>
                {(activeShipment.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* GPS Control Button */}
        <div className="space-y-4">
          <button
            onClick={() => setTracking(!tracking)}
            className={`w-full py-4 rounded-xl font-semibold text-sm transition-all shadow-glow-accent flex items-center justify-center gap-2 ${
              tracking
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-accent-600 hover:bg-accent-500 text-white"
            }`}
          >
            {tracking ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse-dot" />
                Stop Live Transmit
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Stream Phone GPS as Truck Location
              </>
            )}
          </button>

          <p className="text-center text-xs font-mono text-slate-400">{statusMsg}</p>

          {currentCoords && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-center">
              <p className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">Phone Satellite Fix</p>
              <p className="text-sm font-mono font-bold text-white mt-0.5">
                {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Transmission Log Stream */}
        <div className="mt-6 pt-4 border-t border-white/[0.06]">
          <span className="label mb-2 block">Telemetry Uplink Log</span>
          <div className="bg-surface-50 p-3 rounded-lg border border-white/[0.04] h-32 overflow-y-auto space-y-1 font-mono text-[10px]">
            {logs.length === 0 ? (
              <span className="text-slate-600 italic">No packets sent yet</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="text-slate-400">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
