import { MockAdapter } from './mock.adapter';
import { ProviderChatRequest } from './provider.interface';

const request: ProviderChatRequest = {
  model: 'test-model',
  messages: [{ role: 'user', content: 'Hello mock provider' }],
  max_tokens: 128,
};

describe('MockAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a deterministic OpenAI-compatible non-stream response shape', async () => {
    const result = await new MockAdapter().chat(request);

    expect(result.response.object).toBe('chat.completion');
    expect(result.response.model).toBe('test-model');
    expect(result.response.choices[0].message.content).toContain(
      'Hello mock provider',
    );
    expect(result.response.usage).toEqual(result.usage);
    expect(result.usage.total_tokens).toBe(
      result.usage.prompt_tokens + result.usage.completion_tokens,
    );
  });

  it('streams content chunks followed by a final usage chunk', async () => {
    const chunksPromise = (async () => {
      const chunks = [];
      for await (const chunk of new MockAdapter().chatStream(request)) {
        chunks.push(chunk);
      }
      return chunks;
    })();

    await vi.runAllTimersAsync();
    const chunks = await chunksPromise;

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].choices[0].delta.content).toBeDefined();
    expect(chunks.at(-1)?.choices[0].finish_reason).toBe('stop');
    expect(chunks.at(-1)?.usage?.total_tokens).toBeGreaterThan(0);
  });

  it('is always healthy', async () => {
    await expect(new MockAdapter().healthCheck()).resolves.toBe(true);
  });
});
