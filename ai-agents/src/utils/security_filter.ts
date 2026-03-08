// ai-agents/src/utils/security_filter.ts

interface FilterResult {
    blocked: boolean;
    reason?: string;
    tier: 'rule_based' | 'llm_required';
}

// Known injection patterns — xử lý deterministically, 0ms, 0 cost
const HARD_BLOCK_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+(DAN|an?\s+AI\s+without)/i,
    /\bjailbreak\b/i,
    /system\s+prompt/i,
    /reveal\s+(your\s+)?(prompt|instructions|system)/i,
    /forget\s+(everything|all|your\s+instructions)/i,
    // Infrastructure recon
    /patrol\s+route/i,
    /officer\s+(schedule|shift|location)/i,
    /security\s+(code|bypass|override)/i,
];

// Patterns yêu cầu LLM scrutiny (ambiguous)
const LLM_REVIEW_PATTERNS = [
    /\bhack\b/i,
    /\bexploit\b/i,
    /\bvulnerabilit/i,
];

export function preFilterMessage(message: string): FilterResult {
    // Layer 0: Độ dài bất thường
    if (message.length > 2000) {
        return { blocked: true, reason: 'Message exceeds maximum length', tier: 'rule_based' };
    }

    // Layer 1: Hard block — deterministic
    for (const pattern of HARD_BLOCK_PATTERNS) {
        if (pattern.test(message)) {
            return {
                blocked: true,
                reason: 'Request contains prohibited patterns',
                tier: 'rule_based'
            };
        }
    }

    // Layer 2: Cần LLM review
    for (const pattern of LLM_REVIEW_PATTERNS) {
        if (pattern.test(message)) {
            return { blocked: false, tier: 'llm_required' };
        }
    }

    // Pass — không cần LLM scrutiny
    return { blocked: false, tier: 'rule_based' };
}
