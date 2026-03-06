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
