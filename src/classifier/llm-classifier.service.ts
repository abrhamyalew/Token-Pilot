import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { LlmClassificationOutput, Tier } from '../shared/types';
import { validateByokKey } from '../providers/byok-validator';

@Injectable()
export class LlmClassifierService {
  private readonly logger = new Logger(LlmClassifierService.name);
  private readonly CLASSIFIER_MODEL = 'gemini-3.6-flash';
  private readonly TIMEOUT_MS = 10000;
  private defaultGenAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getGenAI(userApiKey?: string): GoogleGenerativeAI {
    if (userApiKey) {
      validateByokKey('google', userApiKey);
      return new GoogleGenerativeAI(userApiKey);
    }

    if (!this.defaultGenAI) {
      const apiKey = this.config.get<string>('GOOGLE_API_KEY');
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY not configured and no user key provided for classifier');
      }
      this.defaultGenAI = new GoogleGenerativeAI(apiKey);
    }

    return this.defaultGenAI;
  }

  /**
   * Classify prompt complexity using Gemini Flash with structured JSON output.
   */
  async classify(
    promptText: string,
    userApiKey?: string,
  ): Promise<LlmClassificationOutput> {
    const genAI = this.getGenAI(userApiKey);

    const model = genAI.getGenerativeModel({
      model: this.CLASSIFIER_MODEL,
      systemInstruction:
        'You are a prompt complexity classifier for an LLM routing system. ' +
        'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
        'Tier definitions:\n' +
        '- low: Simple factual questions, summaries, translations, formatting, casual chat. Handled well by small models.\n' +
        '- medium: Explanations, comparisons, moderate code, structured analysis, multi-part questions.\n' +
        '- high: Complex multi-step reasoning, architectural design, advanced code refactoring, mathematical proofs, deep domain expertise.\n' +
        'Provide a confidence score between 0.0 and 1.0 and a concise single-sentence reasoning.',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            tier: {
              type: SchemaType.STRING,
              description: 'The assigned tier: low, medium, or high',
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
            reasoning: {
              type: SchemaType.STRING,
              description: 'Brief explanation of classification',
            },
          },
          required: ['tier', 'confidence', 'reasoning'],
        },
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    });

    const classificationPrompt =
      `Analyze and classify the complexity of the following prompt:\n\n` +
      `"""\n${promptText}\n"""`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
      });

      clearTimeout(timeoutId);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

      const usage = result.response.usageMetadata;
      const promptTokens = usage?.promptTokenCount ?? 0;
      const completionTokens = usage?.candidatesTokenCount ?? 0;

      return {
        tier: normalizedTier,
        confidence,
        reasoning,
        classifierModel: this.CLASSIFIER_MODEL,
        classificationTokens: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.warn(`LLM classification failed: ${(error as Error)?.message ?? error}`);
      throw error;
    }
  }

  private normalizeTier(rawTier: unknown): Tier {
    if (typeof rawTier === 'string') {
      const lower = rawTier.toLowerCase().trim();
      if (lower === 'low') return 'low';
      if (lower === 'medium' || lower === 'mid') return 'medium';
      if (lower === 'high') return 'high';
      if (lower === 'high_alt') return 'high_alt';
    }
    return 'medium';
  }
}
