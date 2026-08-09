/**
 * Provider Adapter Interface.
 *
 * Every LLM provider (Groq, Google, OpenAI, Mock) implements this contract.
 * The router resolves a tier → provider and calls the adapter without caring
 * which upstream API is behind it.
 */

import { ChatRequest, ChatResponse, ChatChunk, TokenUsage } from '../shared/types';

export interface ProviderAdapter {
  readonly name: string;

  /** Non-streaming completion */
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>;

  /** Streaming completion — yields OpenAI-format chunks */
  chatStream(request: ProviderChatRequest): AsyncIterable<ChatChunk>;

  /** Quick health check — returns true if the provider is reachable */
  healthCheck(): Promise<boolean>;
}

/** Request sent to a provider adapter (model already resolved) */
export interface ProviderChatRequest extends ChatRequest {
  /** The specific model to use — already resolved from the tier config */
  model: string;
}

/** Response from a provider adapter with usage data */
export interface ProviderChatResponse {
  response: ChatResponse;
  usage: TokenUsage;
}
