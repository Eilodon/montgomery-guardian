// ai-agents/src/agents/orchestrator.ts
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { safetyAgent } from './safety_agent';
import { agent311 } from './agent_311';
import { webAgent } from './web_agent';
import { scrutinizePrompt, scrutinizeOutput } from './guardian';

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-flash-latest',
});

// Intent classifier - routes to correct agent
const classifyIntent = ai.defineFlow(
  {
    name: 'classifyIntent',
    inputSchema: z.string(),
    outputSchema: z.object({
      agentType: z.enum(['safety_intel', 'service_311', 'web_scraper', 'general']),
      confidence: z.number(),
    }),
  },
  async (message) => {
    try {
      const { output } = await ai.generate({
        prompt: `Classify this message into one category:
- "safety_intel": questions about crime, safety scores, dangerous areas, patrol, emergency
- "service_311": questions about potholes, trash, graffiti, city services, request status, permits
- "web_scraper": questions about current news, road closures, today's events, real-time city updates
- "general": everything else

Message: "${message}"

Respond with JSON only: { "agentType": "...", "confidence": 0.0-1.0 }`,
        output: { format: 'json' },
      });

      const result = output as any;

      // Validate the response
      if (!result.agentType || !result.confidence) {
        console.warn('Invalid intent classification response:', result);
        return { agentType: 'general', confidence: 0.5 };
      }

      return result;
    } catch (error) {
      console.error('Intent classification failed:', error);
      return { agentType: 'general', confidence: 0.3 };
    }
  }
);

// Main orchestrator flow
export const orchestratorFlow = ai.defineFlow(
  {
    name: 'orchestrator',
    inputSchema: z.object({
      message: z.string(),
      history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).optional().default([]),
      language: z.enum(['en', 'es', 'vi']).default('en'),
      userLocation: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional(),
      context: z.record(z.any()).optional().default({}),
    }),
    outputSchema: z.object({
      content: z.string(),
      agentType: z.string(),
      timestamp: z.string(),
      metadata: z.record(z.any()).optional(),
    }),
  },
  async (input) => {
    try {
      console.log('Orchestrator processing message:', {
        message: input.message,
        language: input.language
      });

      // 0. Safety Scrutiny (Prompt)
      const safetyCheck = await scrutinizePrompt(ai, input.message);
      if (!safetyCheck.safe) {
        return {
          content: `Safety Alert: ${safetyCheck.reason || 'Your message contains content that violates our safety policies.'}`,
          agentType: 'guardian',
          timestamp: new Date().toISOString(),
          metadata: { safetyViolation: true }
        };
      }

      // 1. Classify intent
      const { agentType, confidence } = await classifyIntent(input.message);

      console.log('Intent classified:', { agentType, confidence });

      // 2. Route to correct agent
      let response;
      switch (agentType) {
        case 'safety_intel':
          response = await safetyAgent(ai, input);
          break;
        case 'service_311':
          response = await agent311(ai, input);
          break;
        case 'web_scraper':
          response = await webAgent(ai, input);
          break;
        default:
          response = await generalResponse(ai, input);
      }

      // 2.5 Safety Scrutiny (Output)
      if (response.content) {
        const outputCheck = await scrutinizeOutput(ai, response.content, agentType);
        response.content = outputCheck.content;
      }

      // 3. Translate if needed
      if (input.language !== 'en' && response.content) {
        response.content = await translateResponse(ai, response.content, input.language);
      }

      // 4. Add metadata
      const result = {
        ...response,
        agentType,
        timestamp: new Date().toISOString(),
        metadata: {
          ...response.metadata,
          confidence,
          originalLanguage: input.language,
          userLocation: input.userLocation,
        }
      };

      console.log('Orchestrator response generated:', {
        agentType: result.agentType,
        contentLength: result.content?.length || 0
      });

      return result;
    } catch (error) {
      console.error('Orchestrator flow error:', error);

      // Fallback response
      return {
        content: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
        agentType: 'general',
        timestamp: new Date().toISOString(),
        metadata: { error: 'orchestrator_failed' }
      };
    }
  }
);

// General response handler
async function generalResponse(ai: any, input: any): Promise<any> {
  try {
    const { text } = await ai.generate({
      prompt: `You are Montgomery Guardian, an AI assistant for the city of Montgomery, Alabama.
      
Answer this question helpfully and concisely: "${input.message}"

Guidelines:
- Keep response under 150 words
- Be helpful and professional
- If you don't know something, say so honestly
- Focus on Montgomery, Alabama when possible`,
    });

    return {
      content: text,
      agentType: 'general',
      metadata: { source: 'general_llm' }
    };
  } catch (error: any) {
    console.error('General response failed:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack
    });
    return {
      content: 'I\'m here to help with questions about Montgomery, Alabama. Could you please rephrase your question?',
      agentType: 'general',
      metadata: { error: 'general_response_failed' }
    };
  }
}

// Translation function
async function translateResponse(ai: any, content: string, language: string): Promise<string> {
  try {
    const langNames = {
      es: 'Spanish',
      vi: 'Vietnamese'
    };

    const { text } = await ai.generate({
      prompt: `Translate this to ${langNames[language as keyof typeof langNames]} exactly, preserving meaning and tone: "${content}"`,
    });

    return text || content; // Fallback to original if translation fails
  } catch (error) {
    console.error('Translation failed:', error);
    return content; // Return original content if translation fails
  }
}
