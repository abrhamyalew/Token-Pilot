import { CostCalculatorService } from './cost-calculator.service';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(() => {
    service = new CostCalculatorService();
  });

  it('delegates full cost breakdowns to the registry', () => {
    const result = service.calculate('deepseek-v4-flash', 1000, 2000);

    expect(result.actualCost).toBeCloseTo(0.0007);
    expect(result.frontierCost).toBeCloseTo(0.39);
    expect(result.savings).toBeCloseTo(0.3893);
    expect(result.savingsPercent).toBeGreaterThan(99);
  });

  it('calculates direct model and frontier costs', () => {
    expect(service.modelCost('gpt-5.5-pro', 1000, 1000)).toBeCloseTo(0.21);
    expect(service.frontierCost(1000, 1000)).toBeCloseTo(0.21);
  });
});
