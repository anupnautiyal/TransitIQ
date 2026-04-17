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
        <div className="min-h-screen bg-[#FEFEFE] pt-40 pb-12 px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10">
                    <h1 className="font-serif text-5xl text-slate-900 tracking-tight mb-4">New Consignment</h1>
                    <p className="text-slate-500 font-medium">Initialize a new roadway trucking route across the India Logistics Network.</p>
                </div>

                <div className="glass p-10 rounded-3xl shadow-xl border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Origin City (India)</label>
                                <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.origin}
                                    onChange={e => setFormData({...formData, origin: e.target.value})}
                                >
                                    <option value="" disabled>Select Origin</option>
                                    <option value="Delhi">New Delhi</option>
                                    <option value="Mumbai">Mumbai</option>
                                    <option value="Chennai">Chennai</option>
                                    <option value="Kolkata">Kolkata</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Destination City (India)</label>
                                <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.destination}
                                    onChange={e => setFormData({...formData, destination: e.target.value})}
                                >
                                    <option value="" disabled>Select Destination</option>
                                    <option value="Bangalore">Bangalore</option>
                                    <option value="Hyderabad">Hyderabad</option>
                                    <option value="Pune">Pune</option>
                                    <option value="Ahmedabad">Ahmedabad</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Cargo Type</label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. Pharmaceutical Synthetics"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.cargo}
                                onChange={e => setFormData({...formData, cargo: e.target.value})}
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                            <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg hover:shadow-blue-500/30">
                                Initialize Transit Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
