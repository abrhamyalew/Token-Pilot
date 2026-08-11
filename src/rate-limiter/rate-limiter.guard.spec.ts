import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimiterGuard } from './rate-limiter.guard';

function makeContext(ip?: string, remoteAddress?: string) {
  const headers: Record<string, string> = {};
  const res = { setHeader: vi.fn() };
  const req = { ip, socket: { remoteAddress } };

  return {
    res,
    context: {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as ExecutionContext,
  };
}

describe('RateLimiterGuard', () => {
  it('sets rate limit headers and allows requests under the limit', () => {
    const rateLimiter = {
      check: vi.fn().mockReturnValue({ allowed: true, remaining: 4, resetAt: 10_000 }),
    };
    const { context, res } = makeContext('203.0.113.10');

    expect(new RateLimiterGuard(rateLimiter as any).canActivate(context)).toBe(true);
    expect(rateLimiter.check).toHaveBeenCalledWith('203.0.113.10');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', '10');
  });

  it('falls back to socket remoteAddress when req.ip is absent', () => {
    const rateLimiter = {
      check: vi.fn().mockReturnValue({ allowed: true, remaining: 1, resetAt: 20_000 }),
    };
    const { context } = makeContext(undefined, '127.0.0.1');

    new RateLimiterGuard(rateLimiter as any).canActivate(context);

    expect(rateLimiter.check).toHaveBeenCalledWith('127.0.0.1');
  });

  it('throws a 429 response when the limit is exceeded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const rateLimiter = {
      check: vi.fn().mockReturnValue({ allowed: false, remaining: 0, resetAt: 15_000 }),
    };
    const { context } = makeContext('203.0.113.10');

    expect(() => new RateLimiterGuard(rateLimiter as any).canActivate(context)).toThrow(
      HttpException,
    );

    vi.useRealTimers();
  });
});
