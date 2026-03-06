// MapContainer Types

export type MapLayerType = "crime" | "311" | "unified";

export interface RiskZone {
  level: "critical" | "high" | "medium" | "low";
  count: number;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface MapContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export interface LayerToggleProps {
  activeLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
}

export interface RiskZoneRibbonProps {
  zones: RiskZone[];
}

export interface AlertsSidebarProps {
  alerts: Alert[];
  isOpen: boolean;
  onToggle: () => void;
}

export interface AnalyticsPanelProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}
