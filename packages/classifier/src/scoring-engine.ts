/**
 * Scoring Engine — converts a feature vector into a tier assignment.
 *
 * Each feature is normalized to [0, 1] and multiplied by a tunable weight.
 * The weighted sum is clamped to [0, 1] and mapped to a tier via thresholds.
 *
 * Zero NestJS dependencies — importable by both the gateway and the frontend.
 */

import {
  PromptFeatures,
  Tier,
  ClassifierWeights,
  ClassifierThresholds,
} from './types';

// ─── Defaults (tunable via config in Phase 2) ────────────────────────────
//
// Positive weight ceiling:
//   0.12 + 0.05 + 0.07 + 0.10 + 0.12 + 0.09 + 0.07 + 0.12 + 0.00 + 0.10 + 0.08 + 0.08 = 1.00
// With simpleKeywords = -0.10, theoretical range is [-0.10, 1.00], clamped to [0, 1].

export const DEFAULT_WEIGHTS: ClassifierWeights = {
  tokenCount: 0.12,           // prompt length
  avgSentenceLength: 0.05,
  questionCount: 0.07,
  codeBlockPresent: 0.10,
  reasoningKeywords: 0.12,
  simpleKeywords: -0.10,      // negative — simplicity dampener
  constraintCount: 0.09,
  structuralDepth: 0.07,
  domainTermDensity: 0.12,
  domainHitCount: 0.0,        // used in boost, not additive
  formalLanguageScore: 0.10,  // academic/theoretical language signal
  systemPrompt: 0.08,
  multiTurnCount: 0.08,
};

// Thresholds calibrated against 80-prompt eval data:
export const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  lowMax: 0.08,
  mediumMax: 0.20,
  highMax: 0.42,
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
  // Normalize each feature to [0, 1].
  // Divisors are set to realistic saturation points, not theoretical maxima.
  const n = {
    tokenCount: clamp01(features.tokenCount / 200),
    avgSentenceLength: clamp01(features.avgSentenceLength / 30),
    questionCount: clamp01(features.questionCount / 3),
    codeBlockPresent: clamp01(features.codeBlockPresent),
    reasoningKeywords: clamp01(features.reasoningKeywords / 2),
    simpleKeywords: clamp01(features.simpleKeywords / 2),
    constraintCount: clamp01(features.constraintCount / 3),
    structuralDepth: clamp01(features.structuralDepth / 4),
    domainTermDensity: clamp01(features.domainTermDensity * 20),
    domainHitCount: clamp01(features.domainHitCount / 6),
    formalLanguageScore: clamp01(features.formalLanguageScore / 2),
    systemPrompt: features.systemPrompt ? 1.0 : 0.0,
    multiTurnCount: clamp01((features.multiTurnCount - 1) / 2),
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
    n.formalLanguageScore * weights.formalLanguageScore +
    n.systemPrompt * weights.systemPrompt +
    n.multiTurnCount * weights.multiTurnCount;

  // Formal-language boost for short, text-only, domain-dense prompts.
  const wordCount = features.tokenCount / 1.3;
  if (
    wordCount < 80 &&
    features.codeBlockPresent === 0 &&
    features.formalLanguageScore >= 1 &&
    features.domainHitCount >= 3
  ) {
    const densityFactor = Math.min(features.domainTermDensity * 15, 1.0);
    score *= 1.0 + 0.6 * densityFactor;
  }

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

  // ─── Confidence: feature agreement metric ───────────────────────────
  const featureValues = [
    n.tokenCount, n.avgSentenceLength, n.questionCount,
    n.codeBlockPresent, n.reasoningKeywords, n.constraintCount,
    n.structuralDepth, n.domainTermDensity, n.domainHitCount,
    n.formalLanguageScore,
  ];
  const totalFeatures = featureValues.length;

  let agreeing = 0;
  for (const v of featureValues) {
    switch (tier) {
      case 'low':      if (v < 0.3) agreeing++; break;
      case 'medium':   if (v >= 0.1 && v <= 0.8) agreeing++; break;
      case 'high':     if (v >= 0.3) agreeing++; break;
      case 'high_alt': if (v >= 0.4) agreeing++; break;
    }
  }
  const confidence = totalFeatures > 0 ? agreeing / totalFeatures : 0.5;

  return { tier, score, confidence };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
