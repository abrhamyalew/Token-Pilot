import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { provider, key } = await req.json();

    if (!provider) {
      return NextResponse.json(
        { success: false, message: 'Provider parameter is required' },
        { status: 400 },
      );
    }

    const startTime = Date.now();

    switch (provider) {
      case 'groq': {
        const apiKey = key || process.env.GROQ_API_KEY;
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
        const apiKey = key || process.env.GOOGLE_API_KEY;
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
        if (!key || !key.trim()) {
          return NextResponse.json({
            success: false,
            message: 'Please enter your OpenAI API key to test connection',
          });
        }
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
        if (!key || !key.trim()) {
          return NextResponse.json({
            success: false,
            message: 'Please enter your Anthropic API key to test connection',
          });
        }
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
        if (!key || !key.trim()) {
          return NextResponse.json({
            success: false,
            message: 'Please enter your DeepSeek API key to test connection',
          });
        }
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
