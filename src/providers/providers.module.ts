import { Module } from '@nestjs/common';
import { MockAdapter } from './mock.adapter';
import { GroqAdapter } from './groq.adapter';
import { GoogleAdapter } from './google.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { ProviderRegistryService } from './provider-registry.service';

@Module({
  providers: [
    MockAdapter,
    GroqAdapter,
    GoogleAdapter,
    OpenAIAdapter,
    ProviderRegistryService,
  ],
  exports: [ProviderRegistryService],
})
export class ProvidersModule {}
