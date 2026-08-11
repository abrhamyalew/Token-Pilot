import { RouterService } from './router.service';
import { ClassifierResult, ChatRequest } from '../shared/types';
import { ProviderAdapter, ProviderChatRequest, ProviderChatResponse } from '../providers/provider.interface';

const classification: ClassifierResult = {
  tier: 'low',
  score: 0.1,
  confidence: 0.9,
  classifier: 'rules',
  features: {
    tokenCount: 3,
    sentenceCount: 1,
    avgSentenceLength: 3,
    questionCount: 0,
    codeBlockPresent: 0,
    reasoningKeywords: 0,
    simpleKeywords: 1,
    constraintCount: 0,
    structuralDepth: 0,
    domainTermDensity: 0,
    domainHitCount: 0,
    formalLanguageScore: 0,
    systemPrompt: false,
    multiTurnCount: 1,
  },
};

function makeProviderResponse(model: string): ProviderChatResponse {
  return {
    response: {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1,
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello back' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    },
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

function makeService(adapterOverrides: Partial<ProviderAdapter> = {}) {
  const adapter: ProviderAdapter = {
    name: 'groq',
    chat: vi.fn().mockResolvedValue(makeProviderResponse('llama-3.3-70b-versatile')),
    chatStream: vi.fn(),
    healthCheck: vi.fn(),
    ...adapterOverrides,
  };
  const classifier = { classify: vi.fn().mockReturnValue(classification) };
  const providerRegistry = {
    getAdapterForTier: vi.fn().mockReturnValue({
      adapter,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
    }),
  };
  const requestLogger = { log: vi.fn().mockResolvedValue(undefined) };
  const costCalculator = {
    calculate: vi.fn().mockReturnValue({
      actualCost: 0,
      frontierCost: 0.0312,
      savings: 0.0312,
      savingsPercent: 100,
    }),
  };

  return {
    adapter,
    classifier,
    providerRegistry,
    requestLogger,
    costCalculator,
    service: new RouterService(
      classifier as any,
      providerRegistry as any,
      requestLogger as any,
      costCalculator as any,
    ),
  };
}

describe('RouterService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const request: ChatRequest = {
    messages: [{ role: 'user', content: 'Hello there' }],
    max_tokens: 5000,
  };

  it('classifies, resolves, caps max tokens, calls provider, and attaches routing metadata', async () => {
    const { adapter, costCalculator, requestLogger, service } = makeService();

    const result = await service.handleRequest(request);

    expect(adapter.chat).toHaveBeenCalledWith(
      expect.objectContaining<Partial<ProviderChatRequest>>({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        stream: false,
      }),
    );
    expect(costCalculator.calculate).toHaveBeenCalledWith(
      'llama-3.3-70b-versatile',
      10,
      5,
    );
    expect(result.response.routing).toMatchObject({
      tier: 'low',
      classifier: 'rules',
      confidence: 0.9,
      actual_cost: 0,
      frontier_cost: 0.0312,
      savings: 0.0312,
      max_tokens_applied: 1024,
      max_tokens_capped: true,
    });
    expect(requestLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: 'Hello there',
        classification,
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        status: 'success',
      }),
    );
  });

  it('retries a failed provider call once before succeeding', async () => {
    const chat = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce(makeProviderResponse('llama-3.3-70b-versatile'));
    const { service, requestLogger } = makeService({ chat });

    const promise = service.handleRequest(request);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ classification });

    expect(chat).toHaveBeenCalledTimes(2);
    expect(requestLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('logs and rethrows after retry exhaustion', async () => {
    const error = new Error('provider down');
    const chat = vi.fn().mockRejectedValue(error);
    const { service, requestLogger } = makeService({ chat });

    const promise = service.handleRequest(request).catch((caught) => caught);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(error);

    expect(chat).toHaveBeenCalledTimes(2);
    expect(requestLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: 'Hello there',
        status: 'error',
        errorMessage: 'provider down',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }),
    );
  });

  it('builds stream requests and logs fallback usage on finalize', async () => {
    async function* stream() {
      yield {
        id: 'chunk',
        object: 'chat.completion.chunk' as const,
        created: 1,
        model: 'llama-3.3-70b-versatile',
        choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
      };
    }
    const { adapter, requestLogger, service } = makeService({ chatStream: vi.fn().mockReturnValue(stream()) });

    const result = service.handleStreamRequest({ messages: [{ role: 'user', content: 'Hello now' }] });
    result.finalize('Hi there', null);

    expect(adapter.chatStream).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1024, stream: true }),
    );
    expect(requestLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        usage: { prompt_tokens: 3, completion_tokens: 3, total_tokens: 6 },
      }),
    );
  });

  it('logs stream failures when finalize receives an error', () => {
    async function* stream() {}
    const { requestLogger, service } = makeService({ chatStream: vi.fn().mockReturnValue(stream()) });

    const result = service.handleStreamRequest(request);
    result.finalize('', null, new Error('stream failed'));

    expect(requestLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        errorMessage: 'stream failed',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }),
    );
  });
});
