// ai-agents/src/agents/agent_311.ts
import { queryRequestsTool } from '../tools/requests_tool';
import { ragService } from '../rag';
import { AgentInput, ToolResponse } from '../types/agents';
import { logger } from '../utils/logger';
import { sanitizeForPrompt, safeJsonStringify } from '../utils/prompt_sanitizer';

export async function agent311(ai: any, input: AgentInput): Promise<any> {
  try {
    logger.agentStart('311', input.message.length, !!input.userLocation);

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
        'service_request', // Đồng bộ với metadata trong chroma_setup.py
        3
      );

      if (ragResult.results.length > 0) {
        ragContext = `Dưới đây là thông tin về các quy định và dịch vụ 311 liên quan:\n${ragResult.results.map((r: any) => `- ${r.document.substring(0, 200)}...`).join('\n')}`;
      }
    } catch (ragError) {
      logger.error('311_RAG', ragError);
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
      logger.error('311_Tool', toolError);
      ragContext += '\nLưu ý hệ thống: Không thể truy cập dữ liệu yêu cầu 311 hiện tại.';
    }

    // 3. Generate response with tool-enriched context
    const { text } = await ai.generate({
      prompt: `You are a helpful 311 service assistant for Montgomery, Alabama.
You help citizens report and track city service requests (potholes, graffiti, trash, etc.).

CONTEXT:
${locationContext}
${historyContext}
${ragContext}
${requestData ? `Recent 311 request data: ${safeJsonStringify(sanitizeForPrompt(requestData), 3)}` : 'No specific 311 request data available for this query.'}
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
    logger.error('Agent311', error);
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
