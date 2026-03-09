// ai-agents/src/tools/crime_tool.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import type { ToolResponse } from '../types/agents';

export async function queryCrimeTool(params: {
  neighborhood?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<ToolResponse> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const queryParams: Record<string, string | number> = {
      limit: Math.min(params.limit ?? 10, 50), // Hard cap at 50
    };
    if (params.neighborhood) queryParams.neighborhood = params.neighborhood;

    const response = await axios.get(`${backendUrl}/api/v1/crime`, {
      params: queryParams,
      timeout: 5000,
    });

    logger.toolResult('Crime', response.data.data?.length || 0, response.data.total);

    return {
      success: true,
      data: response.data.data || [],
      total: response.data.total || 0,
      source: 'backend_api'
    };

  } catch (error) {
    logger.error('CrimeTool', error);
    return {
      success: false,
      data: null,
      total: 0,
      source: 'error',
      error: 'API_UNAVAILABLE',
      message: 'Crime database is currently unavailable. Please contact MPD directly at (334) 625-2531.'
    };
  }
}
