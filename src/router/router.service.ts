import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
import { ProviderChatResponse } from '../providers/provider.interface';
import { estimateTokens } from '../shared/token-estimator';
import { isByokRequired } from '../providers/provider-tiers';

export interface RouteResult {
  response: ChatResponse;
  classification: ClassifierResult;
}

export interface StreamRouteResult {
  stream: AsyncIterable<ChatChunk>;
  classification: ClassifierResult;
  model: string;
  provider: string;
  /** Call after streaming finishes to log the request. Pass error if stream failed. */
  finalize: (collectedContent: string, usage: TokenUsage | null, error?: Error) => void;
}

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 500;

@Injectable()
export class RouterService {
  private readonly logger = new Logger(RouterService.name);
  private readonly MAX_DEMO_TOKENS = 2048;

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

    const classification = await this.classifier.classify(request.messages, {
      classifierType: request.classifier ?? 'rules',
      provider: request.classifier_provider,
      model: request.classifier_model,
      apiKey: request.classifier_api_key,
      userApiKeys: request.user_api_keys,
    });

    // 2. Resolve provider & model (with optional tier overrides)
    const override = request.tier_model_overrides?.[classification.tier];
    const { adapter, model, provider } =
      this.providerRegistry.getAdapterForTier(classification.tier, override);

    // Reject immediately if a BYOK-required provider was overridden without a key.
    if (isByokRequired(provider) && override) {
      const userKey = request.user_api_keys?.[provider];
      if (!userKey || userKey.trim().length === 0) {
        throw new HttpException(
          {
            error: {
              message: `This model requires your own API key for ${provider}.`,
              type: 'invalid_request_error',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const requestedMaxTokens = request.max_tokens ?? this.MAX_DEMO_TOKENS;
    const effectiveMaxTokens = Math.min(requestedMaxTokens, this.MAX_DEMO_TOKENS);
    const wasCapped = requestedMaxTokens > this.MAX_DEMO_TOKENS;

    const providerRequest = {
      ...request,
      model,
      max_tokens: effectiveMaxTokens,
      stream: false,
    };

    const promptText = request.messages.map((m) => m.content).join('\n');

    let result: ProviderChatResponse;
    try {
      result = await this.callWithRetry(
        () => adapter.chat(providerRequest),
        provider,
      );
    } catch (error) {
      // Log the failed request before re-throwing
      const latencyMs = Date.now() - startTime;
      this.logAsync({
        promptText,
        classification,
        model,
        provider,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        latencyMs,
        status: 'error',
        errorMessage: (error as Error)?.message ?? String(error),
        errorStack: (error as Error)?.stack,
        reasoning: classification.reasoning,
        classifyLatencyMs: classification.classifyLatencyMs,
        fallbackFrom: classification.fallbackFrom,
        fallbackReason: classification.fallbackReason,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    const costs = this.costCalculator.calculate(
      model,
      result.usage.prompt_tokens,
      result.usage.completion_tokens,
    );

    const routing: RoutingMetadata = {
      tier: classification.tier,
      classifier: classification.classifier,
      confidence: classification.confidence,
      score: classification.score,
      model,
      provider,
      actual_cost: costs.actualCost,
      frontier_cost: costs.frontierCost,
      savings: costs.savings,
      latency_ms: latencyMs,
      max_tokens_applied: effectiveMaxTokens,
      max_tokens_capped: wasCapped,
      reasoning: classification.reasoning,
      classify_latency_ms: classification.classifyLatencyMs,
      classifier_provider: classification.llmClassification?.classifierProvider,
      classifier_model: classification.llmClassification?.classifierModel,
      fallback_from: classification.fallbackFrom,
      fallback_reason: classification.fallbackReason,
    };

    result.response.routing = routing;

    this.logAsync({
      promptText,
      classification,
      model,
      provider,
      usage: result.usage,
      latencyMs,
      status: 'success',
      reasoning: classification.reasoning,
      classifyLatencyMs: classification.classifyLatencyMs,
      fallbackFrom: classification.fallbackFrom,
      fallbackReason: classification.fallbackReason,
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
  async handleStreamRequest(request: ChatRequest): Promise<StreamRouteResult> {
    const startTime = Date.now();

    const classification = await this.classifier.classify(request.messages, {
      classifierType: request.classifier ?? 'rules',
      provider: request.classifier_provider,
      model: request.classifier_model,
      apiKey: request.classifier_api_key,
      userApiKeys: request.user_api_keys,
    });

    const override = request.tier_model_overrides?.[classification.tier];
    const { adapter, model, provider } =
      this.providerRegistry.getAdapterForTier(classification.tier, override);

    // Reject immediately if a BYOK-required provider was overridden without a key.
    if (isByokRequired(provider) && override) {
      const userKey = request.user_api_keys?.[provider];
      if (!userKey || userKey.trim().length === 0) {
        throw new HttpException(
          {
            error: {
              message: `This model requires your own API key for ${provider}.`,
              type: 'invalid_request_error',
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const providerRequest = {
      ...request,
      model,
      max_tokens: Math.min(request.max_tokens ?? this.MAX_DEMO_TOKENS, this.MAX_DEMO_TOKENS),
      stream: true,
    };

    const stream = adapter.chatStream(providerRequest);

    const finalize = (collectedContent: string, usage: TokenUsage | null, error?: Error) => {
      const latencyMs = Date.now() - startTime;
      const promptText = request.messages.map((m) => m.content).join('\n');

      if (error) {
        this.logAsync({
          promptText,
          classification,
          model,
          provider,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          latencyMs,
          status: 'error',
          errorMessage: error.message ?? String(error),
          errorStack: error.stack,
          reasoning: classification.reasoning,
          classifyLatencyMs: classification.classifyLatencyMs,
          fallbackFrom: classification.fallbackFrom,
          fallbackReason: classification.fallbackReason,
        });
        return;
      }

      const finalUsage = usage ?? {
        prompt_tokens: estimateTokens(
          request.messages.map((m) => m.content).join(' '),
        ),
        completion_tokens: estimateTokens(collectedContent),
        total_tokens: 0,
      };
      finalUsage.total_tokens =
        finalUsage.prompt_tokens + finalUsage.completion_tokens;

      this.logAsync({
        promptText,
        classification,
        model,
        provider,
        usage: finalUsage,
        latencyMs,
        status: 'success',
        reasoning: classification.reasoning,
        classifyLatencyMs: classification.classifyLatencyMs,
        fallbackFrom: classification.fallbackFrom,
        fallbackReason: classification.fallbackReason,
      });
    };

    return { stream, classification, model, provider, finalize };
  }

  // Private Helpers
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    providerName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Provider "${providerName}" failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS);
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Fire-and-forget log - never blocks the response.
   */
  private logAsync(entry: LogEntry): void {
    this.requestLogger.log(entry).catch((err) => {
      this.logger.error('Background log failed', err);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
