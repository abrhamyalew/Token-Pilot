/**
 * Anthropic Provider Adapter — BYOK only.
 *
 * Claude models via the Anthropic SDK. Normalizes response to OpenAI shape.
 *
 * SECURITY: This adapter NEVER falls back to a server-side environment key under any
 * circumstance. Real calls are strictly executed using the visitor's user-supplied API key
 * (request.user_api_keys.anthropic). If invoked without a user key, it returns estimate-only mode.
 */

import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import { ChatChunk, ChatMessage } from '../shared/types';
import { calculateCost } from '../shared/cost-registry';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';
import { validateByokKey } from './byok-validator';

@Injectable()
export class AnthropicAdapter implements ProviderAdapter {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicAdapter.name);

  private getClient(apiKey?: string): Anthropic {
    if (!apiKey) {
      throw new Error('Anthropic adapter requires a user-supplied API key; server fallback is strictly disabled');
    }
    validateByokKey('anthropic', apiKey);
    return new Anthropic({ apiKey });
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const byokKey = request.user_api_keys?.anthropic;

    if (!byokKey) {
      return this.estimateOnly(request);
    }

    this.logger.debug(`Anthropic chat: model=${request.model} byok=true`);
    const client = this.getClient(byokKey);

    try {
      const { system, messages } = this.convertMessages(request.messages);

      const response = await client.messages.create({
        model: request.model,
        max_tokens: request.max_tokens ?? 1024,
        ...(system && { system }),
        messages,
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;

      return {
        response: {
          id: `chatcmpl-anthropic-${response.id}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: response.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content },
              finish_reason: response.stop_reason === 'end_turn' ? 'stop' : (response.stop_reason ?? 'stop'),
            },
          ],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          },
        },
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
      };
    } catch (error: any) {
      this.logger.error(`Anthropic completion failed: ${error?.message ?? 'Unknown provider error'}`);
      throw error;
    }
  }

  async *chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk> {
    const byokKey = request.user_api_keys?.anthropic;

    if (!byokKey) {
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

    this.logger.debug(`Anthropic stream: model=${request.model} byok=true`);
    const client = this.getClient(byokKey);

    const { system, messages } = this.convertMessages(request.messages);

    const stream = client.messages.stream({
      model: request.model,
      max_tokens: request.max_tokens ?? 1024,
      ...(system && { system }),
      messages,
    });

    const id = `chatcmpl-anthropic-${uuid()}`;
    const created = Math.floor(Date.now() / 1000);

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield {
          id,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [
            {
              index: 0,
              delta: { content: event.delta.text },
              finish_reason: null,
            },
          ],
        };
      }
    }

    // Final chunk with usage from the completed message
    const finalMessage = await stream.finalMessage();

    yield {
      id,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: finalMessage.usage.input_tokens,
        completion_tokens: finalMessage.usage.output_tokens,
        total_tokens:
          finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    // Anthropic adapter operates in BYOK/estimate mode; always ready
    return true;
  }

  /**
   * Convert OpenAI-format messages to Anthropic format.
   * Extracts system prompt separately (Anthropic requires it as a top-level param).
   */
  private convertMessages(
    openaiMessages: ChatMessage[],
  ): {
    system: string | undefined;
    messages: Anthropic.MessageParam[];
  } {
    const systemMsg = openaiMessages.find((m) => m.role === 'system');
    const nonSystem = openaiMessages.filter((m) => m.role !== 'system');

    const messages: Anthropic.MessageParam[] = nonSystem.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return {
      system: systemMsg?.content,
      messages,
    };
  }

  /**
   * Returns an estimate response without making a real API call.
   */
  private async estimateOnly(
    request: ProviderChatRequest,
  ): Promise<ProviderChatResponse> {
    this.logger.debug(`Anthropic estimate-only: model=${request.model}`);

    const promptText = request.messages.map((m) => m.content).join(' ');
    const estimatedInputTokens = Math.ceil(promptText.split(/\s+/).length * 1.3);
    const estimatedOutputTokens = Math.min(request.max_tokens ?? 1024, 500);
    const estimatedCost = calculateCost(
      request.model,
      estimatedInputTokens,
      estimatedOutputTokens,
    );

    const content =
      `[Token Pilot — Preset Demo / Estimate Mode]\n\n` +
      `Frontier Tier Notice: This prompt was evaluated as HIGH_ALT complexity and routed to ${request.model} (Anthropic).\n\n` +
      `• Classification Tier: HIGH_ALT\n` +
      `• Target Provider: Anthropic\n` +
      `• Target Model: ${request.model}\n` +
      `• Token Projection: ~${estimatedInputTokens} in / ~${estimatedOutputTokens} out\n` +
      `• Estimated Frontier Cost: $${estimatedCost.toFixed(6)}\n\n` +
      `The public demo provides live inference for LOW & MEDIUM tiers (Groq & Google). To execute live requests on frontier models, switch to BYOK Mode and add your Anthropic API key in Config.`;

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
