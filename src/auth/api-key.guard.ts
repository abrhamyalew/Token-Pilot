/**
 * API Key Guard — validates X-API-Key header against a server-configured secret.
 *
 * When API_KEY is set in the environment, every request to a guarded endpoint
 * must include a matching X-API-Key header. Returns 401 Unauthorized on mismatch.
 *
 * If API_KEY is not set, the guard passes all requests (dev-mode convenience).
 * A warning is logged on startup so this never happens silently in production.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.apiKey = this.config.get<string>('API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'API_KEY is not set - all requests will be allowed without authentication. '+
          'Set API_KEY in .env before deploying to production.',
      );
    } else {
      this.logger.log('API key authentication is enabled.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // If no API key is configured, skip authentication (dev mode)
    if (!this.apiKey) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const providedKey = req.headers['x-api-key'] as string | undefined;

    if (!providedKey) {
      throw new HttpException(
        {
          error: {
            message: 'Missing API key. Include an X-API-Key header.',
            type: 'authentication_error',
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.timingSafeEqual(providedKey, this.apiKey)) {
      throw new HttpException(
        {
          error: {
            message: 'Invalid API key.',
            type: 'authentication_error',
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing side-channel attacks.
   * Falls back to a byte-by-byte OR comparison if lengths differ.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      // Still do a comparison to avoid short-circuit timing leak
      const dummy = Buffer.alloc(bufA.length);
      try {
        require('crypto').timingSafeEqual(bufA, dummy);
      } catch {
        // ignore
      }
      return false;
    }

    try {
      return require('crypto').timingSafeEqual(bufA, bufB);
    } catch {
      // Fallback: OR all byte differences
      let diff = 0;
      for (let i = 0; i < bufA.length; i++) {
        diff |= bufA[i] ^ bufB[i];
      }
      return diff === 0;
    }
  }
}
