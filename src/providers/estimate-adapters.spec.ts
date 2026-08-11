import { ConfigService } from '@nestjs/config';
import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { ProviderChatRequest } from './provider.interface';

const emptyConfig = {
  get: vi.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

const request: ProviderChatRequest = {
  model: 'gpt-5.5-pro',
  messages: [{ role: 'user', content: 'Explain edge caching briefly' }],
  max_tokens: 256,
};

describe('estimate-only provider adapters', () => {
  it('OpenAI returns estimate-only responses without an API key', async () => {
    const result = await new OpenAIAdapter(emptyConfig).chat(request);

    expect(result.response.model).toBe('gpt-5.5-pro');
    expect(result.response.choices[0].message.content).toContain(
      'Estimate-only mode',
    );
    expect(result.usage.completion_tokens).toBe(256);
  });

  it('OpenAI streams a single estimate-only chunk without an API key', async () => {
    const chunks = [];
    for await (const chunk of new OpenAIAdapter(emptyConfig).chatStream(request)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].choices[0].finish_reason).toBe('stop');
    expect(chunks[0].usage?.completion_tokens).toBe(256);
  });

  it('OpenAI rejects malformed BYOK keys before provider calls', async () => {
    await expect(
      new OpenAIAdapter(emptyConfig).chat({
        ...request,
        user_api_key: 'bad-key',
      }),
    ).rejects.toThrow();
  });

  it('OpenAI health check is false without a server key', async () => {
    await expect(new OpenAIAdapter(emptyConfig).healthCheck()).resolves.toBe(false);
  });

  it('Anthropic returns estimate-only responses without an API key', async () => {
    const result = await new AnthropicAdapter(emptyConfig).chat({
      ...request,
      model: 'claude-opus-4-8',
    });

    expect(result.response.model).toBe('claude-opus-4-8');
    expect(result.response.choices[0].message.content).toContain(
      'Estimate-only mode',
    );
    expect(result.usage.completion_tokens).toBe(256);
  });

  it('Anthropic streams a single estimate-only chunk without an API key', async () => {
    const chunks = [];
    for await (const chunk of new AnthropicAdapter(emptyConfig).chatStream({
      ...request,
      model: 'claude-opus-4-8',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].choices[0].finish_reason).toBe('stop');
    expect(chunks[0].usage?.completion_tokens).toBe(256);
  });

  it('Anthropic rejects malformed BYOK keys before provider calls', async () => {
    await expect(
      new AnthropicAdapter(emptyConfig).chat({
        ...request,
        model: 'claude-opus-4-8',
        user_api_key: 'bad-key',
      }),
    ).rejects.toThrow();
  });

  it('Anthropic health check is false without a server key', async () => {
    await expect(new AnthropicAdapter(emptyConfig).healthCheck()).resolves.toBe(false);
  });
});
