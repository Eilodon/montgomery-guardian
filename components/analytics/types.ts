// Split-View Analytics Component Types

export interface FeatureImportanceItem {
  name: string;
  value: number;
  color: string;
}

export interface MapPanelProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export interface FeatureImportanceChartProps {
  features: FeatureImportanceItem[];
  title?: string;
}

export interface WhatIfSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export interface WhatIfSimulatorProps {
  patrolCoverage: number;
  onPatrolCoverageChange: (value: number) => void;
  backlogLevel: number;
  onBacklogLevelChange: (value: number) => void;
}

export interface SplitViewAnalyticsProps {
  historicalContent?: React.ReactNode;
  predictedContent?: React.ReactNode;
  features?: FeatureImportanceItem[];
  className?: string;
}

export const DEFAULT_FEATURE_IMPORTANCE: FeatureImportanceItem[] = [
  { name: "Neighborhood History", value: 0.91, color: "#8B5CF6" },
  { name: "Weekend", value: 0.85, color: "#EF4444" },
  { name: "Temperature", value: 0.72, color: "#F59E0B" },
  { name: "311 Backlog", value: 0.65, color: "#3B82F6" },
  { name: "Hour of Day", value: 0.58, color: "#22C55E" },
];
