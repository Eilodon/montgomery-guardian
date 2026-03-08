# backend/api/models/schemas.py
# Pydantic models matching shared/types
from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any
from datetime import datetime

class Trend(BaseModel):
    direction: Literal['up', 'down']
    percentage: float

class IncidentsToday(BaseModel):
    count: int
    trend: Trend

class Calls911(BaseModel):
    count: int
    sparklineData: list[int]

class Open311Requests(BaseModel):
    count: int
    topCategory: str

class AvgResponseTime(BaseModel):
    minutes: float
    trend: Trend

class KPIData(BaseModel):
    incidentsToday: IncidentsToday
    calls911: Calls911
    open311Requests: Open311Requests
    avgResponseTime: AvgResponseTime

class CrimeIncident(BaseModel):
    id: str
    type: Literal['violent', 'property', 'drug', 'other']
    latitude: float
    longitude: float
    neighborhood: str
    timestamp: datetime  # ISO 8601
    status: Literal['open', 'closed', 'investigating']
    description: Optional[str] = None

class ServiceRequest311(BaseModel):
    requestId: str
    serviceType: Literal['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other']
    status: Literal['open', 'in_progress', 'closed']
    latitude: float
    longitude: float
    address: str
    createdAt: datetime
    updatedAt: datetime
    description: Optional[str] = None
    estimatedResolutionDays: Optional[int] = None

class RiskPrediction(BaseModel):
    gridCellId: str
    latitude: float
    longitude: float
    riskLevel: Literal['critical', 'high', 'medium', 'low']
    confidenceScore: float  # 0-1
    forecastHours: Literal[24, 48, 168]  # 168 = 7 days
    shapFeatures: Dict[str, float]  # feature importance
    generatedAt: datetime

class RiskZone(BaseModel):
    level: Literal['critical', 'high', 'medium', 'low']
    count: int

class RiskZonesResponse(BaseModel):
    data: list[RiskZone]

class VisionAnalysisResult(BaseModel):
    incidentType: str
    severity: Literal['high', 'medium', 'low']
    confidence: float
    description: str
    suggested311Category: str
    prefilledForm: Dict[str, Any]

class AgentMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str
    agentType: Literal['safety_intel', 'service_311', 'vision', 'web_scraper']
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class AlertItem(BaseModel):
    id: str
    title: str
    summary: str
    severity: Literal['critical', 'high', 'medium', 'low']
    source: str
    sourceUrl: Optional[str] = None
    timestamp: datetime
    coordinates: Optional[tuple[float, float]] = None
    affectedNeighborhood: Optional[str] = None

# Response models
class CrimeResponse(BaseModel):
    data: list[CrimeIncident]
    total: int

class Requests311Response(BaseModel):
    data: list[ServiceRequest311]
    total: int

class PredictionsResponse(BaseModel):
    data: list[RiskPrediction]
    total: int

class AlertsResponse(BaseModel):
    data: list[AlertItem]
    total: int

class ChatResponse(BaseModel):
    message: AgentMessage

class VisionResponse(BaseModel):
    result: VisionAnalysisResult

class IncidentBreakdown(BaseModel):
    type: str
    count: int
    color: str

class DistrictData(BaseModel):
    id: str
    name: str
    grade: Literal['A', 'B', 'C', 'D', 'F']
    crimeIndex: float
    backlog311: int
    trend: float

class DistrictsResponse(BaseModel):
    total: int
    data: list[DistrictData]

class SimulationRequest(BaseModel):
    patrolCoverage: float
    backlogLevel: float

class SimulationResponse(BaseModel):
    projectedImpact: int
    confidenceScore: float
    factors: Dict[str, float]
