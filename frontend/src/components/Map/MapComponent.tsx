"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapComponentProps {
  accessToken: string;
  shipments?: any[];
  risks?: any[];
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  accessToken, 
  shipments = [], 
  risks = [] 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11", // Premium Light theme
      center: [-74.006, 40.7128], // Initial center (NY)
      zoom: 3,
      antialias: true
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      // Add source for routes if needed
      if (!map.current) return;
      
      // Example visual flair: Add a subtle glow/overlay
      map.current.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15
        }
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [accessToken]);

  // Update Markers when shipments change
  useEffect(() => {
    if (!map.current) return;
    
    // Clear existing markers (Basic implementation for Hackathon)
    shipments.forEach((shp) => {
        const el = document.createElement('div');
        el.className = 'shipment-marker group cursor-pointer relative';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';

        const color = shp.risk_score > 0.7 ? '#ef4444' : (shp.status === 'Rerouted' ? '#10b981' : '#3b82f6');
        
        // Inner core
        const core = document.createElement('div');
        core.style.width = '12px';
        core.style.height = '12px';
        core.style.borderRadius = '50%';
        core.style.backgroundColor = color;
        core.style.border = '2px solid white';
        core.style.boxShadow = `0 0 10px ${color}`;
        core.style.zIndex = '2';

        // Outer pulse
        const pulse = document.createElement('div');
        pulse.className = 'animate-pulse-glow';
        pulse.style.position = 'absolute';
        pulse.style.inset = '0';
        pulse.style.borderRadius = '50%';
        pulse.style.backgroundColor = color;
        pulse.style.opacity = '0.3';

        el.appendChild(core);
        el.appendChild(pulse);
        
        new mapboxgl.Marker(el)
            .setLngLat([shp.current_location.lng, shp.current_location.lat])
            .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false, className: 'premium-popup' })
                .setHTML(`
                    <div class="p-3 font-sans min-w-[140px]">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset ID: ${shp.id}</p>
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-xs font-black text-slate-900 uppercase">${shp.status}</p>
                            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></span>
                        </div>
                        <div class="h-[1px] bg-slate-100 my-2"></div>
                        <p class="text-[10px] text-slate-500 font-medium">Risk Intensity: <span class="font-bold text-slate-900">${(shp.risk_score * 100).toFixed(0)}%</span></p>
                    </div>
                `))
            .addTo(map.current!);
    });
  }, [shipments]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      <div className="absolute top-4 left-4 glass p-3 z-10 pointer-events-none">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active View</p>
          <p className="text-xs font-bold text-slate-900">Maritime & Trucking Aggregate</p>
      </div>
    </div>
  );
};

export default MapComponent;
