import { RequestLoggerService, LogEntry } from './logger.service';

const classification: LogEntry['classification'] = {
  tier: 'medium',
  score: 0.3,
  confidence: 0.8,
  classifier: 'rules',
  features: {
    tokenCount: 10,
    sentenceCount: 1,
    avgSentenceLength: 10,
    questionCount: 0,
    codeBlockPresent: 0,
    reasoningKeywords: 1,
    simpleKeywords: 0,
    constraintCount: 0,
    structuralDepth: 0,
    domainTermDensity: 0,
    domainHitCount: 0,
    formalLanguageScore: 0,
    systemPrompt: false,
    multiTurnCount: 1,
  },
};

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    promptText: 'Explain DNS',
    classification,
    model: 'gemini-3.6-flash',
    provider: 'google',
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    latencyMs: 123,
    status: 'success',
    ...overrides,
  };
}

describe('RequestLoggerService', () => {
  it('maps log entries to database records with calculated costs', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const costCalculator = {
      calculate: vi.fn().mockReturnValue({
        actualCost: 0,
        frontierCost: 0.0039,
        savings: 0.0039,
        savingsPercent: 100,
      }),
    };

    await new RequestLoggerService(db as any, costCalculator as any).log(makeEntry());

    expect(costCalculator.calculate).toHaveBeenCalledWith('gemini-3.6-flash', 10, 20);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: 'Explain DNS',
        promptLength: 10,
        tier: 'medium',
        classifier: 'rules',
        confidence: 0.8,
        provider: 'google',
        model: 'gemini-3.6-flash',
        inputTokens: 10,
        outputTokens: 20,
        latencyMs: 123,
        status: 'success',
        actualCost: 0,
        frontierCost: 0.0039,
      }),
    );
  });

  it('stores provider error details inside the features object', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const costCalculator = {
      calculate: vi.fn().mockReturnValue({
        actualCost: 0,
        frontierCost: 0,
        savings: 0,
        savingsPercent: 0,
      }),
    };

    await new RequestLoggerService(db as any, costCalculator as any).log(
      makeEntry({
        status: 'error',
        errorMessage: 'provider failed',
        errorStack: 'stack here',
      }),
    );

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        features: expect.objectContaining({
          _error: 'provider failed',
          _errorStack: 'stack here',
        }),
      }),
    );
  });

  it('swallows database errors so logging cannot fail the request path', async () => {
    const db = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('db unavailable')),
      }),
    };
    const costCalculator = {
      calculate: vi.fn().mockReturnValue({
        actualCost: 0,
        frontierCost: 0,
        savings: 0,
        savingsPercent: 0,
      }),
    };

    await expect(
      new RequestLoggerService(db as any, costCalculator as any).log(makeEntry()),
    ).resolves.toBeUndefined();
  });
});
