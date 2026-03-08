// ai-agents/src/types/agents.ts
import { z } from 'genkit';

export const UserLocationSchema = z.object({
    lat: z.number(),
    lng: z.number()
});

export const HistoryMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
});

export const AgentInputSchema = z.object({
    message: z.string(),
    language: z.enum(['en', 'es', 'vi']).default('en').optional(),
    userLocation: UserLocationSchema.optional(),
    history: z.array(HistoryMessageSchema).optional(),
    context: z.record(z.any()).optional()
});

export type AgentInput = z.infer<typeof AgentInputSchema>;

// Tool Response Types cho Circuit Breaker
export const ToolResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.any()).nullable(),
    total: z.number(),
    source: z.string(),
    query: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional()
});

export type ToolResponse = z.infer<typeof ToolResponseSchema>;

// Guardian Response Types
export const GuardianResponseSchema = z.object({
    safe: z.boolean(),
    reason: z.string().optional(),
    content: z.string().optional()
});

export type GuardianResponse = z.infer<typeof GuardianResponseSchema>;

// Intent Classification Types
export const IntentResponseSchema = z.object({
    agentType: z.enum(['safety_intel', 'service_311', 'web_scraper', 'general']),
    confidence: z.number()
});

export type IntentResponse = z.infer<typeof IntentResponseSchema>;

// Orchestrator Response Types
export const OrchestratorResponseSchema = z.object({
    content: z.string(),
    agentType: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.any()).optional()
});

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;
