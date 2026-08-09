/**
 * OpenAI Provider Adapter — estimate-only by default, real calls only with BYOK.
 *
 * In the public demo, the high tier shows "estimated cost: $X" without making
 * a real API call. If a visitor supplies their own API key (BYOK), the adapter
 * uses it for that single request and never persists it.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { ChatChunk } from '../shared/types';
import { calculateCost } from '../shared/cost-registry';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';

@Injectable()
export class OpenAIAdapter implements ProviderAdapter {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private getClient(apiKey?: string): OpenAI {
    const key = apiKey ?? this.config.get<string>('OPENAI_API_KEY');
    if (!key) {
      throw new Error('No OpenAI API key available');
    }
    return new OpenAI({ apiKey: key });
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    // If no BYOK key and no server key, return an estimate
    const byokKey = request.user_api_key;
    const serverKey = this.config.get<string>('OPENAI_API_KEY');

    if (!byokKey && !serverKey) {
      return this.estimateOnly(request);
    }

    this.logger.debug(`OpenAI chat: model=${request.model} byok=${!!byokKey}`);
    const client = this.getClient(byokKey);

    const completion = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      stream: false,
    });

    const choice = completion.choices[0];
    const usage = completion.usage!;

    return {
      response: {
        id: completion.id,
        object: 'chat.completion',
        created: completion.created,
        model: completion.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: choice.message?.content ?? '',
            },
            finish_reason: choice.finish_reason ?? 'stop',
          },
        ],
        usage: {
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        },
      },
      usage: {
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0,
      },
    };
  }

  async *chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk> {
    const byokKey = request.user_api_key;
    const serverKey = this.config.get<string>('OPENAI_API_KEY');

    if (!byokKey && !serverKey) {
      // Yield a single estimate chunk
      const estimate = await this.estimateOnly(request);
      yield {
        id: estimate.response.id,
        object: 'chat.completion.chunk',
        created: estimate.response.created,
        model: estimate.response.model,
        choices: [
          {
            index: 0,
            delta: { content: estimate.response.choices[0].message.content },
            finish_reason: 'stop',
          },
        ],
        usage: estimate.usage,
      };
      return;
    }

    this.logger.debug(`OpenAI stream: model=${request.model} byok=${!!byokKey}`);
    const client = this.getClient(byokKey);

    const stream = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      yield {
        id: chunk.id,
        object: 'chat.completion.chunk',
        created: chunk.created,
        model: chunk.model ?? request.model,
        choices: [
          {
            index: 0,
            delta: {
              ...(choice?.delta?.role && { role: choice.delta.role as 'assistant' }),
              ...(choice?.delta?.content && { content: choice.delta.content }),
            },
            finish_reason: choice?.finish_reason ?? null,
          },
        ],
        ...(chunk.usage && {
          usage: {
            prompt_tokens: chunk.usage.prompt_tokens ?? 0,
            completion_tokens: chunk.usage.completion_tokens ?? 0,
            total_tokens: chunk.usage.total_tokens ?? 0,
          },
        }),
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns an estimate response without making a real API call.
   * Used when no API key is available (default demo mode).
   */
  private async estimateOnly(
    request: ProviderChatRequest,
  ): Promise<ProviderChatResponse> {
    this.logger.debug(`OpenAI estimate-only: model=${request.model}`);

    const promptText = request.messages.map((m) => m.content).join(' ');
    const estimatedInputTokens = Math.ceil(promptText.split(/\s+/).length * 1.3);
    const estimatedOutputTokens = Math.min(request.max_tokens ?? 1024, 500);
    const estimatedCost = calculateCost(
      request.model,
      estimatedInputTokens,
      estimatedOutputTokens,
    );

    const content =
      `[Estimate-only mode] This prompt would be routed to ${request.model}. ` +
      `Estimated cost: $${estimatedCost.toFixed(6)} ` +
      `(~${estimatedInputTokens} input + ~${estimatedOutputTokens} output tokens). ` +
      `To see a real response, provide your OpenAI API key via the BYOK option.`;

    return {
      response: {
        id: `chatcmpl-estimate-${uuid()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: estimatedInputTokens,
          completion_tokens: estimatedOutputTokens,
          total_tokens: estimatedInputTokens + estimatedOutputTokens,
        },
      },
      usage: {
        prompt_tokens: estimatedInputTokens,
        completion_tokens: estimatedOutputTokens,
        total_tokens: estimatedInputTokens + estimatedOutputTokens,
      },
    };
  }
}
