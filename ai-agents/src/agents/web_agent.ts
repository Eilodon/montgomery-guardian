// ai-agents/src/agents/web_agent.ts
import { fetchAlertsTool } from '../tools/scrape_tool';
import { AgentInput, ToolResponse } from '../types/agents';
import { sanitizeForPrompt } from '../utils/prompt_sanitizer';
import { logger } from '../utils/logger';

export async function webAgent(ai: any, input: AgentInput): Promise<any> {
  try {
    logger.agentStart('CityAlerts', input.message.length, !!input.userLocation);

    // Extract relevant information from the user's message
    const locationContext = input.userLocation ?
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';

    const historyContext = input.history && input.history.length > 0 ?
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // Use tools to get recent web data
    let webData = null;
    let webContext = '';
    try {
      const toolRes = await fetchAlertsTool({
        query: input.message,
        limit: 5,
        userLocation: input.userLocation
      });
      if (toolRes.success) {
        webData = toolRes.data;
      } else {
        // Nhét thông báo lỗi của Tool vào context để LLM biết đường trả lời
        webContext = `\nLưu ý hệ thống: ${toolRes.message}`;
      }
    } catch (toolError) {
      logger.error('AlertsTool', toolError);
      webContext = '\nLưu ý hệ thống: Không thể truy cập thông tin cảnh báo thời gian thực hiện tại.';
    }

    const { text } = await ai.generate({
      prompt: `You are a city alerts and updates expert for Montgomery, Alabama.
You have access to the city's official alert and notification database.

CONTEXT:
${locationContext}
${historyContext}
${webData ? `Recent web information: ${JSON.stringify(sanitizeForPrompt(webData)).substring(0, 400)}` : 'No real-time news data available.'}
${webContext}

USER QUESTION: "${input.message}"

RESPONSE GUIDELINES:
1. Address the user's specific concern about current events or city news
2. Reference information from the web context when available
3. Provide practical information (road closures, events, weather impacts, etc.)
4. Suggest further resources or official Montgomery city news sources if needed
5. Maintain a professional, informative, and timely tone

Keep response under 200 words. Focus on Montgomery, Alabama context.`,
    });

    return {
      content: text,
      agentType: 'web_scraper',
      metadata: {
        source: 'web_agent',
        hasWebData: !!webData,
        userLocation: input.userLocation
      }
    };

  } catch (error) {
    logger.error('CityAlertsAgent', error);
    return {
      content: 'I apologize, but I\'m having trouble accessing current city alerts right now. For the latest Montgomery news and updates, please check the official Montgomery city website or local news sources.',
      agentType: 'web_scraper',
      metadata: { error: 'city_alerts_agent_failed' }
    };
  }
}
