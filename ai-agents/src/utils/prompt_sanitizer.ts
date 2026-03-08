// ai-agents/src/utils/prompt_sanitizer.ts

// Patterns phổ biến trong prompt injection attacks
const INJECTION_PATTERNS = [
    /ignore\s+(previous|above|all|prior)\s+instructions?/gi,
    /you\s+are\s+now\s+(a|an|the)/gi,
    /\[SYSTEM\]/gi,
    /\[INST\]/gi,
    /\bACT\s+AS\b/gi,
    /\bDAN\b/g,
    /forget\s+(your|all|previous)/gi,
    /new\s+instructions?:/gi,
    /override\s+(safety|guidelines|rules)/gi,
];

/**
 * Sanitize một string value trước khi inject vào LLM prompt.
 * Dùng cho mọi external data (DB records, user-submitted content).
 */
export function sanitizeString(value: string, maxLength = 300): string {
    let sanitized = String(value).substring(0, maxLength);
    for (const pattern of INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
}

/**
 * Sanitize một object — đệ quy sanitize tất cả string values.
 * Dùng cho requestData, crimeData, webData trước khi JSON.stringify vào prompt.
 */
export function sanitizeForPrompt(
    data: any,
    maxStringLength = 200,
    maxDepth = 3,
    currentDepth = 0
): any {
    if (currentDepth > maxDepth) return '[TRUNCATED]';
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') return sanitizeString(data, maxStringLength);
    if (typeof data === 'number' || typeof data === 'boolean') return data;
    if (Array.isArray(data)) {
        return data.slice(0, 10).map(item =>
            sanitizeForPrompt(item, maxStringLength, maxDepth, currentDepth + 1)
        );
    }
    if (typeof data === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeForPrompt(value, maxStringLength, maxDepth, currentDepth + 1);
        }
        return sanitized;
    }
    return '[UNSUPPORTED_TYPE]';
}
