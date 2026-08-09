/**
 * DeepSeek Provider Adapter — DeepSeek V4 Flash via OpenAI-compatible API.
 *
 * DeepSeek's API is OpenAI-compatible, so we use the `openai` SDK with
 * a custom baseURL pointed at api.deepseek.com.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { ChatChunk } from '../shared/types';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';

@Injectable()
export class DeepSeekAdapter implements ProviderAdapter {
  readonly name = 'deepseek';
  private readonly logger = new Logger(DeepSeekAdapter.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY not configured');
      }
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
    }
    return this.client;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    this.logger.debug(`DeepSeek chat: model=${request.model}`);
    const client = this.getClient();

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
        id: completion.id ?? `chatcmpl-deepseek-${uuid()}`,
        object: 'chat.completion',
        created: completion.created ?? Math.floor(Date.now() / 1000),
        model: completion.model ?? request.model,
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
    this.logger.debug(`DeepSeek stream: model=${request.model}`);
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    });

    const id = `chatcmpl-deepseek-${uuid()}`;
    const created = Math.floor(Date.now() / 1000);

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      yield {
        id: chunk.id ?? id,
        object: 'chat.completion.chunk',
        created: chunk.created ?? created,
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
}
