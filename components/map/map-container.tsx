"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LayerToggle } from "./layer-toggle";
import { RiskZoneRibbon } from "./risk-zone-ribbon";
import { AlertsSidebar } from "./alerts-sidebar";
import { AnalyticsPanel } from "./analytics-panel";
import { UnifiedMap } from "./unified-map";
import type { MapContainerProps, MapLayerType, RiskZone, Alert } from "./types";

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
  alerts = defaultAlerts,
  defaultLayer = "unified",
  showAlertsSidebar = true,
  showAnalyticsPanel = true,
  analyticsContent,
}: MapContainerFullProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayerType>(defaultLayer);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  return (
    <div
      className={cn(
        "relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden",
        className
      )}
    >
      {/* Main Map Content Area */}
      <div className="absolute inset-0 pb-[60px]">
        {children || <UnifiedMap />}
      </div>

      {/* Layer Toggle Controls */}
      <LayerToggle activeLayer={activeLayer} onLayerChange={setActiveLayer} />

      {/* Left Sidebar - Alerts */}
      {showAlertsSidebar && (
        <AlertsSidebar
          alerts={alerts}
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
      <RiskZoneRibbon zones={riskZones} />
    </div>
  );
}
