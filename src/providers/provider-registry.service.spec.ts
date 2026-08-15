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

  it('collects health check failures as false', async () => {
    const { registry } = makeRegistry({
      groq: {
        ...adapter('groq'),
        healthCheck: vi.fn().mockRejectedValue(new Error('down')),
      },
      google: adapter('google', false),
    });

    await expect(registry.checkAllHealth()).resolves.toMatchObject({
      mock: true,
      groq: false,
      google: false,
      openai: true,
    });
  });
});
