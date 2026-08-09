/**
 * Token Pilot — Gateway Bootstrap
 *
 * Starts the NestJS server with CORS enabled and global validation.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS for the frontend (Phase 2)
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: 'GET,POST,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-API-Key',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Token Pilot gateway running on http://localhost:${port}`);
  logger.log(`📡 POST /v1/chat/completions — OpenAI-compatible endpoint`);
  logger.log(`❤️  GET  /health              — Health check`);
  logger.log(`📋 GET  /v1/models            — Available models/tiers`);
}

bootstrap();
