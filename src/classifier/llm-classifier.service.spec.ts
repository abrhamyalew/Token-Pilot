import { HttpException } from '@nestjs/common';
import { LlmClassifierService } from './llm-classifier.service';
import { ConfigService } from '@nestjs/config';

describe('LlmClassifierService', () => {
  it('throws error when no API key is configured and no user key is passed for google', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(service.classify('Hello world', { provider: 'google' })).rejects.toThrow(
      'No API key configured or provided',
    );
  });

  it('validates invalid user BYOK key format for google', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', { provider: 'google', apiKey: 'invalid-key-format' }),
    ).rejects.toThrow(HttpException);
  });

  it('validates invalid user BYOK key format for groq', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', { provider: 'groq', apiKey: 'invalid-groq-key' }),
    ).rejects.toThrow(HttpException);
  });

  it('validates invalid user BYOK key format for openai', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', { provider: 'openai', apiKey: 'invalid-openai-key' }),
    ).rejects.toThrow(HttpException);
  });

  it('validates invalid user BYOK key format for anthropic', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', { provider: 'anthropic', apiKey: 'invalid-anthropic-key' }),
    ).rejects.toThrow(HttpException);
  });

  it('validates invalid user BYOK key format for deepseek', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', { provider: 'deepseek', apiKey: 'invalid-deepseek-key' }),
    ).rejects.toThrow(HttpException);
  });
});
