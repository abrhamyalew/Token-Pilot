/**
 * Chat Request Validation Pipe — validates incoming ChatRequest bodies.
 *
 * Uses a custom PipeTransform instead of class-validator to avoid adding
 * a dependency for straightforward validation logic.
 *
 * Validates:
 *   - messages is a non-empty array
 *   - each message has a valid role and string content
 *   - max_tokens is a positive integer ≤ 4096 (if provided)
 *   - temperature is between 0 and 2 (if provided)
 *   - total request body size is ≤ 100KB
 */

import {
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ChatRequest } from '../shared/types';

const VALID_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_BODY_SIZE_BYTES = 100 * 1024; // 100KB
const MAX_TOKENS_LIMIT = 4096;

@Injectable()
export class ChatRequestValidationPipe implements PipeTransform<ChatRequest, ChatRequest> {
  transform(value: ChatRequest): ChatRequest {
    // Size check — rough estimate from JSON serialization
    const bodySize = JSON.stringify(value).length;
    if (bodySize > MAX_BODY_SIZE_BYTES) {
      this.fail(`Request body too large (${Math.round(bodySize / 1024)}KB). Maximum is 100KB.`);
    }

    // messages: required, non-empty array
    if (!value.messages || !Array.isArray(value.messages) || value.messages.length === 0) {
      this.fail('messages is required and must be a non-empty array.');
    }

    // Validate each message
    for (let i = 0; i < value.messages.length; i++) {
      const msg = value.messages[i];

      if (!msg || typeof msg !== 'object') {
        this.fail(`messages[${i}] must be an object with role and content.`);
      }

      if (!msg.role || !VALID_ROLES.has(msg.role)) {
        this.fail(
          `messages[${i}].role must be one of: ${[...VALID_ROLES].join(', ')}. Got: "${msg.role}"`,
        );
      }

      if (typeof msg.content !== 'string') {
        this.fail(`messages[${i}].content must be a string.`);
      }
    }

    // max_tokens: optional, positive integer ≤ MAX_TOKENS_LIMIT
    if (value.max_tokens !== undefined && value.max_tokens !== null) {
      if (
        typeof value.max_tokens !== 'number' ||
        !Number.isInteger(value.max_tokens) ||
        value.max_tokens < 1 ||
        value.max_tokens > MAX_TOKENS_LIMIT
      ) {
        this.fail(
          `max_tokens must be a positive integer between 1 and ${MAX_TOKENS_LIMIT}. Got: ${value.max_tokens}`,
        );
      }
    }

    // temperature: optional, 0–2
    if (value.temperature !== undefined && value.temperature !== null) {
      if (
        typeof value.temperature !== 'number' ||
        value.temperature < 0 ||
        value.temperature > 2
      ) {
        this.fail(`temperature must be a number between 0 and 2. Got: ${value.temperature}`);
      }
    }

    // user_api_keys: optional, record of string -> string
    if (value.user_api_keys !== undefined && value.user_api_keys !== null) {
      if (typeof value.user_api_keys !== 'object' || Array.isArray(value.user_api_keys)) {
        this.fail('user_api_keys must be an object with provider keys.');
      }
      for (const [provider, key] of Object.entries(value.user_api_keys)) {
        if (typeof key !== 'string') {
          this.fail(`user_api_keys["${provider}"] must be a string.`);
        }
      }
    }

    // tier_model_overrides: optional, record of Tier -> { model: string, provider: string }
    if (value.tier_model_overrides !== undefined && value.tier_model_overrides !== null) {
      if (typeof value.tier_model_overrides !== 'object' || Array.isArray(value.tier_model_overrides)) {
        this.fail('tier_model_overrides must be an object.');
      }
      for (const [tier, config] of Object.entries(value.tier_model_overrides)) {
        if (!config || typeof config !== 'object' || typeof config.model !== 'string' || typeof config.provider !== 'string') {
          this.fail(`tier_model_overrides["${tier}"] must have string "model" and "provider" fields.`);
        }
      }
    }

    return value;
  }

  private fail(message: string): never {
    throw new HttpException(
      {
        error: {
          message,
          type: 'invalid_request_error',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
