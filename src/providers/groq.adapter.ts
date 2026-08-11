/**
 * Groq Provider Adapter — Llama 3.3 70B on Groq's free-tier LPU inference.
 *
 * Groq's API is OpenAI-compatible, so we use the groq-sdk which mirrors
 * the OpenAI SDK interface exactly. Free tier: ~30 RPM, 30K TPM.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { v4 as uuid } from 'uuid';
import { ChatChunk } from '../shared/types';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';

@Injectable()
export class GroqAdapter implements ProviderAdapter {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqAdapter.name);
  private client: Groq | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Groq {
    if (!this.client) {
      const apiKey = this.config.get<string>('GROQ_API_KEY');
      if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
      }
      this.client = new Groq({ apiKey });
    }
    return this.client;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    this.logger.debug(`Groq chat: model=${request.model}`);
    const client = this.getClient();

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
        id: completion.id ?? `chatcmpl-groq-${uuid()}`,
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
    this.logger.debug(`Groq stream: model=${request.model}`);
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      stream: true,
    });

    const id = `chatcmpl-groq-${uuid()}`;
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
        // Groq sends usage in x_groq field on last chunk
        ...((chunk as any).x_groq?.usage && {
          usage: {
            prompt_tokens: (chunk as any).x_groq.usage.prompt_tokens,
            completion_tokens: (chunk as any).x_groq.usage.completion_tokens,
            total_tokens: (chunk as any).x_groq.usage.total_tokens,
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
