/**
 * Router Controller — the OpenAI-compatible HTTP endpoint.
 *
 * POST /v1/chat/completions  — main routing endpoint (streaming + non-streaming)
 * GET  /health               — health check
 * GET  /v1/models            — list available models/tiers
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RouterService } from './router.service';
import { RateLimiterGuard } from '../rate-limiter/rate-limiter.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ChatRequest, TokenUsage } from '../shared/types';
import { getAllTiers, getAllModels } from '../shared/cost-registry';

@Controller()
export class RouterController {
  private readonly logger = new Logger(RouterController.name);

  constructor(
    private readonly routerService: RouterService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  /**
   * OpenAI-compatible chat completions endpoint.
   * Supports both streaming (SSE) and non-streaming responses.
   */
  @Post('v1/chat/completions')
  @UseGuards(ApiKeyGuard, RateLimiterGuard)
  async chatCompletions(
    @Body() body: ChatRequest,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Validate request
      if (!body.messages || body.messages.length === 0) {
        throw new HttpException(
          { error: { message: 'messages is required and must not be empty' } },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (body.stream) {
        await this.handleStream(body, res);
      } else {
        await this.handleNonStream(body, res);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Chat completion failed', (error as Error)?.stack ?? error);
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error',
        },
      });
    }
  }

  /**
   * Health check endpoint.
   */
  @Get('health')
  async health(): Promise<{
    status: string;
    timestamp: string;
    providers: Record<string, boolean>;
  }> {
    const providers = await this.providerRegistry.checkAllHealth();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers,
    };
  }

  /**
   * List available models and tier configuration.
   * Matches OpenAI's /v1/models shape loosely.
   */
  @Get('v1/models')
  listModels(): { object: string; data: any[] } {
    const tiers = getAllTiers();
    const models = getAllModels();

    const data = Object.entries(tiers).map(([tier, config]) => ({
      id: config.model,
      object: 'model',
      owned_by: config.provider,
      tier,
      pricing: models[config.model]
        ? {
            input_per_1k_tokens: models[config.model].inputCostPer1kTokens,
            output_per_1k_tokens: models[config.model].outputCostPer1kTokens,
          }
        : null,
    }));

    return { object: 'list', data };
  }

  // ─── Private Handlers ──────────────────────────────────────────────────

  private async handleNonStream(
    body: ChatRequest,
    res: Response,
  ): Promise<void> {
    const result = await this.routerService.handleRequest(body);

    this.logger.log(
      `Routed to ${result.classification.tier} → ${result.response.model} ` +
        `(confidence: ${result.classification.confidence.toFixed(2)})`,
    );

    res.json(result.response);
  }

  private async handleStream(
    body: ChatRequest,
    res: Response,
  ): Promise<void> {
    const result = this.routerService.handleStreamRequest(body);

    this.logger.log(
      `Streaming ${result.classification.tier} → ${result.model} ` +
        `(confidence: ${result.classification.confidence.toFixed(2)})`,
    );

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Token-Pilot-Tier', result.classification.tier);
    res.setHeader('X-Token-Pilot-Model', result.model);
    res.setHeader(
      'X-Token-Pilot-Confidence',
      result.classification.confidence.toFixed(3),
    );

    // Stream chunks to the client
    let collectedContent = '';
    let lastUsage: TokenUsage | null = null;

    try {
      for await (const chunk of result.stream) {
        // Collect content for token estimation
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          collectedContent += delta.content;
        }

        // Capture usage from the final chunk if available
        if (chunk.usage) {
          lastUsage = chunk.usage;
        }

        // Write SSE event
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      // SSE terminator
      res.write('data: [DONE]\n\n');
      res.end();

      // Log the completed request asynchronously
      result.finalize(collectedContent, lastUsage);
    } catch (error) {
      this.logger.error('Streaming error', error);
      // Try to write an error event before ending
      try {
        res.write(
          `data: ${JSON.stringify({ error: { message: 'Stream interrupted' } })}\n\n`,
        );
        res.end();
      } catch {
        // Response might already be closed
      }
    }
  }
}
