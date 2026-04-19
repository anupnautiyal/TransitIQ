"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddShipmentPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        origin: '',
        destination: '',
        cargo: '',
        value: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would POST to the backend
        alert(`Simulated: Shipment created from ${formData.origin} to ${formData.destination}`);
        router.push('/');
    };

    return (
        <div className="min-h-screen pt-48 pb-20 px-6 lg:px-10 relative z-10">
            {/* Background Decorations */}
            <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-200/20 rounded-full blur-[120px] -z-10" />

            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="mb-12">
                    <h1 className="font-display font-black text-4xl md:text-5xl text-slate-900 tracking-tight mb-4">
                        New <span className="text-brand-600">Consignment</span>
                    </h1>
                    <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
                        Initialize a new roadway trucking route across the India Logistics Network. AI will automatically calculate the optimal starting path.
                    </p>
                </div>

                <div className="glass-panel p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-slate-900">Transit Parameters</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialization Protocol 4.2</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="text-[11px] uppercase tracking-widest font-black text-slate-500 ml-1">Origin Node (India)</label>
                                <div className="relative">
                                    <select 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all appearance-none"
                                        value={formData.origin}
                                        onChange={e => setFormData({...formData, origin: e.target.value})}
                                    >
                                        <option value="" disabled>Select Entry Point</option>
                                        <option value="Delhi">New Delhi Logistics Hub</option>
                                        <option value="Mumbai">Mumbai Maritime Terminal</option>
                                        <option value="Chennai">Chennai Industrial Zone</option>
                                        <option value="Kolkata">Kolkata Gateway</option>
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] uppercase tracking-widest font-black text-slate-500 ml-1">Destination Node (India)</label>
                                <div className="relative">
                                    <select 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all appearance-none"
                                        value={formData.destination}
                                        onChange={e => setFormData({...formData, destination: e.target.value})}
                                    >
                                        <option value="" disabled>Select Exit Point</option>
                                        <option value="Bangalore">Bangalore Tech Park</option>
                                        <option value="Hyderabad">Hyderabad Pharma City</option>
                                        <option value="Pune">Pune Automotive Cluster</option>
                                        <option value="Ahmedabad">Ahmedabad Hub</option>
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] uppercase tracking-widest font-black text-slate-500 ml-1">Asset Classification</label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. Pharmaceutical Synthetics - Grade A"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all hover:bg-white"
                                value={formData.cargo}
                                onChange={e => setFormData({...formData, cargo: e.target.value})}
                            />
                        </div>

                        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
                            <button 
                                type="button" 
                                onClick={() => router.back()} 
                                className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all"
                            >
                                Abort Initialization
                            </button>
                            <button 
                                type="submit" 
                                className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-1 active:translate-y-0"
                            >
                                Deploy Transit Instance
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
