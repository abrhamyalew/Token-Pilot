/**
 * Cost Calculator Service — computes actual and hypothetical frontier costs.
 */

import { Injectable } from '@nestjs/common';
import {
  calculateCost,
  calculateFrontierCost,
  calculateSavings,
} from '../shared/cost-registry';

export interface CostBreakdown {
  actualCost: number;
  frontierCost: number;
  savings: number;
  savingsPercent: number;
}

@Injectable()
export class CostCalculatorService {
  /**
   * Calculate the full cost breakdown for a completed request.
   */
  calculate(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
  ): CostBreakdown {
    return calculateSavings(modelName, inputTokens, outputTokens);
  }

  /**
   * Calculate cost for a specific model.
   */
  modelCost(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    return calculateCost(modelName, inputTokens, outputTokens);
  }

  /**
   * Calculate what the frontier model would have cost.
   */
  frontierCost(inputTokens: number, outputTokens: number): number {
    return calculateFrontierCost(inputTokens, outputTokens);
  }
}
