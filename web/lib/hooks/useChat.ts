'use client';

import { useState, useCallback, useRef } from 'react';
import { getGatewayUrl } from '@/lib/api';
import { useConfigStore } from '@/lib/config-store';

export interface RoutingMetadata {
  tier: string;
  model: string;
  provider: string;
  score: number;
  confidence: number;
  features: Record<string, number | boolean>;
  actualCost: number;
  frontierCost: number;
  savings: number;
  savingsPercent: number;
  latencyMs: number;
  classifier: string;
}

export interface ChatState {
  status: 'idle' | 'classifying' | 'streaming' | 'done' | 'error';
  content: string;
  metadata: RoutingMetadata | null;
  error: string | null;
  requestsRemaining: number | null;
}

const INITIAL_STATE: ChatState = {
  status: 'idle',
  content: '',
  metadata: null,
  error: null,
  requestsRemaining: null,
};

export function useChat() {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const { getActiveUserApiKeys, getTierModelOverrides } = useConfigStore();

  const send = useCallback(async (prompt: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, status: 'classifying' });

    const gatewayUrl = getGatewayUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    const userApiKeys = getActiveUserApiKeys();
    const tierOverrides = getTierModelOverrides();

    const requestBody: Record<string, unknown> = {
      model: 'auto',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    };

    // Attach user keys if configured (empty keys already stripped)
    if (Object.keys(userApiKeys).length > 0) {
      requestBody.user_api_keys = userApiKeys;
    }

    // Attach custom tier model mappings if configured
    if (Object.keys(tierOverrides).length > 0) {
      requestBody.tier_model_overrides = tierOverrides;
    }

    try {
      const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        const msg = body.error?.message ?? `HTTP ${res.status}`;
        setState((s) => ({ ...s, status: 'error', error: msg }));
        return;
      }

      // Parse rate-limit headers
      const remaining = res.headers.get('X-RateLimit-Remaining');

      setState((s) => ({
        ...s,
        status: 'streaming',
        requestsRemaining: remaining ? parseInt(remaining, 10) : null,
      }));

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let metadata: RoutingMetadata | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data);

            // Extract routing metadata from the first chunk
            if (chunk.routing && !metadata) {
              metadata = chunk.routing as RoutingMetadata;
              setState((s) => ({ ...s, metadata }));
            }

            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              setState((s) => ({ ...s, content: s.content + delta }));
            }
          } catch {
            // Ignore parse errors for individual chunks
          }
        }
      }

      setState((s) => ({ ...s, status: 'done' }));
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setState((s) => ({
        ...s,
        status: 'error',
        error: (err as Error).message ?? 'Unknown error',
      }));
    }
  }, [getActiveUserApiKeys, getTierModelOverrides]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, send, reset };
}
