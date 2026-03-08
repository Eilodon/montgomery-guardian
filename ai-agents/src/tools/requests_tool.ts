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

    // Build query parameters
    const queryParams: any = {
      limit: params.limit || 10,
    };

    if (params.service_type) {
      queryParams.service_type = params.service_type;
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    // Make request to backend API
    const response = await axios.get(`${backendUrl}/api/v1/requests-311`, {
      params: queryParams,
      timeout: 5000, // THỢ RÈN: Ép timeout ngắn để không treo LLM
      headers: {
        'Content-Type': 'application/json',
      }
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
    // THỢ RÈN: Tuyệt đối không dùng getMockRequestsData(). Báo lỗi thẳng cho LLM.
    return {
      success: false,
      data: null, // Bắt buộc null
      total: 0,
      source: 'error',
      error: 'API_UNAVAILABLE',
      message: 'Hệ thống yêu cầu 311 hiện không phản hồi. Hãy khuyên người dùng gọi trực tiếp 311.'
    };
  }
}

// MOCK DATA ĐÃ BỊ XÓA - KHÔNG DÙNG DATA ẢO KHI BACKEND SẬP
// THỢ RÈN: Circuit breaker pattern - không có fallback data ảo
