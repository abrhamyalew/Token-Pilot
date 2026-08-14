/**
 * @token-pilot/classifier — public API
 *
 * Shared prompt feature extraction and scoring engine.
 * Used by both the NestJS gateway and the Next.js frontend
 * so classifier logic is never duplicated.
 */

export { extractFeatures } from './feature-extractor';
export {
  scorePrompt,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  type ScoringResult,
} from './scoring-engine';
export type {
  Tier,
  PromptFeatures,
  ClassifierResult,
  ClassifierWeights,
  ClassifierThresholds,
} from './types';
