import { ConfigService } from '@nestjs/config';
import { DeepSeekAdapter } from './deepseek.adapter';
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

describe('configured provider adapters without API keys', () => {
  it('Groq rejects chat calls and reports unhealthy when no key is configured', async () => {
    const adapter = new GroqAdapter(emptyConfig);

    await expect(adapter.chat(request)).rejects.toThrow('GROQ_API_KEY not configured');
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it('DeepSeek rejects chat calls and reports unhealthy when no key is configured', async () => {
    const adapter = new DeepSeekAdapter(emptyConfig);

    await expect(adapter.chat(request)).rejects.toThrow('DEEPSEEK_API_KEY not configured');
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it('Google rejects chat calls and reports unhealthy when no key is configured', async () => {
    const adapter = new GoogleAdapter(emptyConfig);

    await expect(adapter.chat(request)).rejects.toThrow('GOOGLE_API_KEY not configured');
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });
});
