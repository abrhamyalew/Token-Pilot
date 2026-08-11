import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';

function makeService(max = 2, windowMs = 1000): RateLimiterService {
  return new RateLimiterService({
    get: (key: string, fallback: number) => {
      if (key === 'RATE_LIMIT_MAX') return max;
      if (key === 'RATE_LIMIT_WINDOW_MS') return windowMs;
      return fallback;
    },
  } as ConfigService);
}

describe('RateLimiterService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests until the bucket limit is reached', () => {
    const service = makeService(2);

    expect(service.check('client-a')).toMatchObject({ allowed: true, remaining: 1 });
    expect(service.check('client-a')).toMatchObject({ allowed: true, remaining: 0 });
    expect(service.check('client-a')).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('tracks separate buckets per key', () => {
    const service = makeService(1);

    expect(service.check('client-a').allowed).toBe(true);
    expect(service.check('client-a').allowed).toBe(false);
    expect(service.check('client-b').allowed).toBe(true);
  });

  it('resets a bucket after the configured window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const service = makeService(1, 500);

    expect(service.check('client-a').allowed).toBe(true);
    expect(service.check('client-a').allowed).toBe(false);

    vi.setSystemTime(1_500);

    expect(service.check('client-a')).toMatchObject({ allowed: true, remaining: 0 });
  });

  it('removes expired buckets during cleanup', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const service = makeService(1, 500);

    service.check('client-a');
    vi.setSystemTime(1_500);
    service.cleanup();

    expect(service.check('client-a').allowed).toBe(true);
  });

  it('starts and clears the cleanup interval with Nest lifecycle hooks', () => {
    vi.useFakeTimers();
    const service = makeService();

    service.onModuleInit();
    expect(vi.getTimerCount()).toBe(1);

    service.onModuleDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
