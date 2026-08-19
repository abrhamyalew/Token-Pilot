/**
 * Classifier types - prompt feature extraction and tier assignment.
 *
 * This file is the single source of truth shared between the gateway
 * and the Next.js frontend. No NestJS imports - pure TypeScript.
 */

export type Tier = 'low' | 'medium' | 'high' | 'high_alt';
export type ClassifierType = 'rules' | 'llm' | 'trained';

export interface LlmClassificationOutput {
  tier: Tier;
  confidence: number;
  reasoning: string;
  classifierProvider?: string;
  classifierModel?: string;
  classificationTokens?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface PromptFeatures {
  tokenCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  questionCount: number;
  codeBlockPresent: number;
  reasoningKeywords: number;
  simpleKeywords: number;
  constraintCount: number;
  structuralDepth: number;
  domainTermDensity: number;
  domainHitCount: number;
  formalLanguageScore: number;
  systemPrompt: boolean;
  multiTurnCount: number;
}

export interface ClassifierResult {
  tier: Tier;
  score: number;
  confidence: number;
  classifier: ClassifierType;
  features: PromptFeatures;
  reasoning?: string;
  llmClassification?: LlmClassificationOutput;
  classifyLatencyMs?: number;
  fallbackFrom?: ClassifierType;
  fallbackReason?: string;
}

/** Tunable weights for the feature-vector classifier */
export interface ClassifierWeights {
  tokenCount: number;
  avgSentenceLength: number;
  questionCount: number;
  codeBlockPresent: number;
  reasoningKeywords: number;
  simpleKeywords: number;
  constraintCount: number;
  structuralDepth: number;
  domainTermDensity: number;
  domainHitCount: number;
  formalLanguageScore: number;
  systemPrompt: number;
  multiTurnCount: number;
}

/** Tier boundary thresholds */
export interface ClassifierThresholds {
  lowMax: number;
  mediumMax: number;
  highMax: number;
}
