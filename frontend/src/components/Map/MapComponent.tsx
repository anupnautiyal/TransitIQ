"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";

interface MapComponentProps {
  accessToken: string;
  shipments?: any[];
  risks?: any[];
  routeGeoJSON?: any;
  selectedShipment?: any;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const MapComponent: React.FC<MapComponentProps> = ({
  accessToken,
  shipments = [],
  risks = [],
  routeGeoJSON = null,
  selectedShipment = null,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersMap = useRef<{ [key: string]: mapboxgl.Marker }>({});
  // Sources/layers only exist after the map's "load" event; data effects must wait for it
  const [mapLoaded, setMapLoaded] = useState(false);

  const animationState = useRef<{
    [key: string]: {
      fromLng: number; fromLat: number;
      toLng: number; toLat: number;
      startTime: number; frameId: number | null;
    };
  }>({});

  const ANIMATION_DURATION = 1200;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    setMapLoaded(false);
    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [78.9629, 20.5937],
      zoom: 4.5,
      antialias: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current) return;

      // Heatmap
      map.current.addSource("risk-data", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.current.addLayer({
        id: "risk-heat",
        type: "heatmap",
        source: "risk-data",
        maxzoom: 9,
        paint: {
          "heatmap-weight": ["get", "severity"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(42,167,255,0.3)",
            0.4, "rgba(42,167,255,0.5)",
            0.6, "rgba(255,165,0,0.6)",
            0.8, "rgba(255,69,0,0.7)",
            1, "rgba(255,0,0,0.8)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 60],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0.5],
        },
      });

      // Route
      map.current.addSource("route-data", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });

      map.current.addLayer({
        id: "route-line",
        type: "line",
        source: "route-data",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2aa7ff", "line-width": 3, "line-opacity": 0.8 },
      });

      // Rerouted route
      map.current.addSource("reroute-data", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });

      map.current.addLayer({
        id: "reroute-line",
        type: "line",
        source: "reroute-data",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#14b8a6", "line-width": 3, "line-opacity": 0, "line-dasharray": [2, 2] },
      });

      setMapLoaded(true);
    });

    return () => {
      Object.values(animationState.current).forEach((state) => {
        if (state.frameId !== null) cancelAnimationFrame(state.frameId);
      });
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken]);

  const animateMarker = useCallback(
    (id: string, marker: mapboxgl.Marker, toLng: number, toLat: number) => {
      const prev = animationState.current[id];
      if (prev?.frameId !== null && prev?.frameId !== undefined) cancelAnimationFrame(prev.frameId);

      const fromLng = prev ? prev.toLng : marker.getLngLat().lng;
      const fromLat = prev ? prev.toLat : marker.getLngLat().lat;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        marker.setLngLat([lerp(fromLng, toLng, eased), lerp(fromLat, toLat, eased)]);

        if (progress < 1) {
          animationState.current[id].frameId = requestAnimationFrame(tick);
        } else {
          animationState.current[id].frameId = null;
        }
      };

      animationState.current[id] = { fromLng, fromLat, toLng, toLat, startTime, frameId: requestAnimationFrame(tick) };
    }, []
  );

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Heatmap
    const riskSource = map.current.getSource("risk-data") as mapboxgl.GeoJSONSource;
    if (riskSource && risks && risks.length > 0) {
      riskSource.setData({
        type: "FeatureCollection",
        features: risks.map((r: any) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.location?.lng || 0, r.location?.lat || 0] },
          properties: { severity: r.severity === "Critical" ? 1.0 : r.severity === "High" ? 0.7 : 0.4 },
        })),
      });
    }

    // Route
    const routeSource = map.current.getSource("route-data") as mapboxgl.GeoJSONSource;
    if (routeSource) {
      if (routeGeoJSON) {
        // Normalize routeGeoJSON: accept Feature or bare Geometry
        const featureData =
          routeGeoJSON.type === "Feature"
            ? routeGeoJSON
            : { type: "Feature", properties: routeGeoJSON.properties || {}, geometry: routeGeoJSON };

        routeSource.setData(featureData);
        const isOptimized = routeGeoJSON?.properties?.isOptimized;
        map.current.setPaintProperty("route-line", "line-color", isOptimized ? "#14b8a6" : "#2aa7ff");
        map.current.setPaintProperty("route-line", "line-width", 4);
        map.current.setPaintProperty("route-line", "line-opacity", 0.9);

        try {
          const coordinates =
            featureData.geometry?.coordinates || routeGeoJSON.coordinates;
          if (coordinates && coordinates.length > 0) {
            const bounds = coordinates.reduce(
              (b: mapboxgl.LngLatBounds, c: any) => b.extend(c),
              new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
            );
            map.current.fitBounds(bounds, { padding: 60, duration: 1200, maxZoom: 14 });
          }
        } catch (e) {}
      } else {
        routeSource.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      }
    }

    // Markers
    const currentIds = new Set(shipments.map((s: any) => s.id));

    Object.keys(markersMap.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersMap.current[id].remove();
        delete markersMap.current[id];
        if (animationState.current[id]) {
          if (animationState.current[id].frameId !== null) cancelAnimationFrame(animationState.current[id].frameId);
          delete animationState.current[id];
        }
      }
    });

    shipments.forEach((shp: any) => {
      if (!shp.current_location || typeof shp.current_location.lng !== "number" || typeof shp.current_location.lat !== "number") return;

      const color = shp.status === "rerouted" ? "#14b8a6" : shp.risk_score > 0.7 ? "#ef4444" : "#2aa7ff";
      const displayStatus = (typeof shp.status === "string" ? shp.status : "unknown").replace("_", " ");

      const popupHTML = `
        <div style="padding: 10px; min-width: 140px; font-family: Inter, sans-serif;">
          <p style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace;">${shp.id}</p>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <p style="font-size: 12px; font-weight: 600; color: #e2e8f0; text-transform: uppercase;">${displayStatus}</p>
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          </div>
          <div style="height: 1px; background: rgba(255,255,255,0.06); margin: 6px 0;"></div>
          <p style="font-size: 11px; color: #94a3b8;">Risk: <span style="color: #e2e8f0; font-weight: 600;">${(shp.risk_score * 100).toFixed(0)}%</span></p>
          ${shp.total_steps ? `<p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Progress: <span style="color: #e2e8f0; font-weight: 600;">${Math.round((shp.current_step / shp.total_steps) * 100)}%</span></p>` : ""}
        </div>
      `;

      if (markersMap.current[shp.id]) {
        animateMarker(shp.id, markersMap.current[shp.id], shp.current_location.lng, shp.current_location.lat);
        const popup = markersMap.current[shp.id].getPopup();
        if (popup) popup.setHTML(popupHTML);
        else markersMap.current[shp.id].setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(popupHTML));

        const el = markersMap.current[shp.id].getElement();
        const svg = el.querySelector("svg");
        if (svg) svg.style.fill = color;
        const pulse = el.querySelector(".pulse-ring") as HTMLDivElement;
        if (pulse) pulse.style.borderColor = color;
      } else {
        const el = document.createElement("div");
        el.className = "shipment-marker cursor-pointer relative";
        el.style.width = "36px";
        el.style.height = "36px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        el.innerHTML = `
          <div class="pulse-ring" style="position:absolute;inset:2px;border-radius:50%;border:2px solid ${color};opacity:0.3;animation:pulse-ring 2s ease-out infinite;"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" style="z-index:2;transition:fill 0.3s;" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11.5-8.5l1.5 2V13h-3v-3.5h1.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
          </svg>
          <style>
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.4; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([shp.current_location.lng, shp.current_location.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(popupHTML))
          .addTo(map.current!);

        markersMap.current[shp.id] = marker;
      }
    });
  }, [shipments, risks, routeGeoJSON, animateMarker, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedShipment) return;
    const { lng, lat } = selectedShipment.current_location;
    map.current.flyTo({ center: [lng, lat], zoom: 12, essential: true, duration: 2000 });
  }, [selectedShipment, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />
    </div>
  );
};

export default MapComponent;
