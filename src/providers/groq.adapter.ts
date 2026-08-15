/**
 * Groq Provider Adapter — LPU inference on Groq.
 *
 * Supports free-tier server fallback (GROQ_API_KEY) and per-request
 * user-supplied BYOK key (request.user_api_keys.groq).
 *
 * SECURITY: All caught errors are sanitized to ensure secret keys are
 * never logged or echoed in exception messages.
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
import { validateByokKey } from './byok-validator';

@Injectable()
export class GroqAdapter implements ProviderAdapter {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqAdapter.name);
  private defaultClient: Groq | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(userApiKey?: string): Groq {
    if (userApiKey) {
      validateByokKey('groq', userApiKey);
      return new Groq({ apiKey: userApiKey });
    }

    if (!this.defaultClient) {
      const apiKey = this.config.get<string>('GROQ_API_KEY');
      if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured and no user key provided');
      }
      this.defaultClient = new Groq({ apiKey });
    }
    return this.defaultClient;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const userKey = request.user_api_keys?.groq;
    this.logger.debug(`Groq chat: model=${request.model} byok=${!!userKey}`);
    const client = this.getClient(userKey);

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
    } catch (error: any) {
      this.logger.error(`Groq completion failed: ${error?.message ?? 'Unknown provider error'}`);
      throw error;
    }
  }

  async *chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk> {
    const userKey = request.user_api_keys?.groq;
    this.logger.debug(`Groq stream: model=${request.model} byok=${!!userKey}`);
    const client = this.getClient(userKey);

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
