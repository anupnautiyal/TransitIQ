"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapComponentProps {
  accessToken: string;
  shipments?: any[];
  risks?: any[];
  routeGeoJSON?: any;
  selectedShipment?: any;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  accessToken, 
  shipments = [], 
  risks = [],
  routeGeoJSON = null,
  selectedShipment = null
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

      // Add Route Layer source
      map.current.addSource('route-data', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      // Add Route Layer
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-data',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6', // Blueprint line
          'line-width': 4,
          'line-opacity': 0.8
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

  // Persistent marker references keyed by shipment ID
  const markersMap = useRef<{[key: string]: mapboxgl.Marker}>({});

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

    // Update Route Source
    const routeSource = map.current.getSource('route-data') as mapboxgl.GeoJSONSource;
    if (routeSource) {
        if (routeGeoJSON) {
            routeSource.setData(routeGeoJSON);
            const isOptimized = routeGeoJSON?.properties?.isOptimized;
            map.current.setPaintProperty('route-line', 'line-color', isOptimized ? '#10b981' : '#3b82f6');
            
            try {
                const coordinates = routeGeoJSON.geometry.coordinates;
                if (coordinates && coordinates.length > 0) {
                    const bounds = coordinates.reduce(function(bounds: mapboxgl.LngLatBounds, coord: any) {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                    map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
                }
            } catch (e) {}
        } else {
            routeSource.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [] }
            });
        }
    }

    // Sync shipments markers
    const currentIds = new Set(shipments.map(s => s.id));
    
    // Remove markers for shipments that no longer exist
    Object.keys(markersMap.current).forEach(id => {
        if (!currentIds.has(id)) {
            markersMap.current[id].remove();
            delete markersMap.current[id];
        }
    });

    shipments.forEach((shp) => {
        // Fix 5: Defensive guard for missing or invalid location
        if (!shp.current_location || typeof shp.current_location.lng !== 'number' || typeof shp.current_location.lat !== 'number') {
            return;
        }

        const color = shp.risk_score > 0.7 ? '#ef4444' : (shp.status === 'Rerouted' ? '#10b981' : '#3b82f6');
        
        // Fix 4: Guard status replace
        const displayStatus = (typeof shp.status === 'string' ? shp.status : 'Unknown').replace('_', ' ');
        const popupHTML = `
            <div class="p-3 font-sans min-w-[140px]">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset ID: ${shp.id}</p>
                <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-black text-slate-900 uppercase">${displayStatus}</p>
                    <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></span>
                </div>
                <div class="h-[1px] bg-slate-100 my-2"></div>
                <p class="text-[10px] text-slate-500 font-medium">Risk Intensity: <span class="font-bold text-slate-900">${(shp.risk_score * 100).toFixed(0)}%</span></p>
            </div>
        `;

        if (markersMap.current[shp.id]) {
            // Update existing marker position smoothly
            markersMap.current[shp.id].setLngLat([shp.current_location.lng, shp.current_location.lat]);
            
            // Fix 6: Refresh popup content for existing markers
            const popup = markersMap.current[shp.id].getPopup();
            if (popup) {
                popup.setHTML(popupHTML);
            } else {
                markersMap.current[shp.id].setPopup(
                    new mapboxgl.Popup({ offset: 15, closeButton: false, className: 'premium-popup' }).setHTML(popupHTML)
                );
            }
            
            // Update the icon color if it changed
            const el = markersMap.current[shp.id].getElement();
            const svg = el.querySelector('svg');
            if (svg) svg.style.fill = color;
            
            const pulse = el.querySelector('.pulse-disk') as HTMLDivElement;
            if (pulse) pulse.style.backgroundColor = color;
        } else {
            // Create new truck marker
            const el = document.createElement('div');
            el.className = 'shipment-marker group cursor-pointer relative';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';

            // Custom Truck SVG
            el.innerHTML = `
                <div class="pulse-disk animate-pulse-glow" style="position: absolute; inset: 4px; border-radius: 50%; background-color: ${color}; opacity: 0.2;"></div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" style="z-index: 2; transition: fill 0.3s ease;" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11.5-8.5l1.5 2V13h-3v-3.5h1.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
            `;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([shp.current_location.lng, shp.current_location.lat])
                .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false, className: 'premium-popup' })
                    .setHTML(popupHTML))
                .addTo(map.current!);
            
            markersMap.current[shp.id] = marker;
        }
    });
  }, [shipments, risks, routeGeoJSON]);

  // Focus on selected shipment
  useEffect(() => {
    if (!map.current || !selectedShipment) return;
    
    const { lng, lat } = selectedShipment.current_location;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 12,
      essential: true,
      duration: 2000
    });
  }, [selectedShipment]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
    </div>
  );
};

export default MapComponent;
