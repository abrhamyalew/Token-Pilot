import { extractFeatures } from './feature-extractor';

describe('extractFeatures', () => {
  // ─── Token / sentence basics ──────────────────────────────────────────

  it('should count tokens approximately (words × 1.3)', () => {
    const features = extractFeatures('hello world');
    // 2 words × 1.3 ≈ 3 (rounded up)
    expect(features.tokenCount).toBe(3);
  });

  it('should count sentences', () => {
    const features = extractFeatures('First sentence. Second sentence. Third?');
    expect(features.sentenceCount).toBe(3);
  });

  it('should compute average sentence length', () => {
    const features = extractFeatures('Hello world. Goodbye world.');
    // 2 sentences, 4 words → 4*1.3=5.2 → ceil=6 tokens, 6/2 = 3
    expect(features.avgSentenceLength).toBeGreaterThan(0);
  });

  // ─── Question detection ───────────────────────────────────────────────

  it('should count questions', () => {
    const features = extractFeatures('What is this? How does it work? Tell me.');
    expect(features.questionCount).toBe(2);
  });

  // ─── Code block detection ─────────────────────────────────────────────

  it('should detect no code blocks as 0', () => {
    const features = extractFeatures('Explain recursion in simple terms.');
    expect(features.codeBlockPresent).toBe(0);
  });

  it('should detect a single code block (graduated scoring)', () => {
    const features = extractFeatures('Fix this:\n```js\nconsole.log("hello");\n```');
    expect(features.codeBlockPresent).toBeGreaterThan(0);
    expect(features.codeBlockPresent).toBeLessThanOrEqual(1);
  });

  it('should score multiple code blocks higher', () => {
    const single = extractFeatures('Fix:\n```js\nfoo();\n```');
    const multi = extractFeatures(
      'Compare:\n```js\nfoo();\n```\nvs\n```python\nbar()\n```\nand\n```go\nbaz()\n```',
    );
    expect(multi.codeBlockPresent).toBeGreaterThan(single.codeBlockPresent);
  });

  // ─── Keyword detection ────────────────────────────────────────────────

  it('should detect reasoning keywords', () => {
    const features = extractFeatures('Explain the trade-offs and compare and contrast these approaches.');
    expect(features.reasoningKeywords).toBeGreaterThanOrEqual(1);
  });

  it('should detect simple keywords', () => {
    const features = extractFeatures('Hi! Can you help me with a quick question?');
    expect(features.simpleKeywords).toBeGreaterThanOrEqual(1);
  });

  // ─── Negation handling ────────────────────────────────────────────────

  it('should reduce keyword count when preceded by negation', () => {
    const withoutNegation = extractFeatures('Analyze the trade-offs of this approach.');
    const withNegation = extractFeatures("Don't analyze the trade-offs of this approach.");
    expect(withNegation.reasoningKeywords).toBeLessThan(withoutNegation.reasoningKeywords);
  });

  // ─── Domain term density ──────────────────────────────────────────────

  it('should detect domain terms', () => {
    const features = extractFeatures('Explain microservices architecture with Kubernetes and Docker.');
    expect(features.domainHitCount).toBeGreaterThanOrEqual(2);
    expect(features.domainTermDensity).toBeGreaterThan(0);
  });

  it('should return zero domain density for non-technical prompts', () => {
    const features = extractFeatures('Tell me a joke about cats.');
    expect(features.domainHitCount).toBe(0);
    expect(features.domainTermDensity).toBe(0);
  });

  // ─── Formal language detection ────────────────────────────────────────

  it('should detect formal language signals', () => {
    const features = extractFeatures(
      'Formally prove the correctness of this theorem using rigorous mathematical analysis.',
    );
    expect(features.formalLanguageScore).toBeGreaterThanOrEqual(2);
  });

  it('should not detect formal language in practical prompts', () => {
    const features = extractFeatures('Design a REST API for a todo app with CRUD operations.');
    expect(features.formalLanguageScore).toBe(0);
  });

  // ─── Structural depth ────────────────────────────────────────────────

  it('should count structural elements (headers, bullets, numbered lists)', () => {
    const features = extractFeatures('# Title\n- item one\n- item two\n1. first\n2. second');
    expect(features.structuralDepth).toBeGreaterThanOrEqual(4);
  });

  // ─── Constraint detection ────────────────────────────────────────────

  it('should count constraints', () => {
    const features = extractFeatures(
      'The solution must handle edge cases. It must be thread-safe. Ensure backward compatibility.',
    );
    expect(features.constraintCount).toBeGreaterThanOrEqual(2);
  });

  // ─── System prompt & multi-turn ───────────────────────────────────────

  it('should respect hasSystemPrompt flag', () => {
    const features = extractFeatures('Hello', true);
    expect(features.systemPrompt).toBe(true);
  });

  it('should default systemPrompt to false', () => {
    const features = extractFeatures('Hello');
    expect(features.systemPrompt).toBe(false);
  });

  it('should respect multiTurnCount parameter', () => {
    const features = extractFeatures('Hello', false, 3);
    expect(features.multiTurnCount).toBe(3);
  });

  it('should default multiTurnCount to 1', () => {
    const features = extractFeatures('Hello');
    expect(features.multiTurnCount).toBe(1);
  });
});
