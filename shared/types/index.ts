// shared/types/index.ts
// ⚠️ FILE NÀY LÀ SOURCE OF TRUTH — không ai được tự ý thay đổi
// Muốn thêm field → tạo PR, cả team review

export interface CrimeIncident {
  id: string;
  type: 'violent' | 'property' | 'drug' | 'other';
  latitude: number;
  longitude: number;
  neighborhood: string;
  timestamp: string; // ISO 8601
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

export interface RiskPrediction {
  gridCellId: string;
  latitude: number;
  longitude: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
  forecastHours: 24 | 48 | 168; // 168 = 7 days
  shapFeatures: Record<string, number>; // feature importance
  generatedAt: string;
}

export interface VisionAnalysisResult {
  incidentType: ServiceRequest311['serviceType'];
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  description: string;
  suggested311Category: string;
  prefilledForm: Partial<ServiceRequest311>;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  agentType: 'safety_intel' | 'service_311' | 'vision' | 'web_scraper';
  timestamp: string;
  metadata?: {
    safetyScore?: 'A' | 'B' | 'C' | 'D' | 'F';
    mapCenter?: [number, number];
    incidents?: CrimeIncident[];
    requests311?: ServiceRequest311[];
  };
}

export interface AlertItem {
  id: string;
  title: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  sourceUrl?: string;
  timestamp: string;
  coordinates?: [number, number];
  affectedNeighborhood?: string;
}
