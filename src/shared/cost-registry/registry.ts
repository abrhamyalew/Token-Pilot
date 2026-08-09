/**
 * Cost Registry — single source of truth for model pricing and tier-to-model mapping.
 *
 * All cost rates are in USD per 1,000 tokens. Free-tier models have $0 rates.
 * This module is intentionally pure functions + data so it can be shared with
 * the frontend in Phase 2 without pulling in any NestJS dependencies.
 */

import { Tier, ModelConfig, TierConfig } from '../types';

// ─── Model Pricing ──────────────────────────────────────────────────────────

const models: Record<string, ModelConfig> = {
  'llama-3.3-70b-versatile': {
    provider: 'groq',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 8192,
  },
  'gemini-2.0-flash': {
    provider: 'google',
    inputCostPer1kTokens: 0.0,
    outputCostPer1kTokens: 0.0,
    maxTokens: 8192,
  },
  'gpt-4o': {
    provider: 'openai',
    inputCostPer1kTokens: 2.5,
    outputCostPer1kTokens: 10.0,
    maxTokens: 16384,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    inputCostPer1kTokens: 0.15,
    outputCostPer1kTokens: 0.6,
    maxTokens: 16384,
  },
};

// ─── Tier → Model Mapping ───────────────────────────────────────────────────

const tiers: Record<Tier, TierConfig> = {
  low:    { model: 'llama-3.3-70b-versatile', provider: 'groq' },
  medium: { model: 'gemini-2.0-flash',        provider: 'google' },
  high:   { model: 'gpt-4o',                  provider: 'openai' },
};

// ─── Lookup Functions ───────────────────────────────────────────────────────

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

// ─── Cost Calculations ─────────────────────────────────────────────────────

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

export function calculateFrontierCost(
  inputTokens: number,
  outputTokens: number,
): number {
  const frontierModel = tiers.high.model;
  return calculateCost(frontierModel, inputTokens, outputTokens);
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

// ─── Introspection ──────────────────────────────────────────────────────────

export function getAllModels(): Record<string, ModelConfig> {
  return { ...models };
}

export function getAllTiers(): Record<Tier, TierConfig> {
  return { ...tiers };
}

export function getAvailableModelNames(): string[] {
  return Object.keys(models);
}
