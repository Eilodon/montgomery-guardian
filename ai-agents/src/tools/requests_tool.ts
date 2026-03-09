// ai-agents/src/tools/requests_tool.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import type { ToolResponse } from '../types/agents';

export async function queryRequestsTool(params: {
  service_type?: string;
  status?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<ToolResponse> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const queryParams: Record<string, string | number> = {
      limit: Math.min(params.limit ?? 10, 50), // Hard cap at 50
    };
    if (params.service_type) queryParams.service_type = params.service_type;
    if (params.status) queryParams.status = params.status;

    const response = await axios.get(`${backendUrl}/api/v1/requests-311`, {
      params: queryParams,
      timeout: 5000,
    });

    logger.toolResult('311Requests', response.data.data?.length || 0, response.data.total);

    return {
      success: true,
      data: response.data.data || [],
      total: response.data.total || 0,
      source: 'backend_api'
    };

  } catch (error) {
    logger.error('311Tool', error);
    return {
      success: false,
      data: null,
      total: 0,
      source: 'error',
      error: 'API_UNAVAILABLE',
      message: '311 request system unavailable. Please call 311 directly.'
    };
  }
}
