import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isHealthy()).toBe(true);
  });

  it('stays CLOSED after failures below threshold', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isHealthy()).toBe(true);
  });

  it('transitions CLOSED -> OPEN after reaching failure threshold', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
    expect(cb.isHealthy()).toBe(false);
  });

  it('transitions OPEN -> HALF_OPEN after reset timeout elapses', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeoutMs: 5000 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Advance time past the reset timeout
    vi.setSystemTime(5001);
    expect(cb.getState()).toBe('HALF_OPEN');
    expect(cb.isHealthy()).toBe(true);
  });

  it('transitions HALF_OPEN -> CLOSED on success', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    vi.setSystemTime(1001);
    expect(cb.getState()).toBe('HALF_OPEN');

    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isHealthy()).toBe(true);
  });

  it('transitions HALF_OPEN -> OPEN on failure (resets timer)', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    vi.setSystemTime(1001);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Fail again in HALF_OPEN
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Must wait another full reset timeout
    vi.setSystemTime(1500);
    expect(cb.getState()).toBe('OPEN');
    vi.setSystemTime(2002);
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('resets consecutive failures on success in CLOSED state', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess(); // resets counter
    cb.recordFailure();
    cb.recordFailure();
    // Only 2 failures after reset, should still be CLOSED
    expect(cb.getState()).toBe('CLOSED');
  });

  it('reset() force-closes the circuit', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    cb.reset();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isHealthy()).toBe(true);
  });

  describe('execute()', () => {
    it('passes through and records success when CLOSED', async () => {
      const cb = new CircuitBreaker('test');
      const result = await cb.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
      expect(cb.getState()).toBe('CLOSED');
    });

    it('records failure and rethrows when function throws', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 2 });
      const error = new Error('boom');

      await expect(cb.execute(() => Promise.reject(error))).rejects.toThrow('boom');
      expect(cb.getState()).toBe('CLOSED'); // only 1 failure so far
    });

    it('rejects immediately with CircuitOpenError when OPEN', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 1 });
      cb.recordFailure(); // opens circuit

      const fn = vi.fn();
      await expect(cb.execute(fn)).rejects.toThrow(CircuitOpenError);
      expect(fn).not.toHaveBeenCalled(); // function never called
    });

    it('allows one probe call in HALF_OPEN state', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 1000 });
      cb.recordFailure(); // OPEN
      vi.setSystemTime(1001); // HALF_OPEN

      const result = await cb.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('CLOSED');
    });

    it('re-opens on probe failure in HALF_OPEN state', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 1000 });
      cb.recordFailure(); // OPEN
      vi.setSystemTime(1001); // HALF_OPEN

      await expect(cb.execute(() => Promise.reject(new Error('still down')))).rejects.toThrow('still down');
      expect(cb.getState()).toBe('OPEN');
    });
  });
});
