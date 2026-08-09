/**
 * Provider configuration types — model pricing, tier mapping, health tracking.
 */

import { Tier } from './classifier';

export interface ModelConfig {
  provider: string;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  maxTokens: number;
}

export interface TierConfig {
  model: string;
  provider: string;
}

export interface ProviderHealth {
  name: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
}

/** The full cost registry shape */
export interface CostRegistryData {
  models: Record<string, ModelConfig>;
  tiers: Record<Tier, TierConfig>;
}
