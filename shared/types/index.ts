// shared/types/index.ts
// ⚠️ SOURCE OF TRUTH — KHÔNG ĐƯỢC DUPLICATE Ở BẤT KỲ FILE NÀO KHÁC

export interface CrimeIncident {
  id: string;
  type: 'violent' | 'property' | 'drug' | 'other';
  latitude: number;
  longitude: number;
  neighborhood: string;
  timestamp: string;
  status: 'open' | 'closed' | 'investigating';
  description?: string;
}

export interface ServiceRequest311 {
  requestId: string;
  serviceType: 'pothole' | 'graffiti' | 'trash' | 'flooding' | 'overgrown_grass' | 'other';
  status: 'open' | 'in_progress' | 'closed';
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  estimatedResolutionDays?: number;
}

// ← FIX: Thêm 'critical' vào severity
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

// ← FIX: prefilledForm có explicit fields thay vì Partial<ServiceRequest311>
export interface VisionPrefilledForm {
  serviceType?: ServiceRequest311['serviceType'];
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  estimatedResolutionDays?: number;
}

export interface VisionAnalysisResult {
  incidentType: ServiceRequest311['serviceType'];
  severity: IncidentSeverity; // ← Dùng shared type
  confidence: number; // 0-1
  description: string;
  suggested311Category: string;
  prefilledForm: VisionPrefilledForm; // ← Explicit, không Partial<>
}

export interface RiskPrediction {
  gridCellId: string;
  latitude: number;
  longitude: number;
  riskLevel: IncidentSeverity; // ← Tái sử dụng
  confidenceScore: number;
  forecastHours: 24 | 48 | 168;
  shapFeatures: Record<string, number>;
  generatedAt: string;
}

export type AgentType = 'safety_intel' | 'service_311' | 'vision' | 'web_scraper' | 'general';

export interface BaseAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AssistantMessage extends BaseAgentMessage {
  role: 'assistant';
  agentType: AgentType;
  confidence?: number;
  metadata?: {
    safetyScore?: 'A' | 'B' | 'C' | 'D' | 'F';
    mapCenter?: [number, number];
    imageUrl?: string;
    analysisResult?: VisionAnalysisResult;
  };
}

export interface UserMessage extends BaseAgentMessage {
  role: 'user';
  metadata?: {
    imageUrl?: string;
  };
}

export type AgentMessage = UserMessage | AssistantMessage;

export interface AlertItem {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity; // ← Tái sử dụng
  source: string;
  sourceUrl?: string;
  timestamp: string;
  coordinates?: [number, number];
  affectedNeighborhood?: string;
}

// ← THÊM: Các types còn thiếu mà lib/api.ts đang tự định nghĩa
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
  riskLevel: IncidentSeverity;
  confidenceScore: number;
  shapFeatures: Record<string, number>;
  generatedAt: string;
}

export interface RiskZone {
  level: IncidentSeverity;
  count: number;
}
