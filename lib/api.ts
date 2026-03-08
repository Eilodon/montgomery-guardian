// lib/api.ts
import useSWR from 'swr';

// ← Re-export từ shared, KHÔNG định nghĩa lại
export type {
  KPIData,
  AlertItem,
  DistrictData,
  PredictionData,
  VisionAnalysisResult,
  AgentMessage,
  ServiceRequest311,
} from '@/shared/types';

// Import local để dùng trong hooks
import type {
  KPIData,
  AlertItem,
  DistrictData,
  PredictionData,
  RiskZone,
} from '@/shared/types';

const API_BASE = '/api/proxy';

// ─── QUAN TRỌNG: Mapping endpoints ───────────────────────────────────────────
// Các paths dưới đây phải có trong ALLOWED_PATHS của proxy route
// và phải tồn tại trong OpenAPI spec (shared/openapi/api.yaml)
//
// | Hook                  | Endpoint hiện tại (SAI)     | Endpoint đúng        |
// |-----------------------|-----------------------------|----------------------|
// | useLiveAlerts         | /alerts/live                | /alerts              |
// | useActive311Requests  | /requests/active            | /requests            |
// | useDistricts          | /districts                  | /districts *         |
// | useHeatmapData        | /predictions/heatmap        | /predictions/heatmap *|
// | useSHAPExplainability | /predictions/explain        | /predictions/explain *|
// | useKPIData            | /kpis                       | /kpis *              |
//
// (*) = cần thêm vào OpenAPI spec và implement ở backend
// ─────────────────────────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = new Error(`API error: ${response.status} ${url}`);
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
};

export function useKPIData(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<KPIData>(
    enabled ? '/kpis' : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  return { kpiData: data, isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useLiveAlerts(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<AlertItem[]>(
    enabled ? '/alerts' : null, // ← FIX: /alerts/live → /alerts
    fetcher,
    { refreshInterval: 30_000 }
  );
  return { alerts: data ?? [], isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useDistricts(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<DistrictData[]>(
    enabled ? '/districts' : null,
    fetcher
  );
  return { districts: data ?? [], isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function usePredictions(enabled = true, options?: {
  riskLevel?: string;
  forecastHours?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.riskLevel) params.append('risk_level', options.riskLevel);
  if (options?.forecastHours) params.append('forecast_hours', String(options.forecastHours));
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));

  const qs = params.toString();
  const { data, error, isLoading, mutate } = useSWR<PredictionData[]>(
    enabled ? `/predictions${qs ? `?${qs}` : ''}` : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  return { predictions: data ?? [], isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useHeatmapData(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? '/predictions/heatmap' : null,
    fetcher,
    { refreshInterval: 120_000 }
  );
  return { heatmapData: data, isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useRiskZoneData(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<{ data: RiskZone[] }>(
    enabled ? '/predictions/summary' : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  return { riskZones: data?.data ?? [], isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useActive311Requests(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? '/requests' : null, // ← FIX: /requests/active → /requests
    fetcher,
    { refreshInterval: 45_000 }
  );
  return { requests: data ?? [], isLoading: enabled && isLoading, isError: !!error, mutate };
}

export function useSHAPExplainability(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? '/predictions/explain' : null,
    fetcher
  );
  return { shapData: data, isLoading: enabled && isLoading, isError: !!error, mutate };
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
  language = 'en',
  userLocation?: { lat: number; lng: number }
) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, language, userLocation }),
  });
  if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
  return response.json();
}

export async function analyzeImage(
  imageFile: File,
  location?: { lat: number; lng: number }
) {
  const fd = new FormData();
  fd.append('image', imageFile);
  if (location) {
    fd.append('lat', String(location.lat));
    fd.append('lng', String(location.lng));
  }
  const response = await fetch(`${API_BASE}/vision/analyze`, {
    method: 'POST',
    body: fd,
  });
  if (!response.ok) throw new Error(`Vision failed: ${response.status}`);
  return response.json();
}

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  return response.json();
}
