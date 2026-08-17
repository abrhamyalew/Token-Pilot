/**
 * Token Pilot: Gateway Bootstrap
 *
 * Starts the NestJS server with CORS enabled, trust-proxy configured,
 * and graceful shutdown hooks for clean resource teardown.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Trust Proxy
  // When deployed behind a reverse proxy (Nginx, Cloudflare, AWS ALB, Render),
  // Express needs to know which proxies to trust so that req.ip returns
  // the real client address instead of the proxy's address.
  //
  // Set TRUST_PROXY in .env:
  //   'loopback'            : trust localhost proxies only (safe default)
  //   'loopback, linklocal' : trust LAN proxies
  //   '10.0.0.0/8'          : trust a specific CIDR range
  //   '1'                   : trust one hop (the immediate proxy)
  //   Not set / false       : trust nothing, req.ip = socket address
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set('trust proxy', trustProxy);
    logger.log(`Trust proxy: ${trustProxy}`);
  } else {
    logger.log(
      'Trust proxy not configured: X-Forwarded-For will be ignored for rate limiting.',
    );
  }

  // CORS Configuration
  // Supports wildcard, single origin, or comma-separated origins.
  // Automatically strips trailing slashes to prevent browser CORS mismatch.
  const rawCors = process.env.CORS_ORIGIN;
  let corsOrigin: boolean | string | RegExp | (string | RegExp)[] | ((origin: string | undefined, callback: (err: Error | null, origin?: any) => void) => void) = '*';

  if (rawCors && rawCors !== '*') {
    const allowedList = rawCors
      .split(',')
      .map((item) => item.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedList.includes(normalizedOrigin) || allowedList.includes('*')) {
        return callback(null, true);
      }
      callback(null, false);
    };
  }

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,POST,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-API-Key',
  });

  // Graceful Shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Token Pilot gateway running on http://localhost:${port}`);
  logger.log(`POST /v1/chat/completions | OpenAI-compatible endpoint`);
  logger.log(`GET  /health`);
  logger.log(`GET  /v1/models`);
}

bootstrap();

