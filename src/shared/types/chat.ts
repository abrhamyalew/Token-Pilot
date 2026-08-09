/**
 * OpenAI-compatible chat types.
 * These mirror the OpenAI API shape so any existing SDK client works unchanged.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  /** Optional — Token Pilot picks the model via routing. Clients can send this but it's ignored. */
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  /** BYOK: visitor-supplied API key for frontier-tier real calls */
  user_api_key?: string;
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
  actual_cost: number;
  frontier_cost: number;
  savings: number;
  latency_ms: number;
}
