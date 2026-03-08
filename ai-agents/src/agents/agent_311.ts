// ai-agents/src/agents/agent_311.ts
import { queryRequestsTool, ToolResponse } from '../tools/requests_tool';
import { ragService } from '../rag';
import { AgentInput } from '../types/agents';

export async function agent311(ai: any, input: AgentInput): Promise<any> {
  try {
    console.log('311 agent processing request:', { message: input.message });

    // Extract relevant information from the user's message
    const locationContext = input.userLocation ?
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';

    const historyContext = input.history && input.history.length > 0 ?
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // Use RAG to get relevant 311 policies and procedures
    let ragContext = '';
    try {
      const ragResult = await ragService.searchKnowledge(
        input.message,
        'service_requests',
        3
      );

      if (ragResult.results.length > 0) {
        ragContext = '\nRelevant 311 policies and procedures:\n' +
          ragResult.results.map(r => `- ${r.document.substring(0, 200)}...`).join('\n');
      }
    } catch (ragError) {
      console.warn('RAG search failed:', ragError);
    }

    // Use tools to get relevant 311 data
    let requestData = null;
    try {
      const toolRes = await queryRequestsTool({
        service_type: extractServiceType(input.message) || undefined,
        status: extractStatus(input.message) || undefined,
        limit: 10,
        userLocation: input.userLocation
      });
      if (toolRes.success) {
        requestData = toolRes.data;
      } else {
        // Nhét thông báo lỗi của Tool vào context để LLM biết đường trả lời
        ragContext += `\nLưu ý hệ thống: ${toolRes.message}`;
      }
    } catch (toolError) {
      console.warn('311 tool failed:', toolError);
      ragContext += '\nLưu ý hệ thống: Không thể truy cập dữ liệu yêu cầu 311 hiện tại.';
    }

    const { text } = await ai.generate({
      prompt: `You are a 311 service expert for Montgomery, Alabama. You help citizens with city service requests and issues.

${locationContext}
${historyContext}
${ragContext}
${requestData ? `Recent 311 requests in area: ${JSON.stringify(requestData).substring(0, 500)}...` : ''}

User question: "${input.message}"

Provide a helpful response that:
1. Addresses their specific 311 service question
2. References relevant city policies and procedures when available
3. Provides relevant service request information if available
4. Explains how to submit or check 311 requests
5. Suggests appropriate contact methods (online, phone, app)
6. Includes relevant timelines or expectations
7. Maintains a helpful, service-oriented tone

Common 311 services in Montgomery:
- Potholes and road repair
- Graffiti removal
- Trash collection issues
- Flooding and drainage
- Overgrown grass/vegetation
- Street light repairs
- Code enforcement

Keep response under 200 words. Focus on Montgomery, Alabama services.`,
    });

    return {
      content: text,
      agentType: 'service_311',
      metadata: {
        source: '311_agent',
        hasRequestData: !!requestData,
        userLocation: input.userLocation
      }
    };

  } catch (error) {
    console.error('311 agent failed:', error);
    return {
      content: 'I apologize, but I\'m having trouble accessing 311 service information right now. You can submit 311 requests through the Montgomery 311 website, call 311, or use the Montgomery 311 mobile app.',
      agentType: 'service_311',
      metadata: { error: '311_agent_failed' }
    };
  }
}

function extractServiceType(message: string): string | null {
  const serviceTypes = {
    'pothole': ['pothole', 'road', 'street', 'pavement', 'asphalt', 'hole'],
    'graffiti': ['graffiti', 'vandalism', 'tag', 'spray paint', 'defacement'],
    'trash': ['trash', 'garbage', 'waste', 'litter', 'dumping', 'bin'],
    'flooding': ['flood', 'water', 'drainage', 'sewer', 'standing water'],
    'overgrown_grass': ['grass', 'vegetation', 'weeds', 'overgrown', 'lawn', 'landscaping']
  };

  const messageLower = message.toLowerCase();
  for (const [serviceType, keywords] of Object.entries(serviceTypes)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      return serviceType;
    }
  }

  return null;
}

function extractStatus(message: string): string | null {
  const statuses = ['open', 'closed', 'in_progress', 'pending'];
  const messageLower = message.toLowerCase();

  for (const status of statuses) {
    if (messageLower.includes(status)) {
      return status;
    }
  }

  return null;
}
