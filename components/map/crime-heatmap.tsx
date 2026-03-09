"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapboxMap, useMapboxMap } from "./mapbox-map";
import { CrimeIncident } from "@/shared/types";
import { Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useThrottle } from "@/lib/hooks/use-throttle";

// Define types for WebSocket messages
interface WSMessage {
  type: string;
  data?: any;
}

interface WSCrimeUpdate {
  type: "crime_update";
  data: CrimeIncident;
}

interface WSAuth {
  type: "auth";
  key: string;
}

interface WSSubscribe {
  type: "subscribe";
  subscriptions: string[];
}

type TimeRange = "24h" | "7d" | "30d";
type FilterRiskLevel = "all" | "critical" | "high" | "medium" | "low";

interface CrimeHeatmapProps {
  className?: string;
  onIncidentClick?: (incident: CrimeIncident) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  filterRiskLevel?: FilterRiskLevel;
}

// Helper function to get risk level from incident type
function getRiskLevel(incidentType: string): string {
  const riskMapping: { [key: string]: string } = {
    'burglary': 'high',
    'theft': 'medium',
    'assault': 'high',
    'homicide': 'high',
    'robbery': 'high',
    'drug': 'medium',
    'narcotics': 'medium',
    'vandalism': 'medium',
    'other': 'low'
  };
  
  return riskMapping[incidentType.toLowerCase()] || 'low';
}

// Helper function to get 311 icon
function get311Icon(serviceType: string): string {
  const iconMapping: { [key: string]: string } = {
    'pothole': '🕳️',
    'graffiti': '🎨',
    'trash': '🗑️',
    'flooding': '🌊',
    'overgrown_grass': '🌱',
    'street_light': '🚦',
    'noise_complaint': '📢',
    'other': '📋'
  };
  
  return iconMapping[serviceType.toLowerCase()] || '📋';
}

// Helper function to get 311 color
function get311Color(serviceType: string): string {
  const colorMapping: { [key: string]: string } = {
    'pothole': '#ef4444',
    'graffiti': '#8b5cf',
    'trash': '#6b7280',
    'flooding': '#3b82f6',
    'overgrown_grass': '#228b22',
    'street_light': '#fbbf24',
    'noise_complaint': '#eab308',
    'other': '#64748b'
  };
  
  return colorMapping[serviceType.toLowerCase()] || '#64748b';
}

export function CrimeHeatmap({
  className = "",
  onIncidentClick,
  timeRange = "24h",
  onTimeRangeChange,
  filterRiskLevel = "all"
}: CrimeHeatmapProps) {
  const { map, setMap } = useMapboxMap();
  const [crimeData, setCrimeData] = useState<CrimeIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<CrimeIncident | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load (REST API)
  useEffect(() => {
    const abortController = new AbortController();
    const loadCrimeData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/v1/crime?limit=500", { signal: abortController.signal });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const apiData = await response.json();
        setCrimeData(apiData.data || []);
      } catch (error: any) {
        if (error.name !== 'AbortError') console.error("[FATAL] Init load failed:", error);
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    };
    loadCrimeData();
    return () => abortController.abort();
  }, [timeRange]);

  // 2. THỢ RÈN: Tích hợp WebSocket Real-time
  useEffect(() => {
    // Thay NEXT_PUBLIC_WS_URL bằng url thật, ví dụ: "ws://localhost:8000/ws"
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
        console.log("🟢 Live Map Stream Connected");
        // Auth payload (đúng với backend bạn thiết kế)
        ws.send(JSON.stringify({ type: "auth", key: process.env.NEXT_PUBLIC_API_KEY || "dev_key_123" }));
        // Đăng ký room nhận data
        setTimeout(() => ws.send(JSON.stringify({ type: "subscribe", subscriptions: ["crime_updates"] })), 500);
    };

    ws.onmessage = (event: MessageEvent) => {
        try {
            // Backend WebSocketManager gửi ping dạng text, ta bỏ qua
            if (event.data === "ping") return;
            
            const payload = JSON.parse(event.data) as WSMessage;
            if (payload.type === "crime_update" && payload.data) {
                // Hút data mới, đẩy lên đầu mảng, giới hạn 1000 items để chống tràn RAM
                setCrimeData((prev: CrimeIncident[]) => {
                    // Tránh duplicate nếu ID đã tồn tại
                    if (prev.some((c: CrimeIncident) => c.id === payload.data.id)) return prev;
                    return [payload.data, ...prev].slice(0, 1000); 
                });
            }
        } catch (e) {
            console.error("WS Parse error", e);
        }
    };

    ws.onclose = () => console.warn("🔴 Live Map Stream Disconnected");

    return () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  // THỢ RÈN: Fix 2 - Thêm bộ giảm xóc WebSocket (Throttling Buffer Frontend)
  const throttledCrimeData = useThrottle(crimeData, 500);

  // THỢ RÈN: Fix 1 - Tính toán GeoJSON một lần duy nhất trong useMemo
  const crimeGeoJson = useMemo(() => {
    if (throttledCrimeData.length === 0) return null;

    const filteredData = throttledCrimeData.filter((incident: CrimeIncident) => {
      const incidentTime = new Date(incident.timestamp);
      const now = new Date();

      // Time range filter
      let timeFilter = true;
      switch (timeRange) {
        case "24h":
          timeFilter = (now.getTime() - incidentTime.getTime()) <= 24 * 60 * 60 * 1000;
          break;
        case "7d":
          timeFilter = (now.getTime() - incidentTime.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          break;
        case "30d":
          timeFilter = (now.getTime() - incidentTime.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          break;
      }

      // Risk level filter
      let riskFilter = true;
      if (filterRiskLevel !== "all") {
        const riskLevel = getRiskLevel(incident.type);
        riskFilter = riskLevel === filterRiskLevel;
      }

      return timeFilter && riskFilter;
    });

    return {
      type: "FeatureCollection" as const,
      features: filteredData.map((incident: CrimeIncident) => ({
        type: "Feature",
        properties: {
          id: incident.id,
          type: incident.type,
          riskLevel: getRiskLevel(incident.type),
          description: incident.description,
          timestamp: incident.timestamp,
          coordinates: [incident.longitude, incident.latitude],
        },
        geometry: {
          type: "Point",
          coordinates: [incident.longitude, incident.latitude],
        },
      })),
    };
  }, [throttledCrimeData, timeRange, filterRiskLevel]);

  // Handle map click for incident details
  const handleMapClick = (event: any) => {
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["crime-heatmap-circles"],
    });

    if (features.length > 0) {
      const incident = features[0].properties as CrimeIncident;
      setSelectedIncident(incident);
      onIncidentClick?.(incident);
    }
  };

  // Get crime statistics
  const getCrimeStats = () => {
    const stats = {
      total: crimeData.length,
      violent: crimeData.filter(c => c.type === "violent").length,
      property: crimeData.filter(c => c.type === "property").length,
      drug: crimeData.filter(c => c.type === "drug").length,
      other: crimeData.filter(c => c.type === "other").length,
      open: crimeData.filter(c => c.status === "open").length,
    };

    return stats;
  };

  const stats = getCrimeStats();

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map */}
      <MapboxMap
        onMapLoad={setMap}
        onMapClick={handleMapClick}
        crimeGeoJson={crimeGeoJson}
        showHeatmap={true}
        className="w-full h-full"
      />

      {/* Crime Statistics Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
        <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Crime Statistics
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Incidents</span>
            <span className="text-sm font-medium text-slate-100">{stats.total}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Violent</span>
            <span className="text-sm font-medium text-red-400">{stats.violent}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Property</span>
            <span className="text-sm font-medium text-orange-400">{stats.property}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Drug</span>
            <span className="text-sm font-medium text-yellow-400">{stats.drug}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Open Cases</span>
            <span className="text-sm font-medium text-blue-400">{stats.open}</span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Clock className="w-3 h-3" />
            Time Range
          </div>
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange?.(range)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${timeRange === range
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Level Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-100 mb-2">Risk Level</h4>
        <div className="space-y-1">
          {[
            { level: "critical", color: "bg-red-500", label: "Critical" },
            { level: "high", color: "bg-orange-500", label: "High" },
            { level: "medium", color: "bg-yellow-500", label: "Medium" },
            { level: "low", color: "bg-green-500", label: "Low" },
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-slate-400">Loading crime data...</p>
          </div>
        </div>
      )}

      {/* Selected Incident Popup */}
      {selectedIncident && (
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-100">Incident Details</h4>
            <button
              onClick={() => setSelectedIncident(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Type:</span>
              <span className="ml-2 text-slate-200 capitalize">{selectedIncident.type}</span>
            </div>
            <div>
              <span className="text-slate-400">Location:</span>
              <span className="ml-2 text-slate-200">{selectedIncident.neighborhood}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 capitalize ${selectedIncident.status === "open" ? "text-red-400" :
                selectedIncident.status === "investigating" ? "text-yellow-400" :
                  "text-green-400"
                }`}>
                {selectedIncident.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Time:</span>
              <span className="ml-2 text-slate-200">
                {new Date(selectedIncident.timestamp).toLocaleString()}
              </span>
            </div>
            {selectedIncident.description && (
              <div>
                <span className="text-slate-400">Description:</span>
                <span className="ml-2 text-slate-200">{selectedIncident.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
