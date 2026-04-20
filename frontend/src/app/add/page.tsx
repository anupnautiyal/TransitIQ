"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
        cargo: '',
        value: 0,
        priority: 'Standard'
    });

    const [searchTerms, setSearchTerms] = useState({ origin: '', destination: '' });
    const [searchResults, setSearchResults] = useState<{ origin: LocationResult[], destination: LocationResult[] }>({ origin: [], destination: [] });
    const [activeIndexes, setActiveIndexes] = useState({ origin: -1, destination: -1 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Refs for redirection timeout cleanup
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    // Debounced geocoding search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerms.origin.trim().length > 2) {
                try {
                    const encodedQuery = encodeURIComponent(searchTerms.origin.trim());
                    const res = await fetch(`${apiBase}/geocoding/search?query=${encodedQuery}`);
                    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
                    const data = await res.json();
                    setSearchResults(prev => ({ ...prev, origin: data }));
                    setActiveIndexes(prev => ({ ...prev, origin: -1 }));
                } catch (error) {
                    console.error("Origin search error:", error);
                }
            } else {
                setSearchResults(prev => ({ ...prev, origin: [] }));
                setActiveIndexes(prev => ({ ...prev, origin: -1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerms.origin]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerms.destination.trim().length > 2) {
                try {
                    const encodedQuery = encodeURIComponent(searchTerms.destination.trim());
                    const res = await fetch(`${apiBase}/geocoding/search?query=${encodedQuery}`);
                    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
                    const data = await res.json();
                    setSearchResults(prev => ({ ...prev, destination: data }));
                    setActiveIndexes(prev => ({ ...prev, destination: -1 }));
                } catch (error) {
                    console.error("Destination search error:", error);
                }
            } else {
                setSearchResults(prev => ({ ...prev, destination: [] }));
                setActiveIndexes(prev => ({ ...prev, destination: -1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerms.destination]);

    // Cleanup effects on unmount
    useEffect(() => {
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.origin || !formData.destination) {
            alert("Protocol Error: Origin and Destination coordinates must be validated.");
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${apiBase}/shipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: { name: formData.origin.name, lat: formData.origin.lat, lng: formData.origin.lng },
                    destination: { name: formData.destination.name, lat: formData.destination.lat, lng: formData.destination.lng },
                    cargo: formData.cargo,
                    value: formData.value,
                    priority: formData.priority,
                    mode: 'trucking'
                })
            });

            if (!response.ok) throw new Error("Deployment failed");
            
            const result = await response.json();
            console.log("Shipment deployed:", result);
            setShowSuccess(true);
            redirectTimeoutRef.current = setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error) {
            console.error("Failed to deploy shipment:", error);
            alert("Protocol Violation: Could not establish transit instance.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-52 pb-32 min-h-screen relative w-full max-w-[1700px] mx-auto px-8 lg:px-12">
            {/* Background Orbs for extra premium feel */}
            <div className="absolute top-40 left-10 w-[500px] h-[500px] bg-brand-200/40 rounded-full blur-[120px] -z-10" />
            <div className="absolute top-96 right-20 w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-[100px] -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 glass-panel p-8 md:p-12 relative overflow-hidden h-fit">
                    {showSuccess && (
                        <div className="absolute inset-0 z-50 bg-brand-600/95 flex flex-col items-center justify-center text-white animate-fade-in backdrop-blur-sm">
                            <div className="w-20 h-20 rounded-full border-4 border-white/30 border-t-white animate-spin mb-6" />
                            <h3 className="text-2xl font-display font-black uppercase tracking-widest mb-2">Uplink Established</h3>
                            <p className="text-white/60 font-medium tracking-tight">Synchronizing Transit Instance to Global Network...</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-slate-900 text-lg">Transit Parameters</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Command Interface v4.5</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2 relative">
                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Path Initiation (Origin)</label>
                                <input 
                                    type="text"
                                    placeholder="Search Node..."
                                    aria-autocomplete="list"
                                    aria-controls="origin-results"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                    value={formData.origin ? formData.origin.name : searchTerms.origin}
                                    onChange={e => {
                                        setFormData({ ...formData, origin: null });
                                        setSearchTerms({ ...searchTerms, origin: e.target.value });
                                    }}
                                    onKeyDown={(e) => {
                                        const results = searchResults.origin;
                                        if (results.length === 0) return;
                                        
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActiveIndexes(prev => ({ ...prev, origin: Math.min(prev.origin + 1, results.length - 1) }));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActiveIndexes(prev => ({ ...prev, origin: Math.max(prev.origin - 1, 0) }));
                                        } else if (e.key === 'Enter' && activeIndexes.origin >= 0) {
                                            e.preventDefault();
                                            setFormData({ ...formData, origin: results[activeIndexes.origin] });
                                        } else if (e.key === 'Escape') {
                                            setSearchResults(prev => ({ ...prev, origin: [] }));
                                            setActiveIndexes(prev => ({ ...prev, origin: -1 }));
                                        }
                                    }}
                                />
                                {searchResults.origin.length > 0 && !formData.origin && (
                                    <div id="origin-results" role="listbox" className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden">
                                        {searchResults.origin.map((r, i) => (
                                            <div 
                                                key={i} 
                                                role="option"
                                                aria-selected={i === activeIndexes.origin}
                                                tabIndex={0}
                                                onClick={() => setFormData({ ...formData, origin: r })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setFormData({ ...formData, origin: r });
                                                    }
                                                }}
                                                className={`px-5 py-3 text-xs font-bold cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                                                    i === activeIndexes.origin ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
                                                }`}
                                            >
                                                {r.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Path Termination (Destination)</label>
                                <input 
                                    type="text"
                                    placeholder="Search Node..."
                                    aria-autocomplete="list"
                                    aria-controls="destination-results"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                    value={formData.destination ? formData.destination.name : searchTerms.destination}
                                    onChange={e => {
                                        setFormData({ ...formData, destination: null });
                                        setSearchTerms({ ...searchTerms, destination: e.target.value });
                                    }}
                                    onKeyDown={(e) => {
                                        const results = searchResults.destination;
                                        if (results.length === 0) return;
                                        
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActiveIndexes(prev => ({ ...prev, destination: Math.min(prev.destination + 1, results.length - 1) }));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActiveIndexes(prev => ({ ...prev, destination: Math.max(prev.destination - 1, 0) }));
                                        } else if (e.key === 'Enter' && activeIndexes.destination >= 0) {
                                            e.preventDefault();
                                            setFormData({ ...formData, destination: results[activeIndexes.destination] });
                                        } else if (e.key === 'Escape') {
                                            setSearchResults(prev => ({ ...prev, destination: [] }));
                                            setActiveIndexes(prev => ({ ...prev, destination: -1 }));
                                        }
                                    }}
                                />
                                {searchResults.destination.length > 0 && !formData.destination && (
                                    <div id="destination-results" role="listbox" className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] overflow-hidden">
                                        {searchResults.destination.map((r, i) => (
                                            <div 
                                                key={i} 
                                                role="option"
                                                aria-selected={i === activeIndexes.destination}
                                                tabIndex={0}
                                                onClick={() => setFormData({ ...formData, destination: r })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setFormData({ ...formData, destination: r });
                                                    }
                                                }}
                                                className={`px-5 py-3 text-xs font-bold cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                                                    i === activeIndexes.destination ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-600'
                                                }`}
                                            >
                                                {r.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Asset Classification</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. Pharmaceutical Synthetics"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800"
                                    value={formData.cargo}
                                    onChange={e => setFormData({...formData, cargo: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Instance Priority</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none"
                                    value={formData.priority}
                                    onChange={e => setFormData({...formData, priority: e.target.value})}
                                >
                                    <option value="Standard">Standard</option>
                                    <option value="High">High (Urgent)</option>
                                    <option value="Critical">Critical (Real-time)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Estimated Asset Value (USD)</label>
                            <input 
                                type="number"
                                required
                                placeholder="25000"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none"
                                value={formData.value || ''}
                                onChange={e => {
                                    const rawValue = e.target.value;
                                    if (rawValue === '') {
                                        setFormData({...formData, value: 0});
                                        return;
                                    }
                                    const parsed = parseFloat(rawValue);
                                    setFormData({...formData, value: isNaN(parsed) ? 0 : parsed});
                                }}
                            />
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-4 border-t border-slate-50">
                            <button type="button" onClick={() => router.back()} className="px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                                Abort
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Establishing Uplink...' : 'Initialize Instance'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel h-[500px] relative overflow-hidden rounded-[2rem] border-2 border-white shadow-2xl">
                         <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                             <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                                Live Route Preview
                             </p>
                         </div>
                         {MAPBOX_TOKEN ? (
                            <MapComponent 
                                accessToken={MAPBOX_TOKEN}
                                shipments={[]}
                                risks={[]}
                                routeGeoJSON={formData.origin && formData.destination ? {
                                    type: 'Feature',
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [
                                            [formData.origin.lng, formData.origin.lat],
                                            [formData.destination.lng, formData.destination.lat]
                                        ]
                                    },
                                    properties: {}
                                } : null}
                            />
                         ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 font-display font-bold text-xs uppercase italic">Map Core Offline</div>
                         )}
                    </div>

                    <div className="glass-panel p-8 border-l-4 border-brand-500 bg-white/90">
                         <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">AI Deployment Insight</h4>
                         </div>
                         <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Once initialized, the Intelligence Agent will perform real-time sensor fusion on this route. If disruptions are detected, optimized rerouting recommendations will be issued automatically using our advanced ensemble risk models.
                         </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
