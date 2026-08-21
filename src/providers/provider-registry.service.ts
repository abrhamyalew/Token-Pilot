import { Injectable, Logger } from '@nestjs/common';
import { ProviderAdapter } from './provider.interface';
import { MockAdapter } from './mock.adapter';
import { GroqAdapter } from './groq.adapter';
import { GoogleAdapter } from './google.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { getTierConfig } from '../shared/cost-registry';
import { Tier } from '../shared/types';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly adapters: Map<string, ProviderAdapter>;

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

  /** Resolves tier to provider to adapter, with optional model/provider override. */
  getAdapterForTier(
    tier: Tier,
    override?: { model: string; provider: string },
  ): { adapter: ProviderAdapter; model: string; provider: string } {
    if (override?.provider && override?.model) {
      const adapter = this.getAdapter(override.provider);
      return {
        adapter,
        model: override.model,
        provider: override.provider,
      };
    }

    const tierConfig = getTierConfig(tier);
    const adapter = this.getAdapter(tierConfig.provider);
    return {
      adapter,
      model: tierConfig.model,
      provider: tierConfig.provider,
    };
  }

  getRegisteredProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /** Run health checks on all adapters */
  async checkAllHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    return results;
  }
}
