/**
 * Mock Provider Adapter — returns canned responses for development and testing.
 * No external API calls, no keys required. Always healthy.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ChatChunk } from '../shared/types';
import { estimateTokens } from '../shared/token-estimator';
import {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
} from './provider.interface';

@Injectable()
export class MockAdapter implements ProviderAdapter {
  readonly name = 'mock';
  private readonly logger = new Logger(MockAdapter.name);

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    this.logger.debug(`Mock chat: model=${request.model}`);
    const content = this.generateResponse(request);

    const promptTokens = estimateTokens(
      request.messages.map((m) => m.content).join(' '),
    );
    const completionTokens = estimateTokens(content);

    return {
      response: {
        id: `chatcmpl-mock-${uuid()}`,
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
    this.logger.debug(`Mock stream: model=${request.model}`);
    const content = this.generateResponse(request);
    const id = `chatcmpl-mock-${uuid()}`;
    const created = Math.floor(Date.now() / 1000);

    // Simulate streaming by yielding word-by-word
    const words = content.split(' ');
    for (let i = 0; i < words.length; i++) {
      const text = i === 0 ? words[i] : ' ' + words[i];
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
      // Simulate latency
      await this.sleep(20);
    }

    // Final chunk with usage
    const promptTokens = estimateTokens(
      request.messages.map((m) => m.content).join(' '),
    );
    const completionTokens = estimateTokens(content);

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
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private generateResponse(request: ProviderChatRequest): string {
    const lastMessage = request.messages[request.messages.length - 1];
    return (
      `[Mock response from ${request.model}] ` +
      `You asked: "${lastMessage?.content?.substring(0, 80) ?? ''}..." — ` +
      `This is a simulated response for development. ` +
      `In production, this would be routed to a real LLM provider.`
    );
  }



  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
