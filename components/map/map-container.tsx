"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { LayerToggle } from "./layer-toggle";
import { RiskZoneRibbon } from "./risk-zone-ribbon";
import { AlertsSidebar } from "./alerts-sidebar";
import { AnalyticsPanel } from "./analytics-panel";
import { UnifiedMap } from "./unified-map";
import { MapboxMap } from "./mapbox-map";
import { CrimeHeatmap } from "./crime-heatmap";
import type { MapContainerProps, MapLayerType, RiskZone, Alert } from "./types";
import { useHeatmapData, useActive311Requests, useLiveAlerts, useRiskZoneData } from "@/lib/api";
import { MapDataProvider } from "./map-data-context";

// Default risk zone data
const defaultRiskZones: RiskZone[] = [
  { level: "critical", count: 3 },
  { level: "high", count: 12 },
  { level: "medium", count: 28 },
  { level: "low", count: 45 },
];

// Default alert data for demonstration
const defaultAlerts: Alert[] = [
  {
    id: "1",
    title: "Traffic Incident on Main St",
    description: "Multi-vehicle collision reported. Emergency services dispatched.",
    timestamp: "2 min ago",
    severity: "critical",
  },
  {
    id: "2",
    title: "Suspicious Activity Report",
    description: "Reported near downtown area. Officers responding.",
    timestamp: "8 min ago",
    severity: "high",
  },
  {
    id: "3",
    title: "Street Light Outage",
    description: "Multiple lights out on Oak Avenue between 5th and 7th.",
    timestamp: "15 min ago",
    severity: "medium",
  },
  {
    id: "4",
    title: "Noise Complaint",
    description: "Residential area noise violation reported.",
    timestamp: "23 min ago",
    severity: "low",
  },
  {
    id: "5",
    title: "Pothole Report",
    description: "Large pothole on Elm Street causing traffic issues.",
    timestamp: "45 min ago",
    severity: "medium",
  },
];

export interface MapContainerFullProps extends MapContainerProps {
  riskZones?: RiskZone[];
  alerts?: Alert[];
  defaultLayer?: MapLayerType;
  showAlertsSidebar?: boolean;
  showAnalyticsPanel?: boolean;
  analyticsContent?: React.ReactNode;
}

export function MapContainer({
  children,
  className,
  riskZones = defaultRiskZones,
  alerts = [],
  defaultLayer = "unified",
  showAlertsSidebar = true,
  showAnalyticsPanel = true,
  analyticsContent,
}: MapContainerFullProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayerType>(defaultLayer);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  // Use real API data
  const { heatmapData } = useHeatmapData();
  const { requests: active311Requests } = useActive311Requests();
  const { alerts: liveAlerts } = useLiveAlerts();
  const { riskZones: liveRiskZones } = useRiskZoneData();

  return (
    <div
      className={cn(
        "relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden",
        className
      )}
    >
      {/* Main Map Content Area */}
      <MapDataProvider
        crimeData={(heatmapData as any)?.data ?? []}
        requests311={(active311Requests as any)?.data ?? []}
      >
        <div className="absolute inset-0 pb-[60px]">
          {activeLayer === "crime" && (
            <CrimeHeatmap
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}
          {activeLayer === "311" && (
            <MapboxMap showHeatmap={false} show311Points />
          )}
          {(activeLayer === "unified" || !children) && (
            children ?? <MapboxMap />
          )}
        </div>
      </MapDataProvider>

      {/* Layer Toggle Controls */}
      <LayerToggle activeLayer={activeLayer} onLayerChange={setActiveLayer} />

      {/* Left Sidebar - Alerts */}
      {showAlertsSidebar && (
        <AlertsSidebar
          alerts={liveAlerts && liveAlerts.length > 0 ? (liveAlerts as any[]).map(a => ({
            id: a.id,
            title: a.title,
            description: a.summary,
            timestamp: new Date(a.timestamp).toLocaleTimeString(),
            severity: (a.severity as any)
          })) : alerts}
          isOpen={alertsOpen}
          onToggle={() => setAlertsOpen(!alertsOpen)}
        />
      )}

      {/* Right Panel - Analytics */}
      {showAnalyticsPanel && (
        <AnalyticsPanel
          isOpen={analyticsOpen}
          onToggle={() => setAnalyticsOpen(!analyticsOpen)}
        >
          {analyticsContent}
        </AnalyticsPanel>
      )}

      {/* Bottom Ribbon - Risk Zones */}
      <RiskZoneRibbon zones={liveRiskZones.length > 0 ? liveRiskZones : riskZones} />
    </div>
  );
}
