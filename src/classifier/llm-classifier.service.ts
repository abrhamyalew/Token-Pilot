import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LlmClassificationOutput, Tier } from '../shared/types';
import { validateByokKey, ByokProvider } from '../providers/byok-validator';

export interface LlmClassifyOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  userApiKeys?: Record<string, string>;
}

const DEFAULT_MODELS: Record<ByokProvider, string> = {
  google: 'gemini-3.6-flash',
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku',
  deepseek: 'deepseek-chat',
};

@Injectable()
export class LlmClassifierService {
  private readonly logger = new Logger(LlmClassifierService.name);
  private readonly TIMEOUT_MS = 10000;

  constructor(private readonly config: ConfigService) {}

  /**
   * Classify prompt complexity using the specified LLM provider and model.
   * Supports Google, Groq, OpenAI, Anthropic, and DeepSeek with user-supplied
   * or server fallback API keys.
   */
  async classify(
    promptText: string,
    options?: LlmClassifyOptions,
  ): Promise<LlmClassificationOutput> {
    const provider = (options?.provider || 'google').toLowerCase() as ByokProvider;
    const key =
      options?.apiKey ||
      options?.userApiKeys?.[provider] ||
      this.getServerApiKey(provider);

    if (!key) {
      throw new Error(`No API key configured or provided for classifier provider "${provider}".`);
    }

    if (options?.apiKey || options?.userApiKeys?.[provider]) {
      validateByokKey(provider, key);
    }

    const modelName = options?.model || DEFAULT_MODELS[provider] || 'gemini-3.6-flash';

    switch (provider) {
      case 'google':
        return this.classifyWithGoogle(promptText, key, modelName);
      case 'groq':
        return this.classifyWithGroq(promptText, key, modelName);
      case 'openai':
        return this.classifyWithOpenAI(promptText, key, modelName);
      case 'anthropic':
        return this.classifyWithAnthropic(promptText, key, modelName);
      case 'deepseek':
        return this.classifyWithDeepSeek(promptText, key, modelName);
      default:
        throw new Error(`Unsupported classifier provider: "${provider}"`);
    }
  }

  private getServerApiKey(provider: ByokProvider): string | undefined {
    switch (provider) {
      case 'google':
        return this.config.get<string>('GOOGLE_API_KEY');
      case 'groq':
        return this.config.get<string>('GROQ_API_KEY');
      case 'openai':
        return this.config.get<string>('OPENAI_API_KEY');
      default:
        return undefined;
    }
  }

  private async classifyWithGoogle(
    promptText: string,
    apiKey: string,
    modelName: string,
  ): Promise<LlmClassificationOutput> {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
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
        classifierProvider: 'google',
        classifierModel: modelName,
        classificationTokens: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.warn(`Google classification failed: ${(error as Error)?.message ?? error}`);
      throw error;
    }
  }

  private async classifyWithGroq(
    promptText: string,
    apiKey: string,
    modelName: string,
  ): Promise<LlmClassificationOutput> {
    const client = new Groq({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt complexity classifier for an LLM routing system. ' +
              'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
              'Respond with a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence).',
          },
          {
            role: 'user',
            content: `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 256,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

      const usage = completion.usage;

      return {
        tier: normalizedTier,
        confidence,
        reasoning,
        classifierProvider: 'groq',
        classifierModel: modelName,
        classificationTokens: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      this.logger.warn(`Groq classification failed: ${(error as Error)?.message ?? error}`);
      throw error;
    }
  }

  private async classifyWithOpenAI(
    promptText: string,
    apiKey: string,
    modelName: string,
  ): Promise<LlmClassificationOutput> {
    const client = new OpenAI({ apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt complexity classifier for an LLM routing system. ' +
              'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
              'Respond with a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence).',
          },
          {
            role: 'user',
            content: `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 256,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

      const usage = completion.usage;

      return {
        tier: normalizedTier,
        confidence,
        reasoning,
        classifierProvider: 'openai',
        classifierModel: modelName,
        classificationTokens: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      this.logger.warn(`OpenAI classification failed: ${(error as Error)?.message ?? error}`);
      throw error;
    }
  }

  private async classifyWithAnthropic(
    promptText: string,
    apiKey: string,
    modelName: string,
  ): Promise<LlmClassificationOutput> {
    const client = new Anthropic({ apiKey });

    try {
      const response = await client.messages.create({
        model: modelName,
        max_tokens: 256,
        temperature: 0.1,
        system:
          'You are a prompt complexity classifier for an LLM routing system. ' +
          'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
          'Output ONLY a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence). Do not include markdown codeblocks or extra text.',
        messages: [
          {
            role: 'user',
            content: `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`,
          },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Clean markdown code blocks if returned
      const cleanJson = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/, '$1').trim();
      const parsed = JSON.parse(cleanJson);

      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

      return {
        tier: normalizedTier,
        confidence,
        reasoning,
        classifierProvider: 'anthropic',
        classifierModel: modelName,
        classificationTokens: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.warn(`Anthropic classification failed: ${(error as Error)?.message ?? error}`);
      throw error;
    }
  }

  private async classifyWithDeepSeek(
    promptText: string,
    apiKey: string,
    modelName: string,
  ): Promise<LlmClassificationOutput> {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt complexity classifier for an LLM routing system. ' +
              'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
              'Respond with a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence).',
          },
          {
            role: 'user',
            content: `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 256,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

      const usage = completion.usage;

      return {
        tier: normalizedTier,
        confidence,
        reasoning,
        classifierProvider: 'deepseek',
        classifierModel: modelName,
        classificationTokens: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      this.logger.warn(`DeepSeek classification failed: ${(error as Error)?.message ?? error}`);
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
