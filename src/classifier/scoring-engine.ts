/**
 * Scoring Engine — converts a feature vector into a tier assignment.
 *
 * Each feature is normalized to [0, 1] and multiplied by a tunable weight.
 * The weighted sum is clamped to [0, 1] and mapped to a tier via thresholds.
 * Confidence measures distance from the nearest tier boundary.
 */

import {
  PromptFeatures,
  Tier,
  ClassifierWeights,
  ClassifierThresholds,
} from '../shared/types';

// ─── Defaults (tunable via config in Phase 2) ────────────────────────────

export const DEFAULT_WEIGHTS: ClassifierWeights = {
  tokenCount: 0.15,
  avgSentenceLength: 0.05,
  questionCount: 0.05,
  codeBlockPresent: 0.15,
  reasoningKeywords: 0.25,
  simpleKeywords: -0.15,     // negative — simplicity indicator
  constraintCount: 0.10,
  structuralDepth: 0.05,
  domainTermDensity: 0.10,
};

export const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  lowMax: 0.30,
  mediumMax: 0.55,
  highMax: 0.80,
};

// ─── Scoring ────────────────────────────────────────────────────────────────

export interface ScoringResult {
  tier: Tier;
  score: number;
  confidence: number;
}

export function scorePrompt(
  features: PromptFeatures,
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
  thresholds: ClassifierThresholds = DEFAULT_THRESHOLDS,
): ScoringResult {
  // Normalize each feature to [0, 1]
  const n = {
    tokenCount: clamp01(features.tokenCount / 2000),
    avgSentenceLength: clamp01(features.avgSentenceLength / 50),
    questionCount: clamp01(features.questionCount / 5),
    codeBlockPresent: features.codeBlockPresent ? 1.0 : 0.0,
    reasoningKeywords: clamp01(features.reasoningKeywords / 5),
    simpleKeywords: clamp01(features.simpleKeywords / 5),
    constraintCount: clamp01(features.constraintCount / 10),
    structuralDepth: clamp01(features.structuralDepth / 10),
    domainTermDensity: clamp01(features.domainTermDensity * 10),
  };

  // Weighted sum
  let score =
    n.tokenCount * weights.tokenCount +
    n.avgSentenceLength * weights.avgSentenceLength +
    n.questionCount * weights.questionCount +
    n.codeBlockPresent * weights.codeBlockPresent +
    n.reasoningKeywords * weights.reasoningKeywords +
    n.simpleKeywords * weights.simpleKeywords +
    n.constraintCount * weights.constraintCount +
    n.structuralDepth * weights.structuralDepth +
    n.domainTermDensity * weights.domainTermDensity;

  score = clamp01(score);

  // Assign tier
  let tier: Tier;
  if (score <= thresholds.lowMax) {
    tier = 'low';
  } else if (score <= thresholds.mediumMax) {
    tier = 'medium';
  } else if (score <= thresholds.highMax) {
    tier = 'high';
  } else {
    tier = 'high_alt';
  }

  // Confidence: distance from nearest boundary (further = more confident)
  const distToLow = Math.abs(score - thresholds.lowMax);
  const distToMed = Math.abs(score - thresholds.mediumMax);
  const distToHigh = Math.abs(score - thresholds.highMax);
  const minDist = Math.min(distToLow, distToMed, distToHigh);
  const confidence = Math.min(0.5 + minDist * 2, 1.0);

  return { tier, score, confidence };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
