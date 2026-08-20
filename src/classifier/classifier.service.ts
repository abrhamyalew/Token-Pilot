import { Injectable, Logger } from '@nestjs/common';
import {
  ClassifierResult,
  ClassifierType,
  ChatMessage,
  PromptFeatures,
} from '../shared/types';
import { extractFeatures } from './feature-extractor';
import { scorePrompt } from './scoring-engine';
import { LlmClassifierService, LlmClassifyOptions } from './llm-classifier.service';

export interface ClassifierOptions {
  classifierType?: ClassifierType;
  provider?: string;
  model?: string;
  apiKey?: string;
  userApiKeys?: Record<string, string>;
}

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);
  private readonly MIN_LLM_CONFIDENCE = 0.6;

  constructor(private readonly llmClassifier: LlmClassifierService) {}

  /**
   * Classify the complexity of a chat request.
   * Supports 'rules' (weighted feature vector) and 'llm' (LLM pre-classifier with custom provider, model, and key).
   * If LLM classifier returns confidence below 0.6 or fails, it defaults back to rules.
   */
  async classify(
    messages: ChatMessage[],
    classifierTypeOrOptions?: ClassifierType | ClassifierOptions,
    userApiKeys?: Record<string, string>,
  ): Promise<ClassifierResult> {
    const options: ClassifierOptions =
      typeof classifierTypeOrOptions === 'string'
        ? { classifierType: classifierTypeOrOptions, userApiKeys }
        : classifierTypeOrOptions || { classifierType: 'rules', userApiKeys };

    const classifierType = options.classifierType || 'rules';
    const promptText = this.extractPromptText(messages);
    const hasSystemPrompt = messages.some((m) => m.role === 'system');
    const turnCount = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length;
    const features = extractFeatures(promptText, hasSystemPrompt, turnCount);

    if (classifierType === 'llm') {
      return this.classifyWithLlm(promptText, features, {
        provider: options.provider,
        model: options.model,
        apiKey: options.apiKey,
        userApiKeys: options.userApiKeys || userApiKeys,
      });
    }

    return this.classifyWithRules(features);
  }

  private classifyWithRules(features: PromptFeatures): ClassifierResult {
    const { tier, score, confidence } = scorePrompt(features);

    this.logger.debug(
      `Rules classified prompt (${features.tokenCount} tokens) -> tier=${tier} score=${score.toFixed(3)} confidence=${confidence.toFixed(3)}`,
    );

    return {
      tier,
      score,
      confidence,
      classifier: 'rules',
      features,
    };
  }

  private async classifyWithLlm(
    promptText: string,
    features: PromptFeatures,
    llmOptions?: LlmClassifyOptions,
  ): Promise<ClassifierResult> {
    const startMs = Date.now();
    try {
      const llmResult = await this.llmClassifier.classify(promptText, llmOptions);
      const classifyLatencyMs = Date.now() - startMs;

      // Low confidence fallback to rules logic
      if (llmResult.confidence < this.MIN_LLM_CONFIDENCE) {
        this.logger.warn(
          `LLM confidence ${llmResult.confidence.toFixed(2)} is below ${this.MIN_LLM_CONFIDENCE}. Defaulting to rules classifier.`,
        );

        const rulesResult = scorePrompt(features);
        return {
          tier: rulesResult.tier,
          score: rulesResult.score,
          confidence: rulesResult.confidence,
          classifier: 'rules',
          features,
          reasoning: `LLM confidence (${llmResult.confidence.toFixed(2)}) below threshold ${this.MIN_LLM_CONFIDENCE}; defaulted to rules. LLM reasoning: ${llmResult.reasoning}`,
          llmClassification: llmResult,
          classifyLatencyMs,
          fallbackFrom: 'llm',
          fallbackReason: 'low_confidence',
        };
      }

      this.logger.debug(
        `LLM classified prompt -> tier=${llmResult.tier} (${llmResult.classifierProvider || 'llm'}/${llmResult.classifierModel || 'default'}) confidence=${llmResult.confidence.toFixed(2)} in ${classifyLatencyMs}ms`,
      );

      // Map the LLM tier to a canonical midpoint score so the displayed number
      // sits inside the correct threshold band shown in the UI tooltip.
      // Rules thresholds: low 0-0.08, medium 0.08-0.20, high 0.20-0.42, ultra >0.42
      const TIER_SCORE_MIDPOINTS: Record<string, number> = {
        low: 0.040,
        medium: 0.140,
        high: 0.310,
        high_alt: 0.550,
      };
      const derivedScore = TIER_SCORE_MIDPOINTS[llmResult.tier] ?? 0.140;

      return {
        tier: llmResult.tier,
        score: derivedScore,
        confidence: llmResult.confidence,
        classifier: 'llm',
        features,
        reasoning: llmResult.reasoning,
        llmClassification: llmResult,
        classifyLatencyMs,
      };
    } catch (error) {
      const classifyLatencyMs = Date.now() - startMs;
      const errorMsg = (error as Error)?.message ?? String(error);
      this.logger.warn(`LLM classifier failed (${errorMsg}); defaulting to rules classifier.`);

      const rulesResult = scorePrompt(features);
      return {
        tier: rulesResult.tier,
        score: rulesResult.score,
        confidence: rulesResult.confidence,
        classifier: 'rules',
        features,
        reasoning: `LLM classifier unavailable; defaulted to rules. Error: ${errorMsg}`,
        classifyLatencyMs,
        fallbackFrom: 'llm',
        fallbackReason: errorMsg,
      };
    }
  }

  /**
   * Extract the user-facing prompt text from a messages array.
   * Concatenates all user and system messages.
   */
  private extractPromptText(messages: ChatMessage[]): string {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
  }
}
