/**
 * OpenAI-compatible chat types.
 * These mirror the OpenAI API shape so any existing SDK client works unchanged.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

import { Tier, ClassifierType } from './classifier';

export interface ChatRequest {
  /** Optional: Token Pilot picks the model via routing. Clients can send this but it is ignored. */
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  /** Select classifier: 'rules' (default), 'llm', or 'trained' */
  classifier?: ClassifierType;
  /** Chosen provider for LLM classifier (e.g. 'google', 'groq', 'openai') */
  classifier_provider?: string;
  /** Chosen model for LLM classifier (e.g. 'gemini-3.6-flash', 'llama-3.3-70b-versatile', 'gpt-4o-mini') */
  classifier_model?: string;
  /** Dedicated API key for the LLM classifier */
  classifier_api_key?: string;
  /** Multi-provider BYOK keys mapped by provider name (e.g. { openai: '...', groq: '...', google: '...' }) */
  user_api_keys?: Record<string, string>;
  /** Optional per-tier model & provider overrides */
  tier_model_overrides?: Partial<Record<Tier, { model: string; provider: string }>>;
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: TokenUsage;
  /** Token Pilot extension: routing metadata */
  routing?: RoutingMetadata;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatChunkChoice[];
  /** Only present on the final chunk when usage reporting is enabled */
  usage?: TokenUsage;
}

export interface ChatChunkChoice {
  index: number;
  delta: Partial<ChatMessage>;
  finish_reason: string | null;
}

/** Extension metadata returned alongside responses */
export interface RoutingMetadata {
  tier: string;
  classifier: string;
  confidence: number;
  /** Raw complexity score from the scoring engine (0-1 range) */
  score: number;
  /** The model selected by routing */
  model: string;
  /** The provider serving the model */
  provider: string;
  actual_cost: number;
  frontier_cost: number;
  savings: number;
  latency_ms: number;
  /** The max_tokens value actually used (may be less than requested) */
  max_tokens_applied: number;
  /** True if the requested max_tokens was capped to the demo limit */
  max_tokens_capped: boolean;
  /** Optional reasoning from LLM classifier */
  reasoning?: string;
  /** Classification latency in ms */
  classify_latency_ms?: number;
  /** Which provider was used for LLM classification (e.g. 'google', 'groq') */
  classifier_provider?: string;
  /** Which model was used for LLM classification (e.g. 'gemini-3.6-flash') */
  classifier_model?: string;
  /** If fallback occurred (e.g. from llm to rules) */
  fallback_from?: string;
  fallback_reason?: string;
}

