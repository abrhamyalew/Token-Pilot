export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3
  resetTimeoutMs?: number;   // default: 60_000
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    readonly name: string,
    options?: CircuitBreakerOptions,
  ) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 60_000;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.hasResetTimeoutElapsed()) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  isHealthy(): boolean {
    const current = this.getState();
    return current === 'CLOSED' || current === 'HALF_OPEN';
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.getState() === 'OPEN') {
      throw new CircuitOpenError(this.name);
    }
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private hasResetTimeoutElapsed(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }
}

export class CircuitOpenError extends Error {
  constructor(providerName: string) {
    super(`Circuit breaker OPEN for provider "${providerName}"`);
    this.name = 'CircuitOpenError';
  }
}
