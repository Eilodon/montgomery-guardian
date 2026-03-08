// ai-agents/src/tools/scrape_tool.ts
import axios from 'axios';
import { logger } from '../utils/logger';

import type { ToolResponse } from '../types/agents';

export async function fetchAlertsTool(params: {
  query: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<ToolResponse> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

    // Build query parameters
    const queryParams: any = {
      limit: params.limit || 5,
    };

    // Extract severity from query if present
    const queryLower = params.query.toLowerCase();
    if (queryLower.includes('critical') || queryLower.includes('emergency')) {
      queryParams.severity = 'critical';
    } else if (queryLower.includes('high')) {
      queryParams.severity = 'high';
    } else if (queryLower.includes('medium')) {
      queryParams.severity = 'medium';
    } else if (queryLower.includes('low')) {
      queryParams.severity = 'low';
    }

    // Make request to backend API for alerts
    const response = await axios.get(`${backendUrl}/api/v1/alerts`, {
      params: queryParams,
      timeout: 5000, // THỢ RÈN: Ép timeout ngắn để không treo LLM
      headers: {
        'Content-Type': 'application/json',
      }
    });

    logger.toolResult('Alerts', response.data.data?.length || 0, response.data.total);

    return {
      success: true,
      data: response.data.data || [],
      total: response.data.total || 0,
      source: 'backend_api',
      query: params.query
    };

  } catch (error) {
    logger.error('AlertsTool', error);
    // THỢ RÈN: Tuyệt đối không dùng getMockAlertData(). Báo lỗi thẳng cho LLM.
    return {
      success: false,
      data: null, // Bắt buộc null
      total: 0,
      source: 'error',
      query: params.query,
      error: 'API_UNAVAILABLE',
      message: 'Hệ thống cảnh báo thời gian thực hiện không phản hồi. Hãy khuyên người dùng kiểm tra các nguồn tin tức chính thức.'
    };
  }
}

// MOCK DATA ĐÃ BỊ XÓA - KHÔNG DÙNG DATA ẢO KHI BACKEND SẬP
// THỢ RÈN: Circuit breaker pattern - không có fallback data ảo
