"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RerouteDialog from "@/components/Intelligence/RerouteDialog";

export default function ShipmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [shipment, setShipment] = useState<any>(null);
    const [progress, setProgress] = useState(0);
    const [activeRecommendation, setActiveRecommendation] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        // Fetch specific shipment. For now, fetch all and filter by ID.
        fetch('http://localhost:8000/shipments')
            .then(res => res.json())
            .then(data => {
                const found = data.find((s: any) => s.id === params.id);
                setShipment(found);
            })
            .catch(err => console.error("Error fetching shipment", err));
    }, [params.id]);

    useEffect(() => {
        if (!shipment) return;
        const targetProgress = shipment.status === 'delayed' ? 45 : 66; // Halts halfway if delayed, moves to 2/3 if on track
        
        // Simulating live data ping
        const timer = setTimeout(() => {
            setProgress(targetProgress);
        }, 800);
        
        // Simulating interactive telemetry
        const interval = setInterval(() => {
            // Live sync pulse logic can be tied to real backend ws
        }, 3000);

        return () => { clearTimeout(timer); clearInterval(interval); };
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
            setActiveRecommendation(null);
        } catch (e) {
            console.error("Failed to execute reroute", e);
        }
    };

    if (!shipment) return <div className="min-h-screen bg-[#FEFEFE] pt-48 px-8 flex items-center justify-center"><p className="text-slate-400 font-bold uppercase animate-pulse">Loading Telemetry...</p></div>;

    const isDelayed = shipment.status === 'delayed';

    return (
        <div className="min-h-screen bg-[#FEFEFE] pt-48 pb-12 px-8">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => router.back()} className="mb-8 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 uppercase tracking-widest">
                    &larr; Back to Control Tower
                </button>

                <div className="mb-10 flex items-end justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Trucking Consignment</p>
                        <h1 className="font-serif text-5xl text-slate-900 tracking-tight">{shipment.id}</h1>
                    </div>
                    <div className={`px-6 py-2 rounded-full border ${isDelayed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        <span className="text-sm font-black uppercase tracking-widest">{shipment.status.replace('_', ' ')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Telemetry Overview */}
                    <div className="glass p-8 rounded-3xl col-span-2 shadow-lg border border-slate-100 flex flex-col justify-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Route Timeline</h3>
                        
                        <div className="relative flex items-center justify-between mt-8 mb-4">
                            {/* Line connecting nodes */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
                            
                            {/* Animated Progress Line */}
                            <div 
                                className={`absolute top-1/2 left-0 h-1 -z-10 -translate-y-1/2 rounded-full transition-all duration-[3000ms] ease-out ${isDelayed ? 'bg-orange-400' : 'bg-blue-600'}`}
                                style={{ width: `${progress}%` }}
                            ></div>

                            {/* Origin */}
                            <div className="flex flex-col items-center">
                                <div className="w-6 h-6 rounded-full bg-blue-600 border-4 border-white shadow-md"></div>
                                <p className="mt-3 text-sm font-bold text-slate-800">{shipment.origin.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Origin</p>
                            </div>

                            {/* Current Position */}
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center animate-pulse ${isDelayed ? 'bg-red-500' : 'bg-blue-600'}`}>
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                                <p className="mt-3 text-sm font-bold text-slate-800">{shipment.current_location.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Current</p>
                            </div>

                            {/* Destination */}
                            <div className="flex flex-col items-center">
                                <div className="w-6 h-6 rounded-full bg-slate-200 border-4 border-white shadow-md"></div>
                                <p className="mt-3 text-sm font-bold text-slate-800">{shipment.destination.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Destination</p>
                            </div>
                        </div>
                    </div>

                    {/* Delay Prediction Engine */}
                    <div className="glass p-8 rounded-3xl shadow-lg border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">AI Prediction</h3>
                        {isDelayed ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-4xl font-light text-red-500 mb-1">+3.2h</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Delay</p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-orange-800 mb-2">Primary Factor: Traffic Congestion</p>
                                    <p className="text-[10px] text-orange-600/80 leading-relaxed font-medium">System detects a major throughput anomaly on national highway ahead. Recommended action: Dynamic Rerouting.</p>
                                </div>
                                <button 
                                    onClick={handleReviewReroute}
                                    disabled={isCalculating}
                                    className={`w-full text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl transition-colors shadow-lg ${isCalculating ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-blue-600'}`}
                                >
                                    {isCalculating ? 'Computing Vector...' : 'Calculate Alternate Route'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 flex flex-col items-center justify-center h-full pb-8">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse-glow"></div>
                                </div>
                                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Optimal Path Maintained</p>
                                <p className="text-[10px] text-slate-400 font-semibold text-center mt-2 px-4">No significant anomalies detected in route forward vector.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass p-8 rounded-3xl shadow-lg border border-slate-100 relative overflow-hidden">
                     <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-50 border-b border-l border-emerald-100 rounded-bl-xl flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-glow"></div>
                         <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Live Sync</span>
                     </div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">GPS Telemetry Log</h3>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                             <div className="flex flex-col gap-1">
                                 <span className="text-xs font-bold text-slate-800">Speed Anomaly Resolved</span>
                                 <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">System Notification</span>
                             </div>
                             <span className="text-[10px] font-black text-slate-400 font-mono">10:42 AM</span>
                         </div>
                         <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                             <div className="flex flex-col gap-1">
                                 <span className="text-xs font-bold text-slate-800">Crossed Checkpoint Alpha</span>
                                 <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Location Update</span>
                             </div>
                             <span className="text-[10px] font-black text-slate-400 font-mono">08:15 AM</span>
                         </div>
                     </div>
                </div>
            </div>

            {/* Reroute Dialog Portal */}
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
