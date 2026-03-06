// ai-agents/src/tools/requests_tool.ts
import axios from 'axios';

export async function queryRequestsTool(params: {
  service_type?: string;
  status?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<any> {
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
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('311 requests tool response:', { 
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
    console.error('311 requests tool error:', error);
    
    // Return mock data on failure
    return {
      success: false,
      data: getMockRequestsData(params.service_type, params.status, params.limit),
      total: 3,
      source: 'mock_data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getMockRequestsData(serviceType?: string, status?: string, limit: number = 10): any[] {
  const mockData = [
    {
      requestId: 'mock_311_1',
      serviceType: serviceType || 'pothole',
      status: status || 'open',
      latitude: 32.3617,
      longitude: -86.2792,
      address: '123 Commerce St, Montgomery, AL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: 'Large pothole causing traffic hazard',
      estimatedResolutionDays: 3
    },
    {
      requestId: 'mock_311_2',
      serviceType: serviceType || 'graffiti',
      status: status || 'in_progress',
      latitude: 32.3625,
      longitude: -86.2800,
      address: '456 Dexter Ave, Montgomery, AL',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date().toISOString(),
      description: 'Graffiti on public building',
      estimatedResolutionDays: 2
    },
    {
      requestId: 'mock_311_3',
      serviceType: serviceType || 'trash',
      status: status || 'closed',
      latitude: 32.3600,
      longitude: -86.2785,
      address: '789 Perry St, Montgomery, AL',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      description: 'Overflowing public trash can',
      estimatedResolutionDays: 1
    }
  ];
  
  return mockData.slice(0, limit);
}
