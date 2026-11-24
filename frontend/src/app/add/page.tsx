"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MapComponent from "@/components/Map/MapComponent";

interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

export default function AddShipmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    origin: null as LocationResult | null,
    destination: null as LocationResult | null,
    cargo: "",
    value: 0,
    priority: "Standard",
  });

  const [searchTerms, setSearchTerms] = useState({ origin: "", destination: "" });
  const [searchResults, setSearchResults] = useState<{ origin: LocationResult[]; destination: LocationResult[] }>({ origin: [], destination: [] });
  const [activeIndexes, setActiveIndexes] = useState({ origin: -1, destination: -1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  // Debounced geocoding
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerms.origin.trim().length > 2) {
        try {
          const res = await fetch(`${apiBase}/geocoding/search?query=${encodeURIComponent(searchTerms.origin.trim())}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setSearchResults((prev) => ({ ...prev, origin: data }));
          setActiveIndexes((prev) => ({ ...prev, origin: -1 }));
        } catch (e) { console.error("Origin search error:", e); }
      } else {
        setSearchResults((prev) => ({ ...prev, origin: [] }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerms.origin]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerms.destination.trim().length > 2) {
        try {
          const res = await fetch(`${apiBase}/geocoding/search?query=${encodeURIComponent(searchTerms.destination.trim())}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setSearchResults((prev) => ({ ...prev, destination: data }));
          setActiveIndexes((prev) => ({ ...prev, destination: -1 }));
        } catch (e) { console.error("Destination search error:", e); }
      } else {
        setSearchResults((prev) => ({ ...prev, destination: [] }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerms.destination]);

  useEffect(() => {
    return () => { if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination) {
      alert("Please select both origin and destination.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { name: formData.origin.name, lat: formData.origin.lat, lng: formData.origin.lng },
          destination: { name: formData.destination.name, lat: formData.destination.lat, lng: formData.destination.lng },
          cargo: formData.cargo,
          value: formData.value,
          priority: formData.priority,
          mode: "trucking",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      setShowSuccess(true);
      redirectTimeoutRef.current = setTimeout(() => router.push("/"), 2000);
    } catch (error) {
      console.error("Failed to create shipment:", error);
      alert("Failed to create shipment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (field: "origin" | "destination", e: React.KeyboardEvent) => {
    const results = searchResults[field];
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndexes((prev) => ({ ...prev, [field]: Math.min(prev[field] + 1, results.length - 1) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndexes((prev) => ({ ...prev, [field]: Math.max(prev[field] - 1, 0) }));
    } else if (e.key === "Enter" && activeIndexes[field] >= 0) {
      e.preventDefault();
      setFormData({ ...formData, [field]: results[activeIndexes[field]] });
    } else if (e.key === "Escape") {
      setSearchResults((prev) => ({ ...prev, [field]: [] }));
    }
  };

  return (
    <div className="pt-16 min-h-screen">
      <div className="border-b border-white/[0.06] bg-surface-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <span className="text-[10px] font-mono text-slate-600">OPERATIONS / NEW SHIPMENT</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-6 animate-fade-in">
          New <span className="text-accent-400">Shipment</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="lg:col-span-2 card p-6 relative overflow-hidden">
            {showSuccess && (
              <div className="absolute inset-0 z-50 bg-teal-600/95 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm rounded-xl">
                <div className="w-12 h-12 rounded-full border-2 border-white/30 border-t-white animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Shipment Created</h3>
                <p className="text-white/60 text-sm">Redirecting to dashboard...</p>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Route Configuration</h2>
                <p className="text-[10px] text-slate-500">Define origin, destination, and cargo details</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origin */}
                <div className="space-y-1.5 relative">
                  <label className="label ml-1">Origin</label>
                  <input
                    type="text"
                    placeholder="Search city..."
                    className="w-full bg-surface-200 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all"
                    value={formData.origin ? formData.origin.name : searchTerms.origin}
                    onChange={(e) => { setFormData({ ...formData, origin: null }); setSearchTerms({ ...searchTerms, origin: e.target.value }); }}
                    onKeyDown={(e) => handleKeyDown("origin", e)}
                  />
                  {searchResults.origin.length > 0 && !formData.origin && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-surface-100 border border-white/[0.08] rounded-lg shadow-panel z-[60] overflow-hidden">
                      {searchResults.origin.map((r, i) => (
                        <div
                          key={i}
                          role="option"
                          aria-selected={i === activeIndexes.origin}
                          onClick={() => setFormData({ ...formData, origin: r })}
                          className={`px-4 py-2.5 text-xs cursor-pointer border-b border-white/[0.03] last:border-0 transition-colors ${
                            i === activeIndexes.origin ? "bg-accent-500/10 text-accent-400" : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
                          }`}
                        >
                          {r.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination */}
                <div className="space-y-1.5 relative">
                  <label className="label ml-1">Destination</label>
                  <input
                    type="text"
                    placeholder="Search city..."
                    className="w-full bg-surface-200 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all"
                    value={formData.destination ? formData.destination.name : searchTerms.destination}
                    onChange={(e) => { setFormData({ ...formData, destination: null }); setSearchTerms({ ...searchTerms, destination: e.target.value }); }}
                    onKeyDown={(e) => handleKeyDown("destination", e)}
                  />
                  {searchResults.destination.length > 0 && !formData.destination && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-surface-100 border border-white/[0.08] rounded-lg shadow-panel z-[60] overflow-hidden">
                      {searchResults.destination.map((r, i) => (
                        <div
                          key={i}
                          role="option"
                          aria-selected={i === activeIndexes.destination}
                          onClick={() => setFormData({ ...formData, destination: r })}
                          className={`px-4 py-2.5 text-xs cursor-pointer border-b border-white/[0.03] last:border-0 transition-colors ${
                            i === activeIndexes.destination ? "bg-accent-500/10 text-accent-400" : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
                          }`}
                        >
                          {r.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label ml-1">Cargo Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electronics, Textiles..."
                    className="w-full bg-surface-200 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500/50 outline-none transition-all"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label ml-1">Priority</label>
                  <select
                    className="w-full bg-surface-200 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-500/30"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Standard">Standard</option>
                    <option value="High">High (Urgent)</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label ml-1">Estimated Value (USD)</label>
                <input
                  type="number"
                  required
                  placeholder="25000"
                  className="w-full bg-surface-200 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-accent-500/30"
                  value={formData.value || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setFormData({ ...formData, value: raw === "" ? 0 : parseFloat(raw) || 0 });
                  }}
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-white/[0.06]">
                <button type="button" onClick={() => router.back()} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create Shipment"}
                </button>
              </div>
            </form>
          </div>

          {/* Right side */}
          <div className="space-y-4">
            <div className="card h-[400px] relative overflow-hidden">
              <div className="absolute top-3 left-3 z-10 bg-surface-100/90 backdrop-blur px-3 py-1.5 rounded-lg border border-white/[0.06]">
                <p className="text-[9px] font-mono text-accent-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse-dot" />
                  ROUTE PREVIEW
                </p>
              </div>
              {MAPBOX_TOKEN ? (
                <MapComponent
                  accessToken={MAPBOX_TOKEN}
                  shipments={[]}
                  risks={[]}
                  routeGeoJSON={formData.origin && formData.destination ? {
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: [
                        [formData.origin.lng, formData.origin.lat],
                        [formData.destination.lng, formData.destination.lat],
                      ],
                    },
                    properties: {},
                  } : null}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs text-slate-600">Map Offline</p>
                </div>
              )}
            </div>

            <div className="card p-5 border-l-2 border-accent-500/40">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h4 className="text-xs font-semibold text-white">AI Route Analysis</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Once created, TransitIQ&apos;s ML engine will continuously monitor this route for weather, traffic, and risk factors — automatically suggesting optimized alternatives when disruptions are detected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
