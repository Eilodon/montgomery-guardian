// ai-agents/src/utils/logger.ts

/**
 * Mask PII trước khi log. Dùng thay cho console.log trực tiếp.
 */
export const logger = {
    agentStart: (agentName: string, messageLength: number, hasLocation: boolean) => {
        console.log(`[${agentName}] Processing:`, { messageLength, hasLocation });
    },
    orchestratorRoute: (agentType: string, confidence: number) => {
        console.log('[Orchestrator] Route decision:', { agentType, confidence });
    },
    toolResult: (toolName: string, dataCount: number, total: number) => {
        console.log(`[Tool:${toolName}] Response:`, { dataCount, total });
    },
    info: (context: string, data: any) => {
        console.log(`[INFO:${context}]`, data);
    },
    error: (context: string, error: unknown) => {
        console.error(`[ERROR:${context}]`, error instanceof Error ? error.message : 'Unknown error');
    }
};
