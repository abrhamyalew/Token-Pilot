/**
 * OpenAI Provider Adapter — BYOK only.
 *
 * SECURITY: This adapter NEVER falls back to a server-side environment key under any
 * circumstance. Real calls are strictly executed using the visitor's user-supplied API key
 * (request.user_api_keys.openai). If invoked without a user key, it returns estimate-only mode.
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { ChatChunk } from '../shared/types';
import { calculateCost } from '../shared/cost-registry';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';
import { validateByokKey } from './byok-validator';

@Injectable()
export class OpenAIAdapter implements ProviderAdapter {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIAdapter.name);

  private getClient(apiKey?: string): OpenAI {
    if (!apiKey) {
      throw new Error('OpenAI adapter requires a user-supplied API key; server fallback is strictly disabled');
    }
    validateByokKey('openai', apiKey);
    return new OpenAI({ apiKey });
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const byokKey = request.user_api_keys?.openai;

    if (!byokKey) {
      return this.estimateOnly(request);
    }

    this.logger.debug(`OpenAI chat: model=${request.model} byok=true`);
    const client = this.getClient(byokKey);

    try {
      const completion = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        stream: false,
      });

      const choice = completion.choices[0];
      const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

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
    } catch (error: any) {
      this.logger.error(`OpenAI completion failed: ${error?.message ?? 'Unknown provider error'}`);
      throw error;
    }
  }

  async *chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk> {
    const byokKey = request.user_api_keys?.openai;

    if (!byokKey) {
      const estimate = this.estimateOnly(request);
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

    this.logger.debug(`OpenAI stream: model=${request.model} byok=true`);
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
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          },
        }),
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    // OpenAI adapter operates in BYOK/estimate mode; always ready
    return true;
  }

  private estimateOnly(request: ProviderChatRequest): ProviderChatResponse {
    const promptText = request.messages.map((m) => m.content).join(' ');
    const estimatedPromptTokens = Math.max(1, Math.round(promptText.length / 4));
    const estimatedCompletionTokens = 150;
    const cost = calculateCost(request.model, estimatedPromptTokens, estimatedCompletionTokens);

    return {
      response: {
        id: `chatcmpl-est-${uuid()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                `[Token Pilot — Preset Demo / Estimate Mode]\n\n` +
                `Frontier Tier Notice: This prompt was evaluated as HIGH complexity and routed to ${request.model} (OpenAI).\n\n` +
                `• Classification Tier: HIGH\n` +
                `• Target Provider: OpenAI\n` +
                `• Target Model: ${request.model}\n` +
                `• Token Projection: ~${estimatedPromptTokens} in / ~${estimatedCompletionTokens} out\n` +
                `• Estimated Frontier Cost: $${cost.toFixed(6)}\n\n` +
                `The public demo provides live inference for LOW & MEDIUM tiers (Groq & Google). To execute live requests on frontier models, switch to BYOK Mode and add your OpenAI API key in Config.`,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: estimatedPromptTokens,
          completion_tokens: estimatedCompletionTokens,
          total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
      },
      usage: {
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
      },
    };
  }
}
