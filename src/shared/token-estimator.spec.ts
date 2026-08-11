import { estimateTokens } from './token-estimator';

describe('estimateTokens', () => {
  it('returns zero for blank strings', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   \n\t  ')).toBe(0);
  });

  it('uses the shared words times 1.3 heuristic', () => {
    expect(estimateTokens('one two three')).toBe(4);
  });

  it('treats repeated whitespace as a separator only', () => {
    expect(estimateTokens('one   two\nthree\tfour')).toBe(6);
  });
});
