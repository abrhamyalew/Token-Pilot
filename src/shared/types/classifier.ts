/**
 * Classifier types — prompt feature extraction and tier assignment.
 */

export type Tier = 'low' | 'medium' | 'high';

export interface PromptFeatures {
  tokenCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  questionCount: number;
  codeBlockPresent: boolean;
  reasoningKeywords: number;
  simpleKeywords: number;
  constraintCount: number;
  structuralDepth: number;
  domainTermDensity: number;
}

export interface ClassifierResult {
  tier: Tier;
  score: number;
  confidence: number;
  classifier: 'rules' | 'llm' | 'trained';
  features: PromptFeatures;
  reasoning?: string;
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
}

/** Tier boundary thresholds */
export interface ClassifierThresholds {
  lowMax: number;
  mediumMax: number;
}
