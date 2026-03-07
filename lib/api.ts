// lib/api.ts
import useSWR from 'swr';

// API base URL - Now routing through local secure proxy to hide credentials
const API_BASE = '/api/proxy';

// Types for API responses
export interface KPIData {
  incidentsToday: {
    count: number;
    trend: { direction: 'up' | 'down'; percentage: number };
  };
  calls911: {
    count: number;
    sparklineData: number[];
  };
  open311Requests: {
    count: number;
    topCategory: string;
  };
  avgResponseTime: {
    minutes: number;
    trend: { direction: 'up' | 'down'; percentage: number };
  };
}

export interface AlertItem {
  id: string;
  title: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  timestamp: string;
}

export interface DistrictData {
  id: string;
  name: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  crimeIndex: number;
  backlog311: number;
  trend: number;
}

export interface PredictionData {
  gridCellId: string;
  latitude: number;
  longitude: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  shapFeatures: Record<string, number>;
  generatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentType?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface VisionAnalysisResult {
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  suggested311Category: string;
  prefilledForm: {
    serviceType: string;
    description: string;
    latitude?: number;
    longitude?: number;
    estimatedResolutionDays: number;
  };
}

// Generic fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  return response.json();
};

// SWR hooks for real API data
export function useKPIData(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<KPIData>(enabled ? '/kpis' : null, fetcher);

  return {
    kpiData: data,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

export function useLiveAlerts(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<AlertItem[]>(enabled ? '/alerts/live' : null, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds for live alerts
  });

  return {
    alerts: data || [],
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

export function useDistricts(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<DistrictData[]>(enabled ? '/districts' : null, fetcher);

  return {
    districts: data || [],
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

export function usePredictions(enabled: boolean = true, options?: {
  riskLevel?: string;
  forecastHours?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.riskLevel) params.append('risk_level', options.riskLevel);
  if (options?.forecastHours) params.append('forecast_hours', options.forecastHours.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  const { data, error, isLoading, mutate } = useSWR<PredictionData[]>(
    enabled ? `/predictions?${queryString}` : null,
    fetcher,
    {
      refreshInterval: 60000 // Refresh every minute for predictions
    }
  );

  return {
    predictions: data || [],
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

export function useHeatmapData(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/predictions/heatmap' : null, fetcher, {
    refreshInterval: 120000 // Refresh every 2 minutes for heatmap
  });

  return {
    heatmapData: data,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

export function useActive311Requests(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/requests/active' : null, fetcher, {
    refreshInterval: 45000 // Refresh every 45 seconds for 311 requests
  });

  return {
    requests: data || [],
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

// Chat API functions
export async function sendChatMessage(message: string, userLocation?: { lat: number; lng: number }) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      userLocation,
      language: 'en'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return response.json();
}

// Vision API functions
export async function analyzeImage(imageFile: File, location?: { lat: number; lng: number }, description?: string) {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (location) {
    formData.append('location_lat', location.lat.toString());
    formData.append('location_lon', location.lng.toString());
  }
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(`${API_BASE}/vision/analyze`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to analyze image');
  }

  return response.json();
}

// SHAP explanation data
export function useSHAPExplainability(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/predictions/explain' : null, fetcher);

  return {
    shapData: data,
    isLoading: enabled ? isLoading : false,
    isError: !!error,
    mutate
  };
}

// Utility function for API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}
