// ai-agents/src/tools/scrape_tool.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import type { ToolResponse } from '../types/agents';

export async function fetchAlertsTool(params: {
  query: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<ToolResponse> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const queryParams: Record<string, string | number> = {
      limit: Math.min(params.limit || 5, 20),
    };
    if (params.severity) queryParams.severity = params.severity;

    const response = await axios.get(`${backendUrl}/api/v1/alerts`, {
      params: queryParams,
      timeout: 5000,
    });

    logger.toolResult('Alerts', response.data.data?.length || 0, response.data.total);

    return {
      success: true,
      data: response.data.data || [],
      total: response.data.total || 0,
      source: 'backend_api',
    };

  } catch (error) {
    logger.error('AlertsTool', error);
    return {
      success: false,
      data: null,
      total: 0,
      source: 'error',
      error: 'API_UNAVAILABLE',
      message: 'Real-time alert system is currently unavailable. Please check official city sources.'
    };
  }
}
