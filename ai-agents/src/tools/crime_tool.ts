// ai-agents/src/tools/crime_tool.ts
import axios from 'axios';

// Thêm Type cho Response để LLM không bị ảo giác
export interface ToolResponse {
  success: boolean;
  data: any[] | null;
  total: number;
  source: string;
  error?: string;
  message?: string;
}

export async function queryCrimeTool(params: {
  neighborhood?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<ToolResponse> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    
    // Build query parameters
    const queryParams: any = {
      limit: params.limit || 10,
    };
    
    if (params.neighborhood) {
      queryParams.neighborhood = params.neighborhood;
    }
    
    // Make request to backend API
    const response = await axios.get(`${backendUrl}/api/v1/crime`, {
      params: queryParams,
      timeout: 5000, // THỢ RÈN: Ép timeout ngắn để không treo LLM
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Crime tool response:', { 
      dataCount: response.data.data?.length || 0,
      total: response.data.total 
    });
    
    return { 
      success: true, 
      data: response.data.data || [], 
      total: response.data.total || 0, 
      source: 'backend_api' 
    };
    
  } catch (error) {
    console.error('[CIRCUIT BREAKER] Crime tool failed:', error);
    // THỢ RÈN: Tuyệt đối không dùng getMockCrimeData(). Báo lỗi thẳng cho LLM.
    return {
      success: false,
      data: null, // Bắt buộc null
      total: 0,
      source: 'error',
      error: 'API_UNAVAILABLE',
      message: 'Hệ thống cơ sở dữ liệu tội phạm hiện không phản hồi. Hãy khuyên người dùng thông cảm và gọi trực tiếp cho cảnh sát.'
    };
  }
}

// MOCK DATA ĐÃ BỊ XÓA - KHÔNG DÙNG DATA ẢO KHI BACKEND SẬP
// THỢ RÈN: Circuit breaker pattern - không có fallback data ảo
