// ai-agents/src/agents/safety_agent.ts
import { z } from 'genkit';
import { queryCrimeTool } from '../tools/crime_tool';
import { ragService } from '../rag';
import { AgentInput, ToolResponse } from '../types/agents';
import { logger } from '../utils/logger';
import { sanitizeForPrompt, safeJsonStringify } from '../utils/prompt_sanitizer';

export async function safetyAgent(ai: any, input: AgentInput): Promise<any> {
  try {
    logger.agentStart('Safety', input.message.length, !!input.userLocation);

    // Extract relevant information from the user's message
    const locationContext = input.userLocation ?
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';

    const historyContext = input.history && input.history.length > 0 ?
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // Use RAG to get relevant crime statistics and safety policies
    let ragContext = '';
    try {
      const ragResult = await ragService.searchKnowledge(
        input.message,
        'crime', // Đồng bộ với metadata trong chroma_setup.py
        3
      );

      if (ragResult.results.length > 0) {
        ragContext = `Dưới đây là một số thông tin liên quan từ cơ sở dữ liệu chính sách và an toàn:\n${ragResult.results.map((r: any) => `- ${r.document.substring(0, 200)}...`).join('\n')}`;
      }
    } catch (ragError) {
      logger.error('SafetyRAG', ragError);
    }

    // Use tools to get relevant crime data
    let crimeData = null;
    try {
      const toolRes = await queryCrimeTool({
        neighborhood: extractNeighborhood(input.message) || undefined,
        limit: 10,
        userLocation: input.userLocation
      });
      if (toolRes.success) {
        crimeData = toolRes.data;
      } else {
        // Nhét thông báo lỗi của Tool vào context để LLM biết đường trả lời
        ragContext += `\nLưu ý hệ thống: ${toolRes.message}`;
      }
    } catch (toolError) {
      logger.error('SafetyTool', toolError);
      ragContext += '\nLưu ý hệ thống: Không thể truy cập dữ liệu an toàn công cộng hiện tại.';
    }

    const { text } = await ai.generate({
      prompt: `You are a safety intelligence expert for Montgomery, Alabama.
You have access to recent crime data and safety statistics.

CONTEXT:
${locationContext}
${historyContext}
${ragContext}
${crimeData ? `Recent crime data: ${safeJsonStringify(sanitizeForPrompt(crimeData), 3)}` : 'No specific crime data available for this request.'}
1. Addresses their specific safety concern
2. Provides relevant crime statistics if available
3. Offers practical safety advice
4. Suggests appropriate resources or contacts
5. Maintains a professional but reassuring tone

Keep response under 200 words. Focus on Montgomery, Alabama context.`,
    });

    return {
      content: text,
      agentType: 'safety_intel',
      metadata: {
        source: 'safety_agent',
        hasCrimeData: !!crimeData,
        userLocation: input.userLocation
      }
    };

  } catch (error) {
    logger.error('SafetyAgent', error);
    return {
      content: 'I apologize, but I\'m having trouble accessing safety information right now. For immediate safety concerns, please contact Montgomery Police Department at (334) 625-2531 or call 911 for emergencies.',
      agentType: 'safety_intel',
      metadata: { error: 'safety_agent_failed' }
    };
  }
}

function extractNeighborhood(message: string): string | null {
  const neighborhoods = [
    'Downtown', 'Capitol Heights', 'Oak Park', 'Garden District',
    'Cloverdale', 'Old Cloverdale', 'Bellevue', 'Chisholm',
    'Highland Park', 'Tulane', 'Washington Park', 'Wyndridge'
  ];

  const messageLower = message.toLowerCase();
  for (const neighborhood of neighborhoods) {
    if (messageLower.includes(neighborhood.toLowerCase())) {
      return neighborhood;
    }
  }

  return null;
}
