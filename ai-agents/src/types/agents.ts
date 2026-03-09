// ai-agents/src/types/agents.ts
import { z } from 'genkit';

// Constants for validation
const MESSAGE_MIN_LENGTH = 1;
const MESSAGE_MAX_LENGTH = 2000;
const HISTORY_MAX_ITEMS = 20;
const CONTENT_MAX_LENGTH = 5000;

export const UserLocationSchema = z.object({
    lat: z.number().min(-90).max(90),    // Valid latitude range
    lng: z.number().min(-180).max(180),  // Valid longitude range
});

export const HistoryMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(CONTENT_MAX_LENGTH),
});

export const AgentInputSchema = z.object({
    message: z.string()
        .min(MESSAGE_MIN_LENGTH, 'Message cannot be empty')
        .max(MESSAGE_MAX_LENGTH, `Message exceeds ${MESSAGE_MAX_LENGTH} character limit`)
        .transform(s => s.trim()),

    language: z.enum(['en', 'es', 'vi']).default('en').optional(),

    userLocation: UserLocationSchema.optional(),

    history: z.array(HistoryMessageSchema)
        .max(HISTORY_MAX_ITEMS, `History depth exceeds ${HISTORY_MAX_ITEMS} messages`)
        .optional(),

    context: z.record(z.any()).optional(),
});

export type AgentInput = z.infer<typeof AgentInputSchema>;

// Tool Response Types cho Circuit Breaker - SINGLE SOURCE OF TRUTH
export const ToolResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.any()).nullable(),
    total: z.number(),
    source: z.string(),
    query: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
});

export type ToolResponse = z.infer<typeof ToolResponseSchema>;

// Guardian Response Types
export const GuardianResponseSchema = z.object({
    safe: z.boolean(),
    reason: z.string().optional(),
    content: z.string().optional(),
});

export type GuardianResponse = z.infer<typeof GuardianResponseSchema>;

// Intent Classification Types
export const IntentResponseSchema = z.object({
    agentType: z.enum(['safety_intel', 'service_311', 'web_scraper', 'general']),
    confidence: z.number(),
});

export type IntentResponse = z.infer<typeof IntentResponseSchema>;

// Orchestrator Response Types
export const OrchestratorResponseSchema = z.object({
    content: z.string(),
    agentType: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.any()).optional(),
});

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;
