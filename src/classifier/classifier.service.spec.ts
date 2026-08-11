import { ClassifierService } from './classifier.service';

describe('ClassifierService', () => {
  it('classifies user prompts and returns extracted features', () => {
    const result = new ClassifierService().classify([
      { role: 'user', content: 'Summarize this paragraph briefly.' },
    ]);

    expect(result.classifier).toBe('rules');
    expect(result.tier).toMatch(/low|medium|high|high_alt/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.features.tokenCount).toBeGreaterThan(0);
    expect(result.features.systemPrompt).toBe(false);
  });

  it('includes system messages and multi-turn context in feature extraction', () => {
    const result = new ClassifierService().classify([
      { role: 'system', content: 'You are a strict technical reviewer.' },
      { role: 'user', content: 'Analyze this API design.' },
      { role: 'assistant', content: 'Share the code.' },
      { role: 'user', content: 'Now compare the tradeoffs and constraints.' },
    ]);

    expect(result.features.systemPrompt).toBe(true);
    expect(result.features.multiTurnCount).toBe(3);
    expect(result.features.reasoningKeywords).toBeGreaterThan(0);
  });

  it('ignores assistant-only content when extracting prompt text', () => {
    const result = new ClassifierService().classify([
      { role: 'assistant', content: 'Analyze compare prove optimize refactor' },
      { role: 'user', content: 'Hi' },
    ]);

    expect(result.features.reasoningKeywords).toBe(0);
  });
});
