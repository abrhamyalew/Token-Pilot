/**
 * Request Logger Service — writes every routed request to Postgres.
 *
 * Logs are fire-and-forget: the response is sent to the client first,
 * then the log is written asynchronously. A failed write logs an error
 * but never blocks or fails the request.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_TOKEN, Database } from '../database/database.module';
import { requestLogs, NewRequestLog } from '../database/schema';
import { ClassifierResult, TokenUsage } from '../shared/types';
import { CostCalculatorService } from './cost-calculator.service';

export interface LogEntry {
  promptText: string;
  classification: ClassifierResult;
  model: string;
  provider: string;
  usage: TokenUsage;
  latencyMs: number;
  status: 'success' | 'error' | 'escalated';
  escalatedFrom?: string;
  escalationReason?: string;
  errorMessage?: string;
  errorStack?: string;
}

@Injectable()
export class RequestLoggerService {
  private readonly logger = new Logger(RequestLoggerService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly costCalculator: CostCalculatorService,
  ) {}

  /**
   * Log a completed request. Runs asynchronously — never blocks the response.
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      const costs = this.costCalculator.calculate(
        entry.model,
        entry.usage.prompt_tokens,
        entry.usage.completion_tokens,
      );

      const features: Record<string, unknown> = {
        ...(entry.classification.features as any),
      };
      if (entry.errorMessage) {
        features._error = entry.errorMessage;
        features._errorStack = entry.errorStack;
      }

      const record: NewRequestLog = {
        promptText: entry.promptText,
        promptLength: entry.usage.prompt_tokens,
        tier: entry.classification.tier,
        classifier: entry.classification.classifier,
        confidence: entry.classification.confidence,
        features: features as any,
        provider: entry.provider,
        model: entry.model,
        inputTokens: entry.usage.prompt_tokens,
        outputTokens: entry.usage.completion_tokens,
        latencyMs: entry.latencyMs,
        status: entry.status,
        actualCost: costs.actualCost,
        frontierCost: costs.frontierCost,
        escalatedFrom: entry.escalatedFrom,
        escalationReason: entry.escalationReason,
      };

      await this.db.insert(requestLogs).values(record);

      this.logger.debug(
        `Logged request: tier=${entry.classification.tier} model=${entry.model} ` +
          `cost=$${costs.actualCost.toFixed(6)} saved=$${costs.savings.toFixed(6)} ` +
          `(${costs.savingsPercent.toFixed(1)}%)`,
      );
    } catch (error) {
      // Never fail the request because of a logging error
      this.logger.error('Failed to log request', error);
    }
  }
}
