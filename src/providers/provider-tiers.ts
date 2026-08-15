/**
 * Provider Tiers & BYOK Classifications
 *
 * Defines which providers offer free-tier server fallback and which
 * strictly require a user-supplied API key (BYOK).
 */

export const FREE_TIER_PROVIDERS = ['groq', 'google'] as const;
export const BYOK_REQUIRED_PROVIDERS = ['openai', 'anthropic', 'deepseek'] as const;

export type FreeTierProvider = (typeof FREE_TIER_PROVIDERS)[number];
export type ByokRequiredProvider = (typeof BYOK_REQUIRED_PROVIDERS)[number];
export type ProviderName = FreeTierProvider | ByokRequiredProvider | 'mock';

export function isByokRequired(provider: string): provider is ByokRequiredProvider {
  return (BYOK_REQUIRED_PROVIDERS as readonly string[]).includes(provider);
}

export function isFreeTierProvider(provider: string): provider is FreeTierProvider {
  return (FREE_TIER_PROVIDERS as readonly string[]).includes(provider);
}
