import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { ProviderChatRequest } from './provider.interface';

const request: ProviderChatRequest = {
  model: 'gpt-5.5-pro',
  messages: [{ role: 'user', content: 'Explain edge caching briefly' }],
  max_tokens: 256,
};

describe('estimate-only provider adapters', () => {
  it('OpenAI returns estimate-only responses without an API key', async () => {
    const result = await new OpenAIAdapter().chat(request);

    expect(result.response.model).toBe('gpt-5.5-pro');
    expect(result.response.choices[0].message.content).toContain('Estimate Mode');
    expect(result.usage.prompt_tokens).toBeGreaterThan(0);
  });

  it('OpenAI streams a single estimate-only chunk without an API key', async () => {
    const chunks = [];
    for await (const chunk of new OpenAIAdapter().chatStream(request)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].choices[0].finish_reason).toBe('stop');
  });

  it('OpenAI rejects malformed BYOK keys before provider calls', async () => {
    await expect(
      new OpenAIAdapter().chat({
        ...request,
        user_api_keys: { openai: 'bad-key' },
      }),
    ).rejects.toThrow();
  });

  it('Anthropic returns estimate-only responses without an API key', async () => {
    const result = await new AnthropicAdapter().chat({
      ...request,
      model: 'claude-opus-4-8',
    });

    expect(result.response.model).toBe('claude-opus-4-8');
    expect(result.response.choices[0].message.content).toContain('Estimate Mode');
    expect(result.usage.prompt_tokens).toBeGreaterThan(0);
  });

  it('Anthropic streams a single estimate-only chunk without an API key', async () => {
    const chunks = [];
    for await (const chunk of new AnthropicAdapter().chatStream({
      ...request,
      model: 'claude-opus-4-8',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].choices[0].finish_reason).toBe('stop');
  });

  it('Anthropic rejects malformed BYOK keys before provider calls', async () => {
    await expect(
      new AnthropicAdapter().chat({
        ...request,
        model: 'claude-opus-4-8',
        user_api_keys: { anthropic: 'bad-key' },
      }),
    ).rejects.toThrow();
  });

  it('DeepSeek returns estimate-only responses without an API key', async () => {
    const result = await new DeepSeekAdapter().chat({
      ...request,
      model: 'deepseek-v4-flash',
    });

    expect(result.response.model).toBe('deepseek-v4-flash');
    expect(result.response.choices[0].message.content).toContain('Estimate Mode');
  });

  it('DeepSeek rejects malformed BYOK keys before provider calls', async () => {
    await expect(
      new DeepSeekAdapter().chat({
        ...request,
        model: 'deepseek-v4-flash',
        user_api_keys: { deepseek: 'bad-key' },
      }),
    ).rejects.toThrow();
  });
});
