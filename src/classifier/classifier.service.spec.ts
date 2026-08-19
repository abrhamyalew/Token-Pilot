import { ClassifierService } from './classifier.service';
import { LlmClassifierService } from './llm-classifier.service';
import { ConfigService } from '@nestjs/config';

describe('ClassifierService', () => {
  let llmClassifier: LlmClassifierService;
  let service: ClassifierService;

  beforeEach(() => {
    const config = {
      get: vi.fn().mockReturnValue('mock-google-key'),
    } as unknown as ConfigService;
    llmClassifier = new LlmClassifierService(config);
    service = new ClassifierService(llmClassifier);
  });

  it('classifies user prompts with rules and returns extracted features', async () => {
    const result = await service.classify([
      { role: 'user', content: 'Summarize this paragraph briefly.' },
    ]);

    expect(result.classifier).toBe('rules');
    expect(result.tier).toMatch(/low|medium|high|high_alt/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.features.tokenCount).toBeGreaterThan(0);
    expect(result.features.systemPrompt).toBe(false);
  });

  it('includes system messages and multi-turn context in feature extraction', async () => {
    const result = await service.classify([
      { role: 'system', content: 'You are a strict technical reviewer.' },
      { role: 'user', content: 'Analyze this API design.' },
      { role: 'assistant', content: 'Share the code.' },
      { role: 'user', content: 'Now compare the tradeoffs and constraints.' },
    ]);

    expect(result.features.systemPrompt).toBe(true);
    expect(result.features.multiTurnCount).toBe(3);
    expect(result.features.reasoningKeywords).toBeGreaterThan(0);
  });

  it('ignores assistant-only content when extracting prompt text', async () => {
    const result = await service.classify([
      { role: 'assistant', content: 'Analyze compare prove optimize refactor' },
      { role: 'user', content: 'Hi' },
    ]);

    expect(result.features.reasoningKeywords).toBe(0);
  });

  it('classifies using LLM when requested and confidence is high', async () => {
    vi.spyOn(llmClassifier, 'classify').mockResolvedValue({
      tier: 'high',
      confidence: 0.95,
      reasoning: 'Requires complex architectural synthesis.',
      classifierModel: 'gemini-3.6-flash',
    });

    const result = await service.classify(
      [{ role: 'user', content: 'Refactor our distributed consensus algorithm.' }],
      'llm',
    );

    expect(result.classifier).toBe('llm');
    expect(result.tier).toBe('high');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe('Requires complex architectural synthesis.');
    expect(result.classifyLatencyMs).toBeDefined();
  });

  it('falls back to rules when LLM confidence is below threshold', async () => {
    vi.spyOn(llmClassifier, 'classify').mockResolvedValue({
      tier: 'low',
      confidence: 0.45,
      reasoning: 'Uncertain about complexity.',
      classifierModel: 'gemini-3.6-flash',
    });

    const result = await service.classify(
      [{ role: 'user', content: 'Please explain quantum computing.' }],
      'llm',
    );

    expect(result.classifier).toBe('rules');
    expect(result.fallbackFrom).toBe('llm');
    expect(result.fallbackReason).toBe('low_confidence');
    expect(result.reasoning).toContain('below threshold 0.6');
  });

  it('falls back to rules when LLM classification throws error', async () => {
    vi.spyOn(llmClassifier, 'classify').mockRejectedValue(new Error('Quota exceeded'));

    const result = await service.classify(
      [{ role: 'user', content: 'Write a quick python script.' }],
      'llm',
    );

    expect(result.classifier).toBe('rules');
    expect(result.fallbackFrom).toBe('llm');
    expect(result.fallbackReason).toBe('Quota exceeded');
  });
});
