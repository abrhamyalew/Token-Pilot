import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

/**
 * Extract balanced JSON object substrings from a raw string using brace-depth counting.
 * Handles curly braces inside quoted strings correctly (e.g. {"reasoning": "needs {complex} work"}).
 */
function extractJsonObjects(text: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results;
}

function parseJsonResponse(raw: string): { tier?: unknown; confidence?: unknown; reasoning?: unknown } {
  // Strip <think>...</think> blocks produced by reasoning models (Qwen, DeepSeek-R1, etc.)
  // These appear BEFORE the actual JSON and can confuse the JSON extractor.
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const trimmed = withoutThink || raw.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue
  }

  // 2. Strip code fences
  const stripped = trimmed.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Continue
  }

  // 3. Extract JSON objects using brace-depth counting (handles braces inside string values)
  const jsonCandidates = extractJsonObjects(trimmed);
  for (const candidate of jsonCandidates.reverse()) {
    try {
      const parsed = JSON.parse(candidate);
      // Require at least a tier field to be a valid classification response
      if (parsed && (parsed.tier || parsed.Tier)) return parsed;
    } catch {
      // Continue
    }
  }

  // 4. Regex key-value extraction fallback if model returned preamble or partial JSON
  const tierMatch = trimmed.match(/["']?tier["']?\s*:\s*["']?(low|medium|mid|high|high_alt)["']?/i);
  const confMatch = trimmed.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);
  const reasonMatch = trimmed.match(/["']?reasoning["']?\s*:\s*["']([^"'\n\r]+)["']?/i);

  if (tierMatch) {
    return {
      tier: tierMatch[1],
      confidence: confMatch ? parseFloat(confMatch[1]) : 0.8,
      reasoning: reasonMatch ? reasonMatch[1] : 'Classified via pattern extraction.',
    };
  }

  throw new Error(`Failed to parse JSON classification output: "${trimmed.slice(0, 120)}"`);
}

/** Normalize confidence from LLM output.
 * Treats 0 as "not provided" - thinking models like Qwen/DeepSeek sometimes
 * emit 0.0 instead of a real score when they don't understand the field.
 */
function normalizeConfidence(raw: unknown): number {
  if (typeof raw === 'number' && raw > 0) {
    return Math.max(0.01, Math.min(1, raw));
  }
  return 0.85; // Sensible default when model omits or zeroes the confidence field
}

@Injectable()
export class LlmClassifierService {
  private readonly logger = new Logger(LlmClassifierService.name);
  private readonly TIMEOUT_MS = 10_000;

  constructor(private readonly config: ConfigService) {}

  /**
   * Race an async operation against a timeout.
   * Uses Promise.race instead of AbortController because SDK support for
   * abort signals varies across providers.
   */
  private withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} classification timed out after ${this.TIMEOUT_MS}ms`)),
          this.TIMEOUT_MS,
        ),
      ),
    ]);
  }

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
      case 'anthropic':
        return this.config.get<string>('ANTHROPIC_API_KEY');
      case 'deepseek':
        return this.config.get<string>('DEEPSEEK_API_KEY');
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
        'Output ONLY a valid JSON object without any commentary, preamble, or markdown formatting.\n' +
        'JSON Schema: {"tier": "low" | "medium" | "high", "confidence": 0.0 to 1.0, "reasoning": "brief single sentence"}',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });

    const classificationPrompt =
      `Analyze and classify the complexity of the following prompt:\n\n` +
      `"""\n${promptText}\n"""`;

    try {
      const result = await this.withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
        }),
        'Google',
      );

      const responseText = result.response.text();
      const parsed = parseJsonResponse(responseText);

      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = normalizeConfidence(parsed.confidence);
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

    const systemPrompt =
      'You are a prompt complexity classifier for an LLM routing system. ' +
      'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
      'Respond ONLY with a valid JSON object in this exact schema: {"tier": "low" | "medium" | "high", "confidence": 0.0 to 1.0, "reasoning": "brief single sentence"}';

    const userPrompt = `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`;

    try {
      let raw = '';
      let usage: any;

      try {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 512,
          }),
          'Groq',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      } catch (jsonErr) {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 512,
          }),
          'Groq',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      }

      const parsed = parseJsonResponse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = normalizeConfidence(parsed.confidence);
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

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

    const systemPrompt =
      'You are a prompt complexity classifier for an LLM routing system. ' +
      'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
      'Respond ONLY with a valid JSON object in this exact schema: {"tier": "low" | "medium" | "high", "confidence": 0.0 to 1.0, "reasoning": "brief single sentence"}';

    const userPrompt = `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`;

    try {
      let raw = '';
      let usage: any;

      try {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 512,
          }),
          'OpenAI',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      } catch (jsonErr) {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 512,
          }),
          'OpenAI',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      }

      const parsed = parseJsonResponse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = normalizeConfidence(parsed.confidence);
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

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
      const response = await this.withTimeout(
        client.messages.create({
          model: modelName,
          max_tokens: 512,
          temperature: 0.1,
          system:
            'You are a prompt complexity classifier for an LLM routing system. ' +
            'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
            'Output ONLY a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence). Do not include markdown fences.',
          messages: [
            {
              role: 'user',
              content: `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`,
            },
          ],
        }),
        'Anthropic',
      );

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const parsed = parseJsonResponse(text);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = normalizeConfidence(parsed.confidence);
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

    const systemPrompt =
      'You are a prompt complexity classifier for an LLM routing system. ' +
      'Analyze user prompts and classify their complexity into low, medium, or high tier. ' +
      'Respond ONLY with a valid JSON object with keys: "tier" ("low" | "medium" | "high"), "confidence" (number 0.0 to 1.0), and "reasoning" (string single sentence).';

    const userPrompt = `Analyze and classify the complexity of the following prompt:\n\n"""\n${promptText}\n"""`;

    try {
      let raw = '';
      let usage: any;

      try {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 512,
          }),
          'DeepSeek',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      } catch (jsonErr) {
        const completion = await this.withTimeout(
          client.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 512,
          }),
          'DeepSeek',
        );
        raw = completion.choices[0]?.message?.content || '{}';
        usage = completion.usage;
      }

      const parsed = parseJsonResponse(raw);
      const normalizedTier = this.normalizeTier(parsed.tier);
      const confidence = normalizeConfidence(parsed.confidence);
      const reasoning = typeof parsed.reasoning === 'string'
        ? parsed.reasoning
        : 'Classification completed.';

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
