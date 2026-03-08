// ai-agents/src/agents/vision_guard.ts
import { scrutinizeOutput } from './guardian';
import { visionAnalysisFlow } from './vision_agent';

// Danh sách incidentType hợp lệ — whitelist strict
const VALID_INCIDENT_TYPES = new Set([
    'pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other'
]);
const VALID_SEVERITIES = new Set(['high', 'medium', 'low']);

export interface VisionInput {
    imageBase64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    lat?: number;
    lng?: number;
}

export async function guardedVisionAnalysis(
    ai: any,
    input: VisionInput
): Promise<any> {
    // 1. Chạy vision analysis
    const rawResult = await visionAnalysisFlow(input);

    // 2. Validate enum fields — chặn prompt injection qua image text
    if (!VALID_INCIDENT_TYPES.has(rawResult.incidentType)) {
        rawResult.incidentType = 'other';
        rawResult.confidence = Math.min(rawResult.confidence, 0.5);
    }

    if (!VALID_SEVERITIES.has(rawResult.severity)) {
        rawResult.severity = 'medium';
    }

    // 3. Clamp confidence
    rawResult.confidence = Math.max(0, Math.min(1, rawResult.confidence));

    // 4. Sanitize description — giới hạn length, strip suspicious patterns
    if (rawResult.description) {
        rawResult.description = rawResult.description
            .substring(0, 500)
            .replace(/ignore\s+(?:previous|above|all)\s+instructions?/gi, '[FILTERED]')
            .replace(/you\s+are\s+now/gi, '[FILTERED]');
    }

    // 5. Guardian output scrutiny — bắt buộc như các agent khác
    const outputCheck = await scrutinizeOutput(ai, rawResult.description, 'vision_agent');
    rawResult.description = outputCheck.content;

    return rawResult;
}
