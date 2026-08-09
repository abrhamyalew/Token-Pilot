/**
 * Rate Limiter Service — in-memory, IP-based rate limiting.
 *
 * Tracks request counts per IP within a sliding window. Defaults to
 * 10 requests per hour. Configurable via RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS.
 *
 * Phase 2 upgrade: move to Redis or a distributed store for multi-instance.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, RateBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: ConfigService) {
    this.maxRequests = config.get<number>('RATE_LIMIT_MAX', 10);
    this.windowMs = config.get<number>('RATE_LIMIT_WINDOW_MS', 3_600_000);
    this.logger.log(
      `Rate limiter: ${this.maxRequests} requests per ${this.windowMs / 1000}s`,
    );
  }

  /**
   * Check if a key (typically an IP) is within the rate limit.
   * Returns remaining requests and reset time.
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Create or reset expired bucket
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    if (bucket.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
      };
    }

    bucket.count++;

    return {
      allowed: true,
      remaining: this.maxRequests - bucket.count,
      resetAt: bucket.resetAt,
    };
  }

  /**
   * Periodically clean up expired buckets to prevent memory leaks.
   * Called automatically every 5 minutes.
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired rate limit buckets`);
    }
  }
}
