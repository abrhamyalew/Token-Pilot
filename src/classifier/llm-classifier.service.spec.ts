import { HttpException } from '@nestjs/common';
import { LlmClassifierService } from './llm-classifier.service';
import { ConfigService } from '@nestjs/config';

describe('LlmClassifierService', () => {
  it('throws error when no GOOGLE_API_KEY is configured and no user key is passed', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(service.classify('Hello world')).rejects.toThrow(
      'GOOGLE_API_KEY not configured',
    );
  });

  it('validates invalid user BYOK key format', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new LlmClassifierService(config);

    await expect(
      service.classify('Hello world', 'invalid-key-format'),
    ).rejects.toThrow(HttpException);
  });
});
