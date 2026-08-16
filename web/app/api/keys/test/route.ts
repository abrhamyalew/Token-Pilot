import { NextRequest, NextResponse } from 'next/server';

/**
 * Key format rules -- mirrors the gateway's byok-validator.ts KEY_RULES.
 * Validates format before making any live API call to prevent abuse.
 */
const KEY_RULES: Record<string, { prefix: string; minLength: number; label: string }> = {
  openai:    { prefix: 'sk-',     minLength: 20, label: 'OpenAI' },
  anthropic: { prefix: 'sk-ant-', minLength: 20, label: 'Anthropic' },
  groq:      { prefix: 'gsk_',    minLength: 20, label: 'Groq' },
  google:    { prefix: 'AIza',    minLength: 20, label: 'Google AI Studio' },
  deepseek:  { prefix: 'sk-',     minLength: 20, label: 'DeepSeek' },
};

const CHAR_PATTERN = /^[a-zA-Z0-9\-_]+$/;

/**
 * Simple in-memory sliding window rate limiter.
 * Limits each IP to MAX_REQUESTS within WINDOW_MS.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];

  // Drop entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function validateKeyFormat(
  provider: string,
  key: string | undefined,
): string | null {
  const rules = KEY_RULES[provider];

  // Groq and Google fall back to server-side env vars -- key is optional for them
  if (!rules) return `Unknown provider: ${provider}`;
  if (provider === 'groq' || provider === 'google') {
    if (!key || !key.trim()) return null; // Will use server-side key
  } else {
    if (!key || !key.trim()) return `${rules.label} API key is required`;
  }

  const trimmed = key!.trim();

  if (trimmed.length < rules.minLength || trimmed.length > 256) {
    return `${rules.label} key must be between ${rules.minLength} and 256 characters`;
  }

  if (!trimmed.startsWith(rules.prefix)) {
    return `${rules.label} key must start with "${rules.prefix}"`;
  }

  if (!CHAR_PATTERN.test(trimmed)) {
    return `${rules.label} key contains invalid characters`;
  }

  return null;
}

export async function POST(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many key test requests. Please wait a minute.' },
      { status: 429 },
    );
  }

  try {
    const { provider, key } = await req.json();

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Provider parameter is required' },
        { status: 400 },
      );
    }

    // Format-validate the key before making any network call
    const formatError = validateKeyFormat(provider, key);
    if (formatError) {
      return NextResponse.json({ success: false, message: formatError }, { status: 400 });
    }

    const startTime = Date.now();

    switch (provider) {
      case 'groq': {
        const apiKey = key?.trim() || process.env.GROQ_API_KEY;
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            message: 'No Groq key configured on server or client',
          });
        }
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: 'Connected to Groq API (Ready)',
          });
        }
        return NextResponse.json({
          success: false,
          latencyMs,
          message: res.status === 401 ? 'Invalid Groq API Key' : `Groq returned HTTP ${res.status}`,
        });
      }

      case 'google': {
        const apiKey = key?.trim() || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            message: 'No Google API key configured on server or client',
          });
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: 'Connected to Google AI Studio (Ready)',
          });
        }
        return NextResponse.json({
          success: false,
          latencyMs,
          message: res.status === 400 || res.status === 403 ? 'Invalid Google API Key' : `Google returned HTTP ${res.status}`,
        });
      }

      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key.trim()}` },
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: 'Connected to OpenAI API (Ready)',
          });
        }
        return NextResponse.json({
          success: false,
          latencyMs,
          message: res.status === 401 ? 'Invalid OpenAI API Key' : `OpenAI returned HTTP ${res.status}`,
        });
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': key.trim(),
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: 'Connected to Anthropic API (Ready)',
          });
        }
        return NextResponse.json({
          success: false,
          latencyMs,
          message: res.status === 401 ? 'Invalid Anthropic API Key' : `Anthropic returned HTTP ${res.status}`,
        });
      }

      case 'deepseek': {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${key.trim()}` },
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: 'Connected to DeepSeek API (Ready)',
          });
        }
        return NextResponse.json({
          success: false,
          latencyMs,
          message: res.status === 401 ? 'Invalid DeepSeek API Key' : `DeepSeek returned HTTP ${res.status}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown provider: ${provider}` },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const err = error as Error | undefined;
    return NextResponse.json({
      success: false,
      message: err?.name === 'TimeoutError' ? 'Connection timed out (5s)' : 'Network error testing provider',
    });
  }
}
