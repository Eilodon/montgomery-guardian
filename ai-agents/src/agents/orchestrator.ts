// ai-agents/src/agents/orchestrator.ts
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { safetyAgent } from './safety_agent';
import { agent311 } from './agent_311';
import { webAgent } from './web_agent';
import { scrutinizePrompt, scrutinizeOutput } from './guardian';
import { preFilterMessage } from '../utils/security_filter';
import { logger } from '../utils/logger';

// Initialize Genkit with Google AI plugin
export const ai = genkit({
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
      logger.agentStart('Orchestrator', input.message.length, !!input.userLocation);

      // ═══ TIER 0: Rule-based filter (0ms, 0 LLM cost) ═══
      const preFilter = preFilterMessage(input.message);
      if (preFilter.blocked) {
        return {
          content: 'I\'m unable to process this request.',
          agentType: 'guardian',
          timestamp: new Date().toISOString(),
          metadata: { safetyViolation: true, tier: 'rule_based' }
        };
      }

      // ═══ TIER 1: LLM Guardian — chỉ khi cần thiết ═══
      let safetyCheck: { safe: boolean; reason?: string } = { safe: true };
      if (preFilter.tier === 'llm_required') {
        safetyCheck = await scrutinizePrompt(ai, input.message);
        if (!safetyCheck.safe) {
          return {
            content: `Unable to process: ${safetyCheck.reason || 'Safety policy violation.'}`,
            agentType: 'guardian',
            timestamp: new Date().toISOString(),
            metadata: { safetyViolation: true, tier: 'llm_guardian' }
          };
        }
      }

      // ═══ GATE 2: Chỉ sau khi Guardian pass mới classify ═══
      const intentResult = await classifyIntent(input.message)
        .catch(() => ({ agentType: 'general' as const, confidence: 0 }));

      const ROUTING_CONFIG = {
        CONFIDENCE_THRESHOLD: 0.6,
        // Nếu confidence thấp, fallback về general thay vì route sai
        FALLBACK_AGENT: 'general' as const,
      } as const;

      const { agentType: rawAgentType, confidence } = intentResult;
      const agentType = confidence >= ROUTING_CONFIG.CONFIDENCE_THRESHOLD
        ? rawAgentType
        : ROUTING_CONFIG.FALLBACK_AGENT;

      logger.orchestratorRoute(agentType, confidence);

      // ═══ GATE 3: Route tới agent tương ứng ═══
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
      if (response && response.content) {
        const outputCheck = await scrutinizeOutput(ai, response.content, agentType);
        response.content = outputCheck.content;
      }

      // 3. Translate if needed
      if (input.language !== 'en' && response.content) {
        const translated = await translateResponse(ai, response.content, input.language);

        // Re-scrutinize translated content — CHẶN biến chất khi dịch
        const translationCheck = await scrutinizeOutput(ai, translated, `${agentType}_translated`);
        response.content = translationCheck.content;
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

      logger.info('Orchestrator', {
        agentType: result.agentType,
        contentLength: result.content?.length || 0
      });

      return result;
    } catch (error) {
      logger.error('OrchestratorFlow', error);

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
    logger.error('GeneralResponse', error);
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
    logger.error('Translation', error);
    return content; // Return original content if translation fails
  }
}
