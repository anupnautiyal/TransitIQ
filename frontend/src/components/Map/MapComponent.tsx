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
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11", // Premium Light theme
      center: [78.9629, 20.5937], // Center over India
      zoom: 4.5,
      antialias: true
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current) return;
      
      // Initialize Heatmap Data Source
      map.current.addSource('risk-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
      });

      // Add Heatmap Layer
      map.current.addLayer({
        id: 'risk-heat',
        type: 'heatmap',
        source: 'risk-data',
        maxzoom: 9,
        paint: {
            'heatmap-weight': ['get', 'severity'],
            'heatmap-intensity': [
                'interpolate', ['linear'], ['zoom'],
                0, 1,
                9, 3
            ],
            'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgb(103,169,207)',
                0.4, 'rgb(209,229,240)',
                0.6, 'rgb(253,219,199)',
                0.8, 'rgb(239,138,98)',
                1, 'rgb(255,0,0)'
            ],
            'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                0, 20,
                9, 60
            ],
            'heatmap-opacity': [
                'interpolate', ['linear'], ['zoom'],
                7, 1,
                9, 0.5
            ]
        }
      });

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

  // Update Markers and Heatmap when data changes
  useEffect(() => {
    if (!map.current) return;
    
    // Update Heatmap Source
    const riskSource = map.current.getSource('risk-data') as mapboxgl.GeoJSONSource;
    if (riskSource && risks && risks.length > 0) {
        riskSource.setData({
            type: 'FeatureCollection',
            features: risks.map(r => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [r.location?.lng || 0, r.location?.lat || 0]
                },
                properties: {
                    severity: r.severity === 'High' ? 1.0 : 0.5
                }
            }))
        });
    }

    // Clear existing markers securely
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

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
        
        const marker = new mapboxgl.Marker(el)
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
            
        markersRef.current.push(marker);
    });
  }, [shipments, risks]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
      <div className="absolute top-32 left-4 glass p-3 z-10 pointer-events-none">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active View</p>
          <p className="text-xs font-bold text-slate-900">National Roadways Network</p>
      </div>
    </div>
  );
};

export default MapComponent;
