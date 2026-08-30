import { Injectable, Logger } from '@nestjs/common';
import { ProviderAdapter } from './provider.interface';
import { MockAdapter } from './mock.adapter';
import { GroqAdapter } from './groq.adapter';
import { GoogleAdapter } from './google.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { CircuitBreaker, CircuitState } from './circuit-breaker';
import { getTierConfig } from '../shared/cost-registry';
import { Tier } from '../shared/types';

// Ordered fallback chains per tier. First entry is the primary provider.
const FALLBACK_CHAINS: Record<Tier, string[]> = {
  low:      ['groq', 'google'],
  medium:   ['google', 'groq'],
  high:     ['openai', 'anthropic', 'deepseek'],
  high_alt: ['anthropic', 'openai', 'deepseek'],
};

// Cheapest model to use when falling back to a different provider than intended.
const FALLBACK_MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  google: 'gemini-3.6-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku',
  deepseek: 'deepseek-chat',
};

export interface AdapterResolution {
  adapter: ProviderAdapter;
  model: string;
  provider: string;
  isFallback: boolean;
  fallbackFrom?: string;
}

export interface ProviderHealthStatus {
  healthy: boolean;
  circuitState: CircuitState;
}

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly adapters: Map<string, ProviderAdapter>;
  private readonly circuits: Map<string, CircuitBreaker>;

  constructor(
    private readonly mockAdapter: MockAdapter,
    private readonly groqAdapter: GroqAdapter,
    private readonly googleAdapter: GoogleAdapter,
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly deepseekAdapter: DeepSeekAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
  ) {
    this.adapters = new Map<string, ProviderAdapter>([
      ['mock', this.mockAdapter],
      ['groq', this.groqAdapter],
      ['google', this.googleAdapter],
      ['openai', this.openaiAdapter],
      ['deepseek', this.deepseekAdapter],
      ['anthropic', this.anthropicAdapter],
    ]);

    this.circuits = new Map<string, CircuitBreaker>();
    for (const name of ['groq', 'google', 'openai', 'deepseek', 'anthropic']) {
      this.circuits.set(name, new CircuitBreaker(name));
    }
  }

  getAdapter(providerName: string): ProviderAdapter {
    const adapter = this.adapters.get(providerName);
    if (!adapter) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Unknown provider "${providerName}", no mock fallback in production`,
        );
      }
      this.logger.warn(
        `Unknown provider "${providerName}", falling back to mock (dev only)`,
      );
      return this.mockAdapter;
    }
    return adapter;
  }

  getAdapterForTier(
    tier: Tier,
    override?: { model: string; provider: string },
  ): { adapter: ProviderAdapter; model: string; provider: string } {
    if (override?.provider && override?.model) {
      const adapter = this.getAdapter(override.provider);
      return { adapter, model: override.model, provider: override.provider };
    }
    const tierConfig = getTierConfig(tier);
    const adapter = this.getAdapter(tierConfig.provider);
    return { adapter, model: tierConfig.model, provider: tierConfig.provider };
  }

  getAdapterWithFallback(
    tier: Tier,
    override?: { model: string; provider: string },
  ): AdapterResolution {
    if (override?.provider && override?.model) {
      const adapter = this.getAdapter(override.provider);
      return { adapter, model: override.model, provider: override.provider, isFallback: false };
    }

    const tierConfig = getTierConfig(tier);
    const primaryProvider = tierConfig.provider;
    const primaryCircuit = this.circuits.get(primaryProvider);

    if (!primaryCircuit || primaryCircuit.isHealthy()) {
      const adapter = this.getAdapter(primaryProvider);
      return { adapter, model: tierConfig.model, provider: primaryProvider, isFallback: false };
    }

    const chain = FALLBACK_CHAINS[tier] ?? [];
    for (const candidate of chain) {
      if (candidate === primaryProvider) continue;

      const circuit = this.circuits.get(candidate);
      if (circuit && !circuit.isHealthy()) continue;

      const adapter = this.adapters.get(candidate);
      if (!adapter) continue;

      const fallbackModel = FALLBACK_MODELS[candidate] ?? tierConfig.model;
      this.logger.warn(
        `"${primaryProvider}" circuit OPEN for tier "${tier}", falling back to "${candidate}"`,
      );

      return { adapter, model: fallbackModel, provider: candidate, isFallback: true, fallbackFrom: primaryProvider };
    }

    throw new Error(
      `All providers for tier "${tier}" are unavailable: [${chain.join(', ')}]`,
    );
  }

  getCircuit(providerName: string): CircuitBreaker | undefined {
    return this.circuits.get(providerName);
  }

  recordSuccess(providerName: string): void {
    this.circuits.get(providerName)?.recordSuccess();
  }

  recordFailure(providerName: string): void {
    this.circuits.get(providerName)?.recordFailure();
  }

  getRegisteredProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  async checkAllHealth(): Promise<Record<string, ProviderHealthStatus>> {
    const results: Record<string, ProviderHealthStatus> = {};
    for (const [name, adapter] of this.adapters) {
      const circuit = this.circuits.get(name);
      const circuitState = circuit?.getState() ?? 'CLOSED';
      try {
        const healthy = await adapter.healthCheck();
        results[name] = { healthy: healthy && circuitState !== 'OPEN', circuitState };
      } catch {
        results[name] = { healthy: false, circuitState };
      }
    }
    return results;
  }
}
