/**
 * Google AI Studio Provider Adapter — Gemini Flash on the free tier.
 *
 * Uses the @google/generative-ai SDK. The API shape differs from OpenAI,
 * so this adapter normalizes everything to the OpenAI response format.
 * Free tier: dynamic quotas, no credit card required.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { ChatChunk, ChatMessage } from '../shared/types';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';

@Injectable()
export class GoogleAdapter implements ProviderAdapter {
  readonly name = 'google';
  private readonly logger = new Logger(GoogleAdapter.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      const apiKey = this.config.get<string>('GOOGLE_API_KEY');
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY not configured');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    this.logger.debug(`Google chat: model=${request.model}`);
    const genAI = this.getGenAI();

    const { systemInstruction, history, lastMessage } = this.convertMessages(request.messages);

    const model = genAI.getGenerativeModel({
      model: request.model,
      ...(systemInstruction && { systemInstruction }),
      generationConfig: {
        maxOutputTokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      },
    });

    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessage(lastMessage);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;

    return {
      response: {
        id: `chatcmpl-google-${uuid()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: text },
            finish_reason: 'stop',
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
    this.logger.debug(`Google stream: model=${request.model}`);
    const genAI = this.getGenAI();

    const { systemInstruction, history, lastMessage } = this.convertMessages(request.messages);

    const model = genAI.getGenerativeModel({
      model: request.model,
      ...(systemInstruction && { systemInstruction }),
      generationConfig: {
        maxOutputTokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      },
    });

    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessageStream(lastMessage);
    const id = `chatcmpl-google-${uuid()}`;
    const created = Math.floor(Date.now() / 1000);

    let lastUsage: any = null;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (chunk.usageMetadata) {
        lastUsage = chunk.usageMetadata;
      }

      if (text) {
        yield {
          id,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [
            {
              index: 0,
              delta: { content: text },
              finish_reason: null,
            },
          ],
        };
      }
    }

    // Final chunk with finish_reason and usage
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
      ...(lastUsage && {
        usage: {
          prompt_tokens: lastUsage.promptTokenCount ?? 0,
          completion_tokens: lastUsage.candidatesTokenCount ?? 0,
          total_tokens: lastUsage.totalTokenCount ?? 0,
        },
      }),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const genAI = this.getGenAI();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.countTokens('health check');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert OpenAI-format messages to Google's format.
   * Extracts system instruction, conversation history, and the last user message.
   */
  private convertMessages(messages: ChatMessage[]): {
    systemInstruction: string | undefined;
    history: ChatMessage[];
    lastMessage: string;
  } {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const history = nonSystem.slice(0, -1);
    const last = nonSystem[nonSystem.length - 1];

    return {
      systemInstruction: systemMsg?.content,
      history,
      lastMessage: last?.content ?? '',
    };
  }
}
