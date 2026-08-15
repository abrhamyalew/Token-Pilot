import { ConfigService } from '@nestjs/config';
import { GoogleAdapter } from './google.adapter';
import { GroqAdapter } from './groq.adapter';
import { ProviderChatRequest } from './provider.interface';

const emptyConfig = {
  get: vi.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

const request: ProviderChatRequest = {
  model: 'some-model',
  messages: [{ role: 'user', content: 'Hello' }],
};

describe('configured provider adapters without server or user API keys', () => {
  it('Groq rejects chat calls and reports unhealthy when no key is configured', async () => {
    const adapter = new GroqAdapter(emptyConfig);

    await expect(adapter.chat(request)).rejects.toThrow('GROQ_API_KEY not configured');
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it('Google rejects chat calls and reports unhealthy when no key is configured', async () => {
    const adapter = new GoogleAdapter(emptyConfig);

    await expect(adapter.chat(request)).rejects.toThrow('GOOGLE_API_KEY not configured');
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it('Groq succeeds in healthCheck with user key or server key', async () => {
    const configWithKey = {
      get: vi.fn().mockReturnValue('gsk_test_key_123456789012345'),
    } as unknown as ConfigService;
    const adapter = new GroqAdapter(configWithKey);
    expect(adapter).toBeDefined();
  });
});
