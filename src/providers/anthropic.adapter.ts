/**
 * Anthropic Provider Adapter — Claude models via the Anthropic SDK.
 *
 * Anthropic's API differs from OpenAI's, so this adapter normalizes
 * Claude's message format to the OpenAI response shape.
 * Operates in estimate-only mode when no API key is available (same as OpenAI adapter).
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly config: ConfigService) {}

  private getClient(apiKey?: string): Anthropic {
    const key = apiKey ?? this.config.get<string>('ANTHROPIC_API_KEY');
    if (!key) {
      throw new Error('No Anthropic API key available');
    }
    return new Anthropic({ apiKey: key });
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const byokKey = request.user_api_key;
    const serverKey = this.config.get<string>('ANTHROPIC_API_KEY');

    if (!byokKey && !serverKey) {
      return this.estimateOnly(request);
    }

    // Validate BYOK key format before constructing a client
    if (byokKey) {
      validateByokKey('anthropic', byokKey);
    }

    this.logger.debug(`Anthropic chat: model=${request.model} byok=${!!byokKey}`);
    const client = this.getClient(byokKey);

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
  }

  async *chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk> {
    const byokKey = request.user_api_key;
    const serverKey = this.config.get<string>('ANTHROPIC_API_KEY');

    if (!byokKey && !serverKey) {
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

    // Validate BYOK key format before constructing a client
    if (byokKey) {
      validateByokKey('anthropic', byokKey);
    }

    this.logger.debug(`Anthropic stream: model=${request.model} byok=${!!byokKey}`);
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
    try {
      const key = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!key) {
        return false;
      }
      // Lightweight API call — count tokens to verify the key is valid
      const client = this.getClient();
      await client.messages.countTokens({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'health check' }],
      });
      return true;
    } catch {
      return false;
    }
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
      `[Estimate-only mode] This prompt would be routed to ${request.model}. ` +
      `Estimated cost: $${estimatedCost.toFixed(6)} ` +
      `(~${estimatedInputTokens} input + ~${estimatedOutputTokens} output tokens). ` +
      `To see a real response, provide your Anthropic API key via the BYOK option.`;

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
