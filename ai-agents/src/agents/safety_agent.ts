// ai-agents/src/agents/safety_agent.ts
import { z } from 'genkit';
import { queryCrimeTool } from '../tools/crime_tool';

export async function safetyAgent(ai: any, input: any): Promise<any> {
  try {
    console.log('Safety agent processing request:', { message: input.message });

    // Extract relevant information from the user's message
    const locationContext = input.userLocation ? 
      `User location: ${input.userLocation.lat}, ${input.userLocation.lng}` : '';
    
    const historyContext = input.history && input.history.length > 0 ?
      `Recent conversation: ${input.history.slice(-2).map((h: any) => `${h.role}: ${h.content}`).join(' | ')}` : '';

    // Use tools to get relevant crime data
    let crimeData = null;
    try {
      crimeData = await queryCrimeTool({
        neighborhood: extractNeighborhood(input.message),
        limit: 10,
        userLocation: input.userLocation
      });
    } catch (toolError) {
      console.warn('Crime tool failed:', toolError);
    }

    const { text } = await ai.generate({
      prompt: `You are a safety intelligence expert for Montgomery, Alabama. You have access to recent crime data and can provide safety assessments.

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
    if (neighborhood.toLowerCase() in messageLower) {
      return neighborhood;
    }
  }
  
  return null;
}
