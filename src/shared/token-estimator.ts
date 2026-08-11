/**
 * Token Estimator shared utility for approximate token counting.
 *
 * Uses the simple heuristic of words × 1.3 (no tokenizer dependency).
 * Centralized here to avoid duplication across router, mock adapter, etc.
 */

export function estimateTokens(text: string): number {
  return Math.ceil(
    text.split(/\s+/).filter((w) => w.length > 0).length * 1.3,
  );
}
