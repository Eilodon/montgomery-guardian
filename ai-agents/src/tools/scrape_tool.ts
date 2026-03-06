// ai-agents/src/tools/scrape_tool.ts
import axios from 'axios';

export async function scrapeTool(params: {
  query: string;
  limit?: number;
  userLocation?: { lat: number; lng: number };
}): Promise<any> {
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
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Scrape tool response:', { 
      dataCount: response.data.data?.length || 0,
      total: response.data.total 
    });
    
    return {
      success: true,
      data: response.data.data || [],
      total: response.data.total || 0,
      source: 'backend_api',
      query: params.query
    };
    
  } catch (error) {
    console.error('Scrape tool error:', error);
    
    // Return mock data on failure
    return {
      success: false,
      data: getMockAlertData(params.query, params.limit),
      total: 3,
      source: 'mock_data',
      query: params.query,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getMockAlertData(query: string, limit: number = 5): any[] {
  const mockData = [
    {
      id: 'mock_alert_1',
      title: 'Emergency Road Closure on I-65',
      summary: 'Multi-vehicle accident causing complete closure of I-65 Northbound near Exit 167.',
      severity: 'critical',
      source: 'Montgomery Police Department',
      sourceUrl: 'https://www.montgomeryal.gov/city-government/departments/police',
      timestamp: new Date().toISOString(),
      coordinates: [32.3617, -86.2792],
      affectedNeighborhood: 'Downtown'
    },
    {
      id: 'mock_alert_2',
      title: 'Increased Police Patrols in Oak Park',
      summary: 'Montgomery PD reports increased patrols in Oak Park neighborhood this weekend.',
      severity: 'medium',
      source: 'Montgomery City Government',
      sourceUrl: 'https://www.montgomeryal.gov/news',
      timestamp: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      coordinates: [32.3500, -86.2900],
      affectedNeighborhood: 'Oak Park'
    },
    {
      id: 'mock_alert_3',
      title: 'Traffic Incident on Dexter Avenue',
      summary: 'Minor traffic incident on Dexter Avenue causing temporary lane closures.',
      severity: 'high',
      source: 'WSFA News',
      sourceUrl: 'https://wsfa.com/crime',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      coordinates: [32.3625, -86.2800],
      affectedNeighborhood: 'Downtown'
    }
  ];
  
  // Filter based on query keywords
  const queryLower = query.toLowerCase();
  let filteredData = mockData;
  
  if (queryLower.includes('critical') || queryLower.includes('emergency')) {
    filteredData = mockData.filter(alert => alert.severity === 'critical');
  } else if (queryLower.includes('high')) {
    filteredData = mockData.filter(alert => alert.severity === 'high');
  } else if (queryLower.includes('medium')) {
    filteredData = mockData.filter(alert => alert.severity === 'medium');
  } else if (queryLower.includes('low')) {
    filteredData = mockData.filter(alert => alert.severity === 'low');
  }
  
  return filteredData.slice(0, limit);
}
