/**
 * Rate Limiter Guard — NestJS guard that blocks requests exceeding the limit.
 *
 * Extracts the client IP from the request and checks against the rate limiter.
 * Returns 429 with rate limit headers when exceeded.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimiterService } from './rate-limiter.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(private readonly rateLimiter: RateLimiterService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Use Express's req.ip which respects the app's trust-proxy setting.
    // When trust proxy is configured correctly (in main.ts), req.ip returns
    // the real client IP from X-Forwarded-For. When not configured, it
    // returns the direct socket address — preventing spoofing via headers.
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

    const { allowed, remaining, resetAt } = this.rateLimiter.check(ip);

    // Always set rate limit headers
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${ip}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
