import {
  calculateCost,
  calculateFrontierCost,
  calculateSavings,
  getAllModels,
  getAllTiers,
  getModelForTier,
  getProviderForTier,
} from './registry';

describe('cost registry', () => {
  it('maps every tier to a configured model and provider', () => {
    const models = getAllModels();
    const tiers = getAllTiers();

    for (const [tier, config] of Object.entries(tiers)) {
      expect(models[config.model]).toBeDefined();
      expect(models[config.model].provider).toBe(config.provider);
      expect(getModelForTier(tier as keyof typeof tiers)).toBe(config.model);
      expect(getProviderForTier(tier as keyof typeof tiers)).toBe(config.provider);
    }
  });

  it('calculates model cost from input and output token rates', () => {
    expect(calculateCost('gpt-5.5-pro', 1000, 1000)).toBeCloseTo(0.21);
    expect(calculateCost('deepseek-v4-flash', 1000, 2000)).toBeCloseTo(0.0007);
  });

  it('uses the high tier model as the frontier baseline', () => {
    expect(calculateFrontierCost(1000, 1000)).toBeCloseTo(
      calculateCost('gpt-5.5-pro', 1000, 1000),
    );
  });

  it('reports savings against the frontier model', () => {
    const savings = calculateSavings('llama-3.3-70b-versatile', 1000, 1000);

    expect(savings.actualCost).toBe(0);
    expect(savings.frontierCost).toBeCloseTo(0.21);
    expect(savings.savings).toBeCloseTo(0.21);
    expect(savings.savingsPercent).toBe(100);
  });

  it('returns zero cost for unknown models instead of throwing', () => {
    expect(calculateCost('not-real', 1000, 1000)).toBe(0);
  });
});
