// ai-agents/src/tools/crime_tool.ts
import axios from 'axios';

export async function queryCrimeTool(params: {
  neighborhood?: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<any> {
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
      timeout: 10000,
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
    console.error('Crime tool error:', error);
    
    // Return mock data on failure
    return {
      success: false,
      data: getMockCrimeData(params.neighborhood, params.limit),
      total: 3,
      source: 'mock_data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getMockCrimeData(neighborhood?: string, limit: number = 10): any[] {
  const mockData = [
    {
      id: 'mock_crime_1',
      type: 'property',
      latitude: 32.3617,
      longitude: -86.2792,
      neighborhood: neighborhood || 'Downtown',
      timestamp: new Date().toISOString(),
      status: 'open',
      description: 'Burglary reported on Commerce Street'
    },
    {
      id: 'mock_crime_2',
      type: 'violent',
      latitude: 32.3625,
      longitude: -86.2800,
      neighborhood: neighborhood || 'Capitol Heights',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      status: 'investigating',
      description: 'Assault investigation ongoing'
    },
    {
      id: 'mock_crime_3',
      type: 'drug',
      latitude: 32.3600,
      longitude: -86.2785,
      neighborhood: neighborhood || 'Oak Park',
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      status: 'closed',
      description: 'Drug possession case resolved'
    }
  ];
  
  return mockData.slice(0, limit);
}
