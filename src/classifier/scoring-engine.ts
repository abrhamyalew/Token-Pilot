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
  tokenCount: 0.10,
  avgSentenceLength: 0.05,
  questionCount: 0.05,
  codeBlockPresent: 0.15,
  reasoningKeywords: 0.20,
  simpleKeywords: -0.15,     // negative — simplicity indicator
  constraintCount: 0.08,
  structuralDepth: 0.07,
  domainTermDensity: 0.10,
  systemPrompt: 0.10,        // system prompt = structured use case
  multiTurnCount: 0.05,      // multi-turn = ongoing complex task
};

export const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  lowMax: 0.15,
  mediumMax: 0.35,
  highMax: 0.55,
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
    tokenCount: clamp01(features.tokenCount / 500),          // 500 tokens = max complexity signal
    avgSentenceLength: clamp01(features.avgSentenceLength / 40),
    questionCount: clamp01(features.questionCount / 3),       // 3+ questions = complex
    codeBlockPresent: features.codeBlockPresent ? 1.0 : 0.0,
    reasoningKeywords: clamp01(features.reasoningKeywords / 3),// 3+ reasoning keywords = max
    simpleKeywords: clamp01(features.simpleKeywords / 3),
    constraintCount: clamp01(features.constraintCount / 5),
    structuralDepth: clamp01(features.structuralDepth / 5),   // 5+ structural elements = max
    domainTermDensity: clamp01(features.domainTermDensity * 15),
    systemPrompt: features.systemPrompt ? 1.0 : 0.0,
    multiTurnCount: clamp01((features.multiTurnCount - 1) / 3), // 4+ messages = max
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
    n.domainTermDensity * weights.domainTermDensity +
    n.systemPrompt * weights.systemPrompt +
    n.multiTurnCount * weights.multiTurnCount;

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
