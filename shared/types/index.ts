// shared/types/index.ts
// ⚠️ SOURCE OF TRUTH — STRICT VIBE CODING PROTOCOL

/**
 * Mức độ nghiêm trọng của sự cố.
 * @property critical - Cần can thiệp ngay lập tức (Xả súng, hỏa hoạn, bạo loạn).
 * @property high - Nguy cơ cao, cần xử lý trong 1-2 giờ (Tai nạn, trộm cắp đang diễn ra).
 * @property medium - Sự cố thông thường (Vandalism, nghi ngờ).
 * @property low - Thông tin/Cảnh báo không khẩn cấp.
 */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AgentType = 'safety_intel' | 'service_311' | 'vision' | 'web_scraper' | 'general';

/**
 * Sự cố Tội phạm (Crime Incident) đã được chuẩn hóa.
 */
export interface CrimeIncident {
  /** Mã định danh duy nhất của sự cố từ CSDL */
  id: string;
  type: 'violent' | 'property' | 'drug' | 'other';
  latitude: number;
  longitude: number;
  /** Tên khu vực (VD: Downtown, Oak Park). BẮT BUỘC KHỚP VỚI CONSTANTS. */
  neighborhood: string;
  /** Thời gian xảy ra sự cố (ISO 8601) */
  timestamp: string;
  status: 'open' | 'closed' | 'investigating';
  description?: string;
}

/**
 * Yêu cầu dịch vụ công cộng 311.
 */
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
  /** Số ngày dự kiến hoàn thành dựa trên ML hoặc SLA mặc định */
  estimatedResolutionDays?: number;
}

export interface VisionPrefilledForm {
  serviceType?: ServiceRequest311['serviceType'];
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  estimatedResolutionDays?: number;
}

/**
 * Kết quả phân tích hình ảnh từ Vision Agent (Gemini Flash/Pro).
 * @strict Phải đảm bảo trả về JSON đúng cấu trúc này.
 */
export interface VisionAnalysisResult {
  incidentType: ServiceRequest311['serviceType'];
  severity: IncidentSeverity;
  /** Điểm tự tin của LLM (0.0 đến 1.0) */
  confidence: number;
  description: string;
  suggested311Category: string;
  prefilledForm: VisionPrefilledForm;
}

/**
 * Dự đoán rủi ro từ ML Engine (XGBoost/LSTM Ensemble).
 */
export interface RiskPrediction {
  gridCellId: string;
  latitude: number;
  longitude: number;
  riskLevel: IncidentSeverity;
  /** Điểm tự tin của Ensemble Model (0.0 đến 1.0) */
  confidenceScore: number;
  /** Khung thời gian dự đoán (1 ngày, 2 ngày, 1 tuần) */
  forecastHours: 24 | 48 | 168;
  /** Feature Importance (SHAP values) giải thích tại sao có rủi ro này */
  shapFeatures: Record<string, number>;
  generatedAt: string;
}

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
  severity: IncidentSeverity;
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
