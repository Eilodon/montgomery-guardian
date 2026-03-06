// KPI Dashboard Types

export interface TrendDirection {
  direction: "up" | "down" | "neutral";
  percentage?: number;
}

export interface IncidentsTodayData {
  count: number;
  trend: TrendDirection;
}

export interface Calls911Data {
  count: number;
  sparklineData: number[]; // Last 7 days
}

export interface Open311RequestsData {
  count: number;
  topCategory: string;
}

export interface ResponseTimeData {
  minutes: number;
  trend: TrendDirection;
}

export interface StatCardBaseProps {
  title: string;
  isLoading?: boolean;
}
