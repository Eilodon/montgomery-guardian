// AlertFeed Types
// Aligned with shared/types/index.ts AlertItem interface

export type AlertSeverity = "critical" | "high" | "medium" | "low";

/**
 * AlertItem interface - matches shared/types/index.ts
 * timestamp is ISO 8601 string format
 */
export interface AlertItem {
  id: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  source: string;
  timestamp: string; // ISO 8601 format
  sourceUrl?: string;
  coordinates?: [number, number];
  affectedNeighborhood?: string;
}

export interface AlertFeedProps {
  alerts: AlertItem[];
  isLoading: boolean;
}

export interface AlertItemCardProps {
  alert: AlertItem;
  isNew: boolean;
}

export interface AlertSkeletonProps {
  count?: number;
}

export const severityColors: Record<AlertSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};
