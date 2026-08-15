import { HttpException } from '@nestjs/common';
import { validateByokKey } from './byok-validator';

describe('validateByokKey', () => {
  it('accepts valid key shapes for all 5 providers', () => {
    expect(() => validateByokKey('openai', 'sk-valid_key-1234567890')).not.toThrow();
    expect(() => validateByokKey('anthropic', 'sk-ant-valid_key-1234567890')).not.toThrow();
    expect(() => validateByokKey('groq', 'gsk_valid_key_123456789012345')).not.toThrow();
    expect(() => validateByokKey('google', 'AIzaSyA1234567890abcdefghijklmnop')).not.toThrow();
    expect(() => validateByokKey('deepseek', 'sk-valid_key-1234567890')).not.toThrow();
  });

  it('rejects empty values', () => {
    expect(() => validateByokKey('openai', '   ')).toThrow(HttpException);
    expect(() => validateByokKey('groq', '')).toThrow(HttpException);
  });

  it('rejects keys outside the allowed length range', () => {
    expect(() => validateByokKey('openai', 'sk-short')).toThrow(HttpException);
    expect(() => validateByokKey('groq', 'gsk_123')).toThrow(HttpException);
    expect(() => validateByokKey('google', `AIza${'a'.repeat(300)}`)).toThrow(HttpException);
  });

  it('rejects keys with the wrong provider prefix', () => {
    expect(() => validateByokKey('anthropic', 'sk-valid_key-1234567890')).toThrow(HttpException);
    expect(() => validateByokKey('groq', 'sk-valid_key-1234567890')).toThrow(HttpException);
    expect(() => validateByokKey('google', 'gsk_valid_key_1234567890')).toThrow(HttpException);
  });

  it('rejects invalid characters', () => {
    expect(() => validateByokKey('openai', 'sk-valid key with spaces')).toThrow(HttpException);
    expect(() => validateByokKey('google', 'AIza#@invalid!characters')).toThrow(HttpException);
  });

  it('never reflects the secret key in the error message', () => {
    const sensitiveKey = 'sk-invalid sensitive secret key with spaces 12345';
    try {
      validateByokKey('openai', sensitiveKey);
      expect.fail('Expected validateByokKey to throw');
    } catch (e: any) {
      const response = e.getResponse?.() ?? e.message;
      const responseStr = JSON.stringify(response);
      expect(responseStr).not.toContain(sensitiveKey);
      expect(responseStr).not.toContain('sensitive secret');
    }
  });
});
