/**
 * Cost Registry - single source of truth for model pricing and tier-to-model mapping.
 *
 * All cost rates are in USD per 1,000 tokens. Free-tier models have $0 rates.
 * This module is intentionally pure functions + data so it can be shared with
 * the frontend in Phase 2 without pulling in any NestJS dependencies.
 */

import { Tier, ModelConfig, TierConfig } from '../types';

// --- Model Pricing -----------------------------------------------------------

const models: Record<string, ModelConfig> = {
  'qwen/qwen3.6-27b': {
    provider: 'groq',
    inputCostPer1kTokens: 0.0,        // Free tier
    outputCostPer1kTokens: 0.0,       // Free tier
    maxTokens: 32_768,
  },
  'llama-3.3-70b-versatile': {
    provider: 'groq',
    inputCostPer1kTokens: 0.0,        // Free tier (paid: $0.59/1M = $0.00059/1K)
    outputCostPer1kTokens: 0.0,       // Free tier (paid: $0.79/1M = $0.00079/1K)
    maxTokens: 32_768,                // 32K max output, 128K context window
  },
  'deepseek-v4-flash': {
    provider: 'deepseek',
    inputCostPer1kTokens: 0.000_14,   // $0.14/1M tokens
    outputCostPer1kTokens: 0.000_28,  // $0.28/1M tokens
    maxTokens: 384_000,               // 384K max output, 1M context window
  },
  'gpt-5.5-pro': {
    provider: 'openai',
    inputCostPer1kTokens: 0.015,      // $15.00/1M tokens
    outputCostPer1kTokens: 0.060,     // $60.00/1M tokens
    maxTokens: 128_000,               // 128K max output, 1.05M context window
  },
  'claude-opus-4-8': {
    provider: 'anthropic',
    inputCostPer1kTokens: 0.015,      // $15.00/1M tokens
    outputCostPer1kTokens: 0.075,     // $75.00/1M tokens
    maxTokens: 128_000,               // 128K max output, 1M context window
  },
  'claude-sonnet-5': {
    provider: 'anthropic',
    inputCostPer1kTokens: 0.002,      // $2.00/1M tokens
    outputCostPer1kTokens: 0.010,     // $10.00/1M tokens
    maxTokens: 64_000,                // 64K max output, 1M context window
  },
  // Legacy models kept for reference / future config swapping
  'gemini-3.6-flash': {
    provider: 'google',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 65_536,                // 65K max output, 1M context window
  },
  'gemini-2.5-flash': {
    provider: 'google',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 65_536,
  },
  'gemini-2.0-flash': {
    provider: 'google',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 65_536,
  },
  'gemini-1.5-flash': {
    provider: 'google',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 65_536,
  },
};

// --- Tier to Model Mapping ---------------------------------------------------

const tiers: Record<Tier, TierConfig> = {
  low:      { model: 'qwen/qwen3.6-27b',      provider: 'groq' },
  medium:   { model: 'gemini-3.6-flash',              provider: 'google' },
  high:     { model: 'gpt-5.5-pro',                   provider: 'openai' },
  high_alt: { model: 'claude-opus-4-8',               provider: 'anthropic' },
};

// --- Lookup Functions -------------------------------------------------------

export function getModelConfig(modelName: string): ModelConfig | undefined {
  return models[modelName];
}

export function getTierConfig(tier: Tier): TierConfig {
  return tiers[tier];
}

export function getModelForTier(tier: Tier): string {
  return tiers[tier].model;
}

export function getProviderForTier(tier: Tier): string {
  return tiers[tier].provider;
}

// --- Cost Calculations -----------------------------------------------------

export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const config = models[modelName];
  if (!config) return 0;
  return (
    (inputTokens / 1000) * config.inputCostPer1kTokens +
    (outputTokens / 1000) * config.outputCostPer1kTokens
  );
}

// Frontier baseline: what would it cost to send everything to a single capable model?
const FRONTIER_MODEL = 'claude-opus-4-8';

export function calculateFrontierCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return calculateCost(FRONTIER_MODEL, inputTokens, outputTokens);
}

export function calculateSavings(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): { actualCost: number; frontierCost: number; savings: number; savingsPercent: number } {
  const actualCost = calculateCost(modelName, inputTokens, outputTokens);
  const frontierCost = calculateFrontierCost(inputTokens, outputTokens);
  const savings = frontierCost - actualCost;
  const savingsPercent = frontierCost > 0 ? (savings / frontierCost) * 100 : 0;
  return { actualCost, frontierCost, savings, savingsPercent };
}

// --- Introspection ----------------------------------------------------------

export function getAllModels(): Record<string, ModelConfig> {
  return { ...models };
}

export function getAllTiers(): Record<Tier, TierConfig> {
  return { ...tiers };
}

export function getAvailableModelNames(): string[] {
  return Object.keys(models);
}
