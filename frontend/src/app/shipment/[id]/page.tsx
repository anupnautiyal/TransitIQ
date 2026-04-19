"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RerouteDialog from "@/components/Intelligence/RerouteDialog";
import MapComponent from "@/components/Map/MapComponent";

export default function ShipmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [shipment, setShipment] = useState<any>(null);
    const [progress, setProgress] = useState(0);
    const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [routeData, setRouteData] = useState<any>(null);
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    useEffect(() => {
        // Fetch specific shipment. For now, fetch all and filter by ID.
        fetch('http://localhost:8000/shipments')
            .then(res => res.json())
            .then(data => {
                const found = data.find((s: any) => s.id === params.id);
                setShipment(found);
                
                // Fetch current route
                if (found) {
                     fetch(`http://localhost:8000/shipments/${found.id}/route`)
                        .then(r => r.json())
                        .then(rData => {
                             if (rData.path_data) {
                                 setRouteData(rData.path_data);
                             }
                        }).catch(e => console.error("Error fetching route", e));
                }
            })
            .catch(err => console.error("Error fetching shipment", err));
    }, [params.id]);

    useEffect(() => {
        if (!shipment) return;
        const targetProgress = shipment.status === 'delayed' ? 45 : 66; 
        
        const timer = setTimeout(() => {
            setProgress(targetProgress);
        }, 800);
        
        return () => { clearTimeout(timer); };
    }, [shipment]);

    const handleReviewReroute = async () => {
        if (!shipment) return;
        setIsCalculating(true);
        try {
            const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${BASE_URL}/shipments/${shipment.id}/reroute`, { method: "POST" });
            const data = await res.json();
            setActiveRecommendation(data);
        } catch (e) {
            console.error("Failed to fetch reroute recommendation", e);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleExecuteReroute = async () => {
        if (!shipment) return;
        try {
            const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${BASE_URL}/shipments/${shipment.id}/execute`, { method: "POST" });
            setShipment({ ...shipment, status: "Rerouted", risk_score: 0.1 });
            
            if (activeRecommendation?.recommended_route?.path_data) {
                 const newRouteData = activeRecommendation.recommended_route.path_data;
                 newRouteData.properties = { isOptimized: true }; 
                 setRouteData({ ...newRouteData }); 
            }
            
            setActiveRecommendation(null);
        } catch (e) {
            console.error("Failed to execute reroute", e);
        }
    };

    if (!shipment) return (
        <div className="min-h-screen pt-48 px-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Telemetry...</p>
            </div>
        </div>
    );

    const isDelayed = shipment.status === 'delayed';

    return (
        <div className="min-h-screen pt-48 pb-20 px-6 lg:px-10 relative max-w-[1600px] mx-auto overflow-x-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-20 left-0 w-[600px] h-[600px] bg-brand-200/20 rounded-full blur-[120px] -z-10" />

            <div className="animate-fade-in">
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                            Live Asset Telemetry
                        </p>
                        <h1 className="font-display font-black text-4xl md:text-6xl text-slate-900 tracking-tight leading-none tabular-nums">
                            {shipment.id}
                        </h1>
                    </div>
                    <div className={`px-8 py-3 rounded-2xl border-2 flex items-center gap-3 shadow-sm ${isDelayed ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${isDelayed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{shipment.status.replace('_', ' ')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Immersive Map Module */}
                    <div className="glass-panel p-2 col-span-2 shadow-soft h-[550px] relative">
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative border border-slate-100/50">
                            {MAPBOX_TOKEN ? (
                                <MapComponent 
                                    accessToken={MAPBOX_TOKEN} 
                                    shipments={[shipment]}
                                    routeGeoJSON={routeData}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                    <p className="font-display font-bold text-slate-400">Map Interface Offline</p>
                                </div>
                            )}

                            {/* Map UI Overlay */}
                            <div className="absolute top-6 left-6 flex flex-col gap-3">
                                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white shadow-lg flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Real-time GPS Uplink</span>
                                </div>
                                <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-white shadow-lg space-y-3 w-48">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Origin</span>
                                        <span className="text-[10px] font-black text-slate-900">{shipment.origin.name}</span>
                                    </div>
                                    <div className="w-full h-[1px] bg-slate-100"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Dest.</span>
                                        <span className="text-[10px] font-black text-slate-900">{shipment.destination.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Intelligence Module */}
                    <div className="glass-panel p-8 shadow-soft flex flex-col">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prediction Engine</h3>
                            <span className="text-[8px] font-black px-2 py-0.5 bg-brand-50 text-brand-600 rounded">v.4.1</span>
                        </div>
                        
                        {isDelayed ? (
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-6xl font-display font-black text-red-500 tracking-tighter tabular-nums">+3.2h</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Projected Latency Offset</p>
                                    </div>
                                    <div className="p-5 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Anomaly Detected</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                                            "Dynamic traffic density patterns on National Highway-48 suggest severe saturation. System recommends immediate vector realignment."
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleReviewReroute}
                                    disabled={isCalculating}
                                    className={`w-full text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-lg mt-8 ${isCalculating ? 'bg-slate-300' : 'bg-slate-900 hover:bg-brand-600 hover:shadow-brand-500/30'}`}
                                >
                                    {isCalculating ? 'Computing Optimal Nodes...' : 'Execute Vector Rerouting'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse-glow"></div>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Systems Nominal</h4>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                                    Route stability within high-confidence intervals. No disruptive events detected.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Logs Module */}
                <div className="glass-panel p-8 shadow-soft">
                     <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telemetry Event Stream</h3>
                        <div className="flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Stable Link</span>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-2xl group hover:border-brand-200 transition-colors">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors">
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-black text-slate-800">Speed Anomaly Resolved</span>
                                     <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Automated Intelligence Node</span>
                                 </div>
                             </div>
                             <span className="text-[10px] font-black text-slate-300 tabular-nums">10:42:15</span>
                         </div>
                         <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-2xl group hover:border-brand-200 transition-colors">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors">
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-black text-slate-800">Crossed Checkpoint Alpha</span>
                                     <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Asset Telemetry Update</span>
                                 </div>
                             </div>
                             <span className="text-[10px] font-black text-slate-300 tabular-nums">08:15:00</span>
                         </div>
                     </div>
                </div>
            </div>

            {activeRecommendation && (
                <RerouteDialog 
                    shipment={shipment}
                    recommendation={activeRecommendation}
                    onExecute={handleExecuteReroute}
                    onClose={() => setActiveRecommendation(null)}
                />
            )}
        </div>
    );
}
