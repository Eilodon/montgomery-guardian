"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LayerToggle } from "./layer-toggle";
import { RiskZoneRibbon } from "./risk-zone-ribbon";
import { AlertsSidebar } from "./alerts-sidebar";
import { AnalyticsPanel } from "./analytics-panel";
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
        {children || (
          <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">Map Component Placeholder</p>
              <p className="text-slate-500 text-xs mt-1">
                Pass a map component as children
              </p>
            </div>
          </div>
        )}
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
