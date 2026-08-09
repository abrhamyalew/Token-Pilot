/**
 * Router Service — the orchestration core of Token Pilot.
 *
 * Flow: classify prompt → resolve tier → call provider → collect metrics → log.
 *
 * For streaming requests, the service returns an async iterable of chunks
 * plus a callback to log the completed request after streaming finishes.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  TokenUsage,
  ClassifierResult,
  RoutingMetadata,
} from '../shared/types';
import { ClassifierService } from '../classifier/classifier.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { RequestLoggerService, LogEntry } from '../logger/logger.service';
import { CostCalculatorService } from '../logger/cost-calculator.service';

// ─── Response Types ─────────────────────────────────────────────────────────

export interface RouteResult {
  response: ChatResponse;
  classification: ClassifierResult;
}

export interface StreamRouteResult {
  stream: AsyncIterable<ChatChunk>;
  classification: ClassifierResult;
  model: string;
  provider: string;
  /** Call after streaming finishes to log the request */
  finalize: (collectedContent: string, usage: TokenUsage | null) => void;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class RouterService {
  private readonly logger = new Logger(RouterService.name);
  private readonly MAX_DEMO_TOKENS = 1024;

  constructor(
    private readonly classifier: ClassifierService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly requestLogger: RequestLoggerService,
    private readonly costCalculator: CostCalculatorService,
  ) {}

  /**
   * Handle a non-streaming chat request.
   */
  async handleRequest(request: ChatRequest): Promise<RouteResult> {
    const startTime = Date.now();

    // 1. Classify
    const classification = this.classifier.classify(request.messages);

    // 2. Resolve provider
    const { adapter, model, provider } =
      this.providerRegistry.getAdapterForTier(classification.tier);

    // 3. Call provider
    const providerRequest = {
      ...request,
      model,
      max_tokens: Math.min(request.max_tokens ?? this.MAX_DEMO_TOKENS, this.MAX_DEMO_TOKENS),
      stream: false,
    };

    const result = await adapter.chat(providerRequest);
    const latencyMs = Date.now() - startTime;

    // 4. Calculate costs
    const costs = this.costCalculator.calculate(
      model,
      result.usage.prompt_tokens,
      result.usage.completion_tokens,
    );

    // 5. Attach routing metadata
    const routing: RoutingMetadata = {
      tier: classification.tier,
      classifier: classification.classifier,
      confidence: classification.confidence,
      actual_cost: costs.actualCost,
      frontier_cost: costs.frontierCost,
      savings: costs.savings,
      latency_ms: latencyMs,
    };

    result.response.routing = routing;

    // 6. Log asynchronously
    const promptText = request.messages.map((m) => m.content).join('\n');
    this.logAsync({
      promptText,
      classification,
      model,
      provider,
      usage: result.usage,
      latencyMs,
      status: 'success',
    });

    return {
      response: result.response,
      classification,
    };
  }

  /**
   * Prepare a streaming chat request.
   * Returns the stream, classification metadata, and a finalize callback
   * that the controller calls after the stream is consumed.
   */
  handleStreamRequest(request: ChatRequest): StreamRouteResult {
    // 1. Classify
    const classification = this.classifier.classify(request.messages);
    const startTime = Date.now();

    // 2. Resolve provider
    const { adapter, model, provider } =
      this.providerRegistry.getAdapterForTier(classification.tier);

    // 3. Create stream
    const providerRequest = {
      ...request,
      model,
      max_tokens: Math.min(request.max_tokens ?? this.MAX_DEMO_TOKENS, this.MAX_DEMO_TOKENS),
      stream: true,
    };

    const stream = adapter.chatStream(providerRequest);

    // 4. Finalize callback — called by the controller after streaming ends
    const finalize = (collectedContent: string, usage: TokenUsage | null) => {
      const latencyMs = Date.now() - startTime;
      const finalUsage = usage ?? {
        prompt_tokens: this.estimateTokens(
          request.messages.map((m) => m.content).join(' '),
        ),
        completion_tokens: this.estimateTokens(collectedContent),
        total_tokens: 0,
      };
      finalUsage.total_tokens =
        finalUsage.prompt_tokens + finalUsage.completion_tokens;

      const promptText = request.messages.map((m) => m.content).join('\n');
      this.logAsync({
        promptText,
        classification,
        model,
        provider,
        usage: finalUsage,
        latencyMs,
        status: 'success',
      });
    };

    return { stream, classification, model, provider, finalize };
  }

  /**
   * Fire-and-forget log — never blocks the response.
   */
  private logAsync(entry: LogEntry): void {
    this.requestLogger.log(entry).catch((err) => {
      this.logger.error('Background log failed', err);
    });
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).filter((w) => w.length > 0).length * 1.3);
  }
}
