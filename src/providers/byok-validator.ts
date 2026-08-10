/**
 * BYOK Key Validator — format-validates user-supplied API keys before use.
 *
 * This catches garbage, accidental pastes, and obviously-malformed strings
 * before they're sent to a provider SDK. It does NOT validate that a key
 * is real or belongs to the sender — that's a provider-side concern, and
 * the auth guard (#3/#4) limits who can reach this endpoint at all.
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** Supported providers for BYOK format validation */
export type ByokProvider = 'openai' | 'anthropic';

interface ProviderKeyRules {
  /** Human-readable provider name for error messages */
  label: string;
  /** Required prefix (e.g., 'sk-') */
  prefix: string;
  /** Minimum key length */
  minLength: number;
  /** Maximum key length */
  maxLength: number;
  /** Allowed character pattern (applied after prefix check) */
  charPattern: RegExp;
}

const KEY_RULES: Record<ByokProvider, ProviderKeyRules> = {
  openai: {
    label: 'OpenAI',
    prefix: 'sk-',
    minLength: 20,
    maxLength: 256,
    charPattern: /^[a-zA-Z0-9\-_]+$/,
  },
  anthropic: {
    label: 'Anthropic',
    prefix: 'sk-ant-',
    minLength: 20,
    maxLength: 256,
    charPattern: /^[a-zA-Z0-9\-_]+$/,
  },
};

/**
 * Validate a BYOK API key's format before forwarding it to a provider SDK.
 * Throws HttpException(400) with a clear message on failure.
 *
 * @param provider - Which provider's key format to validate against
 * @param key - The raw key string from the request body
 */
export function validateByokKey(provider: ByokProvider, key: string): void {
  const rules = KEY_RULES[provider];

  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new HttpException(
      {
        error: {
          message: `${rules.label} API key must be a non-empty string.`,
          type: 'invalid_request_error',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const trimmed = key.trim();

  if (trimmed.length < rules.minLength || trimmed.length > rules.maxLength) {
    throw new HttpException(
      {
        error: {
          message: `${rules.label} API key must be between ${rules.minLength} and ${rules.maxLength} characters.`,
          type: 'invalid_request_error',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!trimmed.startsWith(rules.prefix)) {
    throw new HttpException(
      {
        error: {
          message: `${rules.label} API key must start with "${rules.prefix}".`,
          type: 'invalid_request_error',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!rules.charPattern.test(trimmed)) {
    throw new HttpException(
      {
        error: {
          message: `${rules.label} API key contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`,
          type: 'invalid_request_error',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
