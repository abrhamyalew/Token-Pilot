import { HttpException } from '@nestjs/common';
import { validateByokKey } from './byok-validator';

describe('validateByokKey', () => {
  it('accepts valid OpenAI and Anthropic key shapes', () => {
    expect(() => validateByokKey('openai', 'sk-valid_key-1234567890')).not.toThrow();
    expect(() => validateByokKey('anthropic', 'sk-ant-valid_key-1234567890')).not.toThrow();
  });

  it('rejects empty values', () => {
    expect(() => validateByokKey('openai', '   ')).toThrow(HttpException);
  });

  it('rejects keys outside the allowed length range', () => {
    expect(() => validateByokKey('openai', 'sk-short')).toThrow(HttpException);
    expect(() => validateByokKey('openai', `sk-${'a'.repeat(300)}`)).toThrow(HttpException);
  });

  it('rejects keys with the wrong provider prefix', () => {
    expect(() => validateByokKey('anthropic', 'sk-valid_key-1234567890')).toThrow(
      HttpException,
    );
  });

  it('rejects invalid characters', () => {
    expect(() => validateByokKey('openai', 'sk-valid key with spaces')).toThrow(
      HttpException,
    );
  });
});
