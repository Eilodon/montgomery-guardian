// ai-agents/src/agents/safety_agent.ts
import { z } from 'genkit';
import { queryCrimeTool, ToolResponse } from '../tools/crime_tool';
import { ragService } from '../rag';
import { AgentInput } from '../types/agents';

export async function safetyAgent(ai: any, input: AgentInput): Promise<any> {
  try {
    console.log('Safety agent processing request:', { message: input.message });

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
        'crime_incidents',
        3
      );

      if (ragResult.results.length > 0) {
        ragContext = '\nRelevant crime statistics and safety information:\n' +
          ragResult.results.map(r => `- ${r.document.substring(0, 200)}...`).join('\n');
      }
    } catch (ragError) {
      console.warn('RAG search failed:', ragError);
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
      console.warn('Crime tool failed:', toolError);
      ragContext += '\nLưu ý hệ thống: Không thể truy cập dữ liệu an toàn công cộng hiện tại.';
    }

    const { text } = await ai.generate({
      prompt: `You are a safety intelligence expert for Montgomery, Alabama. You have access to recent crime data and can provide safety assessments.

${locationContext}
${historyContext}
${ragContext}
${crimeData ? `Recent crime data: ${JSON.stringify(crimeData).substring(0, 500)}...` : ''}

User question: "${input.message}"

Provide a helpful response that:
1. Addresses their specific safety concern
2. References relevant crime statistics when available
3. Provides safety recommendations based on data
4. Suggests appropriate safety measures
5. Maintains a helpful, reassuring tone
6. Avoids causing unnecessary alarm
7. Provides official resources when relevant

${locationContext}
${historyContext}
${crimeData ? `Recent crime data in area: ${JSON.stringify(crimeData).substring(0, 500)}...` : ''}

User question: "${input.message}"

Provide a helpful, safety-focused response that:
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
    console.error('Safety agent failed:', error);
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
