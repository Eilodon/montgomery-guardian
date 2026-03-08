// ai-agents/src/agents/web_agent.ts
import { scrapeTool, ToolResponse } from '../tools/scrape_tool';
import { AgentInput } from '../types/agents';

export async function webAgent(ai: any, input: AgentInput): Promise<any> {
  try {
    console.log('Web agent processing request:', { message: input.message });

    // Extract relevant information from the user's message
    const locationContext = input.userLocation ? 
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';
    
    const historyContext = input.history && input.history.length > 0 ?
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // Use tools to get recent web data
    let webData = null;
    let webContext = '';
    try {
      const toolRes = await scrapeTool({
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
      console.warn('Web scraping tool failed:', toolError);
      webContext = '\nLưu ý hệ thống: Không thể truy cập thông tin thời gian thực hiện tại.';
    }

    const { text } = await ai.generate({
      prompt: `You are a web intelligence expert for Montgomery, Alabama. You have access to recent news and city updates.

${locationContext}
${historyContext}
${webData ? `Recent web information: ${JSON.stringify(webData).substring(0, 500)}...` : ''}
${webContext}

User question: "${input.message}"

Provide a helpful response that:
1. Addresses their question about current events or news
2. Provides recent updates if available
3. Mentions sources when possible
4. Focuses on Montgomery, Alabama relevant information
5. Includes practical information about road closures, events, or city updates
6. Maintains a professional, informative tone

Common topics people ask about:
- Road closures and traffic updates
- City events and announcements
- Emergency situations
- Weather-related impacts
- City council decisions
- Community updates

Keep response under 200 words. Focus on recent, relevant information for Montgomery residents.`,
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
    console.error('Web agent failed:', error);
    return {
      content: 'I apologize, but I\'m having trouble accessing current web information right now. For the latest Montgomery news and updates, please check the official Montgomery city website or local news sources like WSFA and the Montgomery Advertiser.',
      agentType: 'web_scraper',
      metadata: { error: 'web_agent_failed' }
    };
  }
}
