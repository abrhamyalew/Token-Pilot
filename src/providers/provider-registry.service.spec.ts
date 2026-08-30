import { ProviderAdapter } from './provider.interface';
import { ProviderRegistryService } from './provider-registry.service';

function adapter(name: string, healthy = true): ProviderAdapter {
  return {
    name,
    chat: vi.fn(),
    chatStream: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(healthy),
  };
}

describe('ProviderRegistryService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function makeRegistry(overrides: Partial<Record<string, ProviderAdapter>> = {}) {
    const adapters = {
      mock: adapter('mock'),
      groq: adapter('groq'),
      google: adapter('google'),
      openai: adapter('openai'),
      deepseek: adapter('deepseek'),
      anthropic: adapter('anthropic'),
      ...overrides,
    };

    return {
      adapters,
      registry: new ProviderRegistryService(
        adapters.mock as any,
        adapters.groq as any,
        adapters.google as any,
        adapters.openai as any,
        adapters.deepseek as any,
        adapters.anthropic as any,
      ),
    };
  }

  it('returns registered adapters by provider name', () => {
    const { adapters, registry } = makeRegistry();

    expect(registry.getAdapter('groq')).toBe(adapters.groq);
    expect(registry.getRegisteredProviders()).toEqual([
      'mock',
      'groq',
      'google',
      'openai',
      'deepseek',
      'anthropic',
    ]);
  });

  it('resolves tiers to the configured provider and model', () => {
    const { adapters, registry } = makeRegistry();

    expect(registry.getAdapterForTier('low')).toEqual({
      adapter: adapters.groq,
      model: 'qwen/qwen3.6-27b',
      provider: 'groq',
    });
    expect(registry.getAdapterForTier('high_alt')).toEqual({
      adapter: adapters.anthropic,
      model: 'claude-opus-4-8',
      provider: 'anthropic',
    });
  });

  it('falls back to mock for unknown providers outside production', () => {
    process.env.NODE_ENV = 'test';
    const { adapters, registry } = makeRegistry();

    expect(registry.getAdapter('missing')).toBe(adapters.mock);
  });

  it('throws for unknown providers in production', () => {
    process.env.NODE_ENV = 'production';
    const { registry } = makeRegistry();

    expect(() => registry.getAdapter('missing')).toThrow(
      'Unknown provider "missing", no mock fallback in production',
    );
  });

  it('collects health check results with circuit state', async () => {
    const { registry } = makeRegistry({
      groq: {
        ...adapter('groq'),
        healthCheck: vi.fn().mockRejectedValue(new Error('down')),
      },
      google: adapter('google', false),
    });

    const health = await registry.checkAllHealth();
    expect(health.mock).toMatchObject({ healthy: true, circuitState: 'CLOSED' });
    expect(health.groq).toMatchObject({ healthy: false });
    expect(health.google).toMatchObject({ healthy: false });
    expect(health.openai).toMatchObject({ healthy: true, circuitState: 'CLOSED' });
  });

  // --- Fallback Chain Tests ---

  describe('getAdapterWithFallback', () => {
    it('returns primary provider when circuit is healthy', () => {
      const { adapters, registry } = makeRegistry();

      const result = registry.getAdapterWithFallback('low');
      expect(result.adapter).toBe(adapters.groq);
      expect(result.provider).toBe('groq');
      expect(result.isFallback).toBe(false);
    });

    it('returns explicit override without checking circuit', () => {
      const { adapters, registry } = makeRegistry();

      // Open groq circuit
      registry.recordFailure('groq');
      registry.recordFailure('groq');
      registry.recordFailure('groq');

      const result = registry.getAdapterWithFallback('low', {
        provider: 'google',
        model: 'gemini-2.0-flash',
      });
      expect(result.adapter).toBe(adapters.google);
      expect(result.provider).toBe('google');
      expect(result.model).toBe('gemini-2.0-flash');
      expect(result.isFallback).toBe(false);
    });

    it('falls back to next provider when primary circuit is OPEN', () => {
      const { adapters, registry } = makeRegistry();

      // Open groq circuit (3 consecutive failures)
      registry.recordFailure('groq');
      registry.recordFailure('groq');
      registry.recordFailure('groq');

      const result = registry.getAdapterWithFallback('low');
      expect(result.adapter).toBe(adapters.google);
      expect(result.provider).toBe('google');
      expect(result.model).toBe('gemini-3.6-flash');
      expect(result.isFallback).toBe(true);
      expect(result.fallbackFrom).toBe('groq');
    });

    it('throws when all providers in the chain are OPEN', () => {
      const { registry } = makeRegistry();

      // Open both groq and google circuits
      for (let i = 0; i < 3; i++) {
        registry.recordFailure('groq');
        registry.recordFailure('google');
      }

      expect(() => registry.getAdapterWithFallback('low')).toThrow(
        /All providers for tier "low" are unavailable/,
      );
    });

    it('skips unhealthy fallbacks and finds the first healthy one', () => {
      const { adapters, registry } = makeRegistry();

      // For "high" tier: primary = openai, chain = [openai, anthropic, deepseek]
      // Open openai and anthropic
      for (let i = 0; i < 3; i++) {
        registry.recordFailure('openai');
        registry.recordFailure('anthropic');
      }

      const result = registry.getAdapterWithFallback('high');
      expect(result.adapter).toBe(adapters.deepseek);
      expect(result.provider).toBe('deepseek');
      expect(result.isFallback).toBe(true);
      expect(result.fallbackFrom).toBe('openai');
    });

    it('recovers to primary after circuit resets via recordSuccess', () => {
      const { adapters, registry } = makeRegistry();

      // Open groq circuit
      registry.recordFailure('groq');
      registry.recordFailure('groq');
      registry.recordFailure('groq');

      // Verify fallback is active
      expect(registry.getAdapterWithFallback('low').provider).toBe('google');

      // Simulate recovery
      registry.recordSuccess('groq');

      // Primary should be back
      const result = registry.getAdapterWithFallback('low');
      expect(result.adapter).toBe(adapters.groq);
      expect(result.provider).toBe('groq');
      expect(result.isFallback).toBe(false);
    });
  });
});
