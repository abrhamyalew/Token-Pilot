import { Injectable, Logger } from '@nestjs/common';
import { ClassifierResult, ChatMessage } from '../shared/types';
import { extractFeatures } from './feature-extractor';
import { scorePrompt } from './scoring-engine';

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  /**
   * Classify the complexity of a chat request and return a tier assignment.
   * Extracts the user's prompt text from the messages array, runs feature
   * extraction, and scores via the weighted vector classifier.
   */
  classify(messages: ChatMessage[]): ClassifierResult {
    const promptText = this.extractPromptText(messages);
    const features = extractFeatures(promptText);
    const { tier, score, confidence } = scorePrompt(features);

    this.logger.debug(
      `Classified prompt (${features.tokenCount} tokens) → tier=${tier} score=${score.toFixed(3)} confidence=${confidence.toFixed(3)}`,
    );

    return {
      tier,
      score,
      confidence,
      classifier: 'rules',
      features,
    };
  }

  /**
   * Extract the user-facing prompt text from a messages array.
   * Concatenates all user messages (system instructions can influence
   * complexity, so they're included too).
   */
  private extractPromptText(messages: ChatMessage[]): string {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
  }
}
