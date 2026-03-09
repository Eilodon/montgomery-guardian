// ai-agents/src/agents/safety_agent.ts
import { z } from 'genkit';
import { queryCrimeTool } from '../tools/crime_tool';
import { ragService } from '../rag';
import { AgentInput, ToolResponse } from '../types/agents';
import { logger } from '../utils/logger';
import { sanitizeForPrompt, safeJsonStringify } from '../utils/prompt_sanitizer';

// SCHEMA TRÍCH XUẤT THÔNG MINH
const LocationExtractionSchema = z.object({
    neighborhood: z.enum([
      'Downtown', 'Capitol Heights', 'Oak Park', 'Garden District',
      'Cloverdale', 'Old Cloverdale', 'Bellevue', 'Chisholm',
      'Highland Park', 'Tulane', 'Washington Park', 'Wyndridge'
    ]).nullable().describe("Khu vực user đang hỏi đến. Null nếu không nhắc đến."),
});

export async function safetyAgent(ai: any, input: AgentInput): Promise<any> {
  try {
    logger.agentStart('Safety', input.message.length, !!input.userLocation);

    // 1. DÙNG LLM ĐỂ TRÍCH XUẤT NGỮ CẢNH (Không dùng .includes ngớ ngẩn nữa)
    let targetNeighborhood: string | undefined = undefined;
    try {
        const { output: extraction } = await ai.generate({
            prompt: `Extract specific Montgomery neighborhood user is asking about from their message. 
            Only extract if it's one of the target areas. If they are moving away from an area, don't select it.
            Message: "${input.message}"`,
            output: { schema: LocationExtractionSchema }
        });
        targetNeighborhood = extraction?.neighborhood || undefined;
    } catch (e) {
        logger.error('Entity Extraction Failed', e);
    }

    const locationContext = input.userLocation ? 
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';
    const historyContext = input.history && input.history.length > 0 ? 
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // 2. RAG (Giữ nguyên luồng của bạn)
    let ragContext = '';
    try {
      const ragResult = await ragService.searchKnowledge(input.message, 'crime', 3);
      if (ragResult.results.length > 0) {
        ragContext = `Relevant safety policies:\n${ragResult.results.map((r: any) => `- ${r.document.substring(0, 200)}...`).join('\n')}`;
      }
    } catch (ragError) {
      logger.error('SafetyRAG', ragError);
    }

    // 3. QUERY TOOL VỚI THAM SỐ CHUẨN XÁC
    let crimeData = null;
    try {
      const toolRes = await queryCrimeTool({
        neighborhood: targetNeighborhood, // <-- Giá trị trích xuất từ LLM
        limit: 10,
        userLocation: input.userLocation
      });
      if (toolRes.success) crimeData = toolRes.data;
      else ragContext += `\nLưu ý hệ thống: ${toolRes.message}`;
    } catch (toolError) {
      logger.error('SafetyTool', toolError);
      ragContext += '\nLưu ý hệ thống: Không thể truy cập dữ liệu.';
    }

    // 4. SINH KẾT QUẢ CUỐI (Giữ nguyên luồng prompt của bạn)
    const { text } = await ai.generate({
      prompt: `You are a safety intelligence expert for Montgomery, Alabama.
You have access to recent crime data and safety statistics.

CONTEXT:
${locationContext}
${historyContext}
Target Neighborhood Info: ${targetNeighborhood || 'General City Area'}
${ragContext}
${crimeData ? `Crime data: ${safeJsonStringify(sanitizeForPrompt(crimeData), 3)}` : 'No specific data.'}

Address the user's concern by:
1. Providing relevant crime statistics if available
2. Offering practical safety advice
3. Suggesting appropriate resources or contacts
4. Maintaining a professional but reassuring tone

Keep response under 200 words. Focus on Montgomery, Alabama context.`,
    });

    return {
      content: text,
      agentType: 'safety_intel',
      metadata: { source: 'safety_agent', hasCrimeData: !!crimeData, extractedNeighborhood: targetNeighborhood }
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
