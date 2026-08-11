import { scorePrompt, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringResult } from './scoring-engine';
import { PromptFeatures } from '../shared/types/classifier';

/** Helper: create a zeroed-out feature set, then override specific fields */
function makeFeatures(overrides: Partial<PromptFeatures> = {}): PromptFeatures {
  return {
    tokenCount: 0,
    sentenceCount: 0,
    avgSentenceLength: 0,
    questionCount: 0,
    codeBlockPresent: 0,
    reasoningKeywords: 0,
    simpleKeywords: 0,
    constraintCount: 0,
    structuralDepth: 0,
    domainTermDensity: 0,
    domainHitCount: 0,
    formalLanguageScore: 0,
    systemPrompt: false,
    multiTurnCount: 1,
    ...overrides,
  };
}

describe('scorePrompt', () => {
  // ─── Tier assignment ──────────────────────────────────────────────────

  it('should classify a zero-feature prompt as "low"', () => {
    const result = scorePrompt(makeFeatures());
    expect(result.tier).toBe('low');
    expect(result.score).toBe(0);
  });

  it('should classify a prompt with only simple keywords as "low"', () => {
    const result = scorePrompt(makeFeatures({ simpleKeywords: 2 }));
    expect(result.tier).toBe('low');
    // simpleKeywords has negative weight → score should be 0 (clamped)
    expect(result.score).toBe(0);
  });

  it('should classify a moderately complex prompt as "medium"', () => {
    const result = scorePrompt(makeFeatures({
      tokenCount: 60,
      questionCount: 1,
      reasoningKeywords: 1,
      constraintCount: 1,
    }));
    expect(result.tier).toBe('medium');
  });

  it('should classify a complex prompt as "high"', () => {
    const result = scorePrompt(makeFeatures({
      tokenCount: 100,
      questionCount: 1,
      codeBlockPresent: 0.7,
      reasoningKeywords: 1,
      constraintCount: 2,
      structuralDepth: 2,
      domainTermDensity: 0.03,
    }));
    expect(result.tier).toBe('high');
  });

  it('should classify a frontier-level prompt as "high_alt"', () => {
    const result = scorePrompt(makeFeatures({
      tokenCount: 200,
      questionCount: 3,
      codeBlockPresent: 1,
      reasoningKeywords: 3,
      constraintCount: 4,
      structuralDepth: 6,
      domainTermDensity: 0.08,
      domainHitCount: 5,
      formalLanguageScore: 2,
      systemPrompt: true,
      multiTurnCount: 3,
    }));
    expect(result.tier).toBe('high_alt');
  });

  // ─── Threshold boundaries ─────────────────────────────────────────────

  it('should respect lowMax threshold', () => {
    // Score exactly at lowMax should be "low"
    const result = scorePrompt(makeFeatures({ tokenCount: 12 }));
    // tokenCount weight=0.12, normalized=12/200=0.06, score=0.06*0.12≈0.0072
    expect(result.score).toBeLessThanOrEqual(DEFAULT_THRESHOLDS.lowMax);
    expect(result.tier).toBe('low');
  });

  // ─── Formal language boost ────────────────────────────────────────────

  it('should apply formal-language boost for short, text-only, dense prompts', () => {
    const withoutFormal = scorePrompt(makeFeatures({
      tokenCount: 50,
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 0,
    }));

    const withFormal = scorePrompt(makeFeatures({
      tokenCount: 50,
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 2,
    }));

    expect(withFormal.score).toBeGreaterThan(withoutFormal.score);
  });

  it('should NOT apply formal boost when code blocks are present', () => {
    const withCode = scorePrompt(makeFeatures({
      tokenCount: 50,
      codeBlockPresent: 0.7,
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 2,
    }));

    const withoutCode = scorePrompt(makeFeatures({
      tokenCount: 50,
      codeBlockPresent: 0,
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 2,
    }));

    // The boost only fires when codeBlockPresent === 0
    // withoutCode gets the boost, withCode doesn't
    // But withCode still has additive codeBlockPresent weight
    // So we check that the formal-boosted one is higher
    expect(withoutCode.score).toBeGreaterThan(withCode.score);
  });

  it('should NOT apply formal boost for long prompts (>80 words)', () => {
    const short = scorePrompt(makeFeatures({
      tokenCount: 50,  // ~38 words
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 2,
    }));

    const long = scorePrompt(makeFeatures({
      tokenCount: 200,  // ~154 words
      domainTermDensity: 0.1,
      domainHitCount: 4,
      formalLanguageScore: 2,
    }));

    // Short gets the boost, long doesn't. But long has higher tokenCount weight.
    // The key test is that the boost fires for short.
    // We verify by checking that the ratio of score to tokenCount contribution
    // is higher for the short prompt.
    const shortBaseContribution = (50 / 200) * 0.12;
    const longBaseContribution = (200 / 200) * 0.12;
    const shortRatio = short.score / shortBaseContribution;
    const longRatio = long.score / longBaseContribution;
    expect(shortRatio).toBeGreaterThan(longRatio);
  });

  // ─── Score clamping ───────────────────────────────────────────────────

  it('should clamp score between 0 and 1', () => {
    // Max everything
    const result = scorePrompt(makeFeatures({
      tokenCount: 1000,
      questionCount: 10,
      codeBlockPresent: 1,
      reasoningKeywords: 10,
      constraintCount: 10,
      structuralDepth: 20,
      domainTermDensity: 1,
      domainHitCount: 20,
      formalLanguageScore: 10,
      systemPrompt: true,
      multiTurnCount: 10,
    }));
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should clamp negative scores to 0', () => {
    // Only simpleKeywords (negative weight) with nothing else
    const result = scorePrompt(makeFeatures({ simpleKeywords: 5 }));
    expect(result.score).toBe(0);
  });

  // ─── Confidence ───────────────────────────────────────────────────────

  it('should return confidence between 0 and 1', () => {
    const result = scorePrompt(makeFeatures({
      tokenCount: 100,
      reasoningKeywords: 1,
    }));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  // ─── Custom weights/thresholds ────────────────────────────────────────

  it('should accept custom weights', () => {
    const heavyToken = { ...DEFAULT_WEIGHTS, tokenCount: 1.0 };
    const result = scorePrompt(makeFeatures({ tokenCount: 200 }), heavyToken);
    expect(result.score).toBeGreaterThanOrEqual(0.42);
    expect(result.tier).toBe('high_alt');
  });

  it('should accept custom thresholds', () => {
    const lowThresholds = { lowMax: 0.5, mediumMax: 0.8, highMax: 0.9 };
    const result = scorePrompt(
      makeFeatures({ tokenCount: 100, reasoningKeywords: 1 }),
      DEFAULT_WEIGHTS,
      lowThresholds,
    );
    expect(result.tier).toBe('low');
  });
});
