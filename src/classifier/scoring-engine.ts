/**
 * Scoring Engine - re-exports from the shared @token-pilot/classifier package.
 *
 * The actual implementation lives in packages/classifier so both the gateway
 * and the Next.js frontend run identical code. No drift when weights are tuned.
 */
export {
  scorePrompt,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  type ScoringResult,
} from '@token-pilot/classifier';
