import { Module } from '@nestjs/common';
import { ClassifierService } from './classifier.service';
import { LlmClassifierService } from './llm-classifier.service';

@Module({
  providers: [ClassifierService, LlmClassifierService],
  exports: [ClassifierService, LlmClassifierService],
})
export class ClassifierModule {}
