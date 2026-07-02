"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface FleetData {
  shipments: any[];
  disruptions: any[];
  simulation: {
    running: boolean;
    speed: number;
    elapsed: number;
  };
  timestamp: number;
}

interface UseFleetSocketOptions {
  url?: string;
  onPositionUpdate?: (data: FleetData) => void;
}

export function useFleetSocket(options: UseFleetSocketOptions = {}) {
  const { url = "ws://localhost:8000/ws/fleet", onPositionUpdate } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [fleetData, setFleetData] = useState<FleetData>({
    shipments: [],
    disruptions: [],
    simulation: { running: false, speed: 1, elapsed: 0 },
    timestamp: 0,
  });

  // Keep latest callback in a ref to prevent socket reconnect storms
  const onPositionUpdateRef = useRef(onPositionUpdate);
  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
  }, [onPositionUpdate]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptRef.current = 0;
        console.log("FleetSocket: Connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "position_update") {
            const fleetUpdate: FleetData = {
              shipments: data.shipments || [],
              disruptions: data.disruptions || [],
              simulation: data.simulation || { running: false, speed: 1, elapsed: 0 },
              timestamp: data.timestamp || Date.now() / 1000,
            };
            setFleetData(fleetUpdate);
            onPositionUpdateRef.current?.(fleetUpdate);
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
        reconnectAttemptRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      // Connection failed, retry
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  return { fleetData, connected, send };
}
