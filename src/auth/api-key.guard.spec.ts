import { ConfigService } from '@nestjs/config';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function contextWithHeader(value?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: value ? { 'x-api-key': value } : {} }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  function makeGuard(apiKey?: string): ApiKeyGuard {
    const guard = new ApiKeyGuard({
      get: vi.fn().mockReturnValue(apiKey),
    } as unknown as ConfigService);
    guard.onModuleInit();
    return guard;
  }

  it('allows requests when no server API key is configured', () => {
    expect(makeGuard().canActivate(contextWithHeader())).toBe(true);
  });

  it('allows requests with the matching API key', () => {
    expect(makeGuard('secret-key').canActivate(contextWithHeader('secret-key'))).toBe(true);
  });

  it('rejects missing API keys when auth is enabled', () => {
    expect(() => makeGuard('secret-key').canActivate(contextWithHeader())).toThrow(HttpException);
  });

  it('rejects invalid API keys', () => {
    expect(() =>
      makeGuard('secret-key').canActivate(contextWithHeader('wrong-key')),
    ).toThrow(HttpException);
  });

  it('rejects same-prefix keys with a different length', () => {
    expect(() =>
      makeGuard('secret-key').canActivate(contextWithHeader('secret-key-extra')),
    ).toThrow(HttpException);
  });
});
