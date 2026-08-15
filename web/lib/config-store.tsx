'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type Tier = 'low' | 'medium' | 'high' | 'high_alt';
export type ProviderId = 'groq' | 'google' | 'openai' | 'anthropic' | 'deepseek';
export type RoutingMode = 'preset' | 'byok';

export interface TierModelSelection {
  provider: ProviderId;
  model: string;
}

export interface ProviderCatalogItem {
  id: ProviderId;
  name: string;
  badge: string;
  isByokRequired: boolean;
  keyPrefix: string;
  placeholder: string;
  docUrl: string;
  models: { id: string; name: string; costDesc: string }[];
}

export const PROVIDER_CATALOG: Record<ProviderId, ProviderCatalogItem> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    badge: 'Free Tier Available',
    isByokRequired: false,
    keyPrefix: 'gsk_',
    placeholder: 'gsk_...',
    docUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B', costDesc: 'Free tier / High efficiency & reasoning' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', costDesc: 'Free tier / Fast LPU' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', costDesc: 'Free tier / Ultra-low latency' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', costDesc: 'Free tier / MoE architecture' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', costDesc: 'Free tier / Google open weights' },
    ],
  },
  google: {
    id: 'google',
    name: 'Google AI Studio',
    badge: 'Free Tier Available',
    isByokRequired: false,
    keyPrefix: 'AIza',
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', costDesc: 'Free tier / High speed multimodal' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', costDesc: 'Free tier / Balanced reasoning' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', costDesc: 'Free tier / Next-gen agentic' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', costDesc: '1M+ context window' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    badge: 'BYOK Required',
    isByokRequired: true,
    keyPrefix: 'sk-',
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', costDesc: 'Frontier reasoning benchmark' },
      { id: 'gpt-4o', name: 'GPT-4o Omnimodel', costDesc: 'Flagship general intelligence' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costDesc: 'Cost-efficient frontier model' },
      { id: 'o3-mini', name: 'o3-mini', costDesc: 'Deep reasoning / coding' },
      { id: 'o1', name: 'o1 Reasoning', costDesc: 'Full chain-of-thought reasoning' },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    badge: 'BYOK Required',
    isByokRequired: true,
    keyPrefix: 'sk-ant-',
    placeholder: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', costDesc: 'Deep architectural synthesis' },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', costDesc: 'Hybrid fast / deep thinking' },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', costDesc: 'Industry leading coding score' },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', costDesc: 'Sub-second lightweight execution' },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'BYOK Required',
    isByokRequired: true,
    keyPrefix: 'sk-',
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', costDesc: 'Ultra-low cost high intelligence' },
      { id: 'deepseek-chat', name: 'DeepSeek V3 Chat', costDesc: '671B MoE model' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 Reasoner', costDesc: 'Open reasoning & math' },
    ],
  },
};

export const DEFAULT_TIER_MODELS: Record<Tier, TierModelSelection> = {
  low: { provider: 'groq', model: 'qwen/qwen3.6-27b' },
  medium: { provider: 'google', model: 'gemini-3.6-flash' },
  high: { provider: 'openai', model: 'gpt-5.5-pro' },
  high_alt: { provider: 'anthropic', model: 'claude-opus-4-8' },
};

const SESSION_STORAGE_KEY = 'token_pilot_session_byok_keys';
const LOCAL_STORAGE_TIER_MODELS = 'token_pilot_tier_models';
const LOCAL_STORAGE_ROUTING_MODE = 'token_pilot_routing_mode';

interface ConfigContextValue {
  routingMode: RoutingMode;
  setRoutingMode: (mode: RoutingMode) => void;
  tierModels: Record<Tier, TierModelSelection>;
  setTierModel: (tier: Tier, selection: TierModelSelection) => void;
  resetTierModels: () => void;
  apiKeys: Record<ProviderId, string>;
  setApiKey: (provider: ProviderId, key: string) => void;
  rememberInSession: boolean;
  setRememberInSession: (remember: boolean) => void;
  clearAllKeys: () => void;
  activeKeyCount: number;
  getActiveUserApiKeys: () => Record<string, string>;
  getTierModelOverrides: () => Partial<Record<Tier, { model: string; provider: string }>>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // 0. Routing Mode: 'preset' (default free tier demo) vs 'byok' (custom user keys & model overrides)
  const [routingMode, setRoutingModeState] = useState<RoutingMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_ROUTING_MODE);
        if (saved === 'preset' || saved === 'byok') return saved;
      } catch {
        // Ignore
      }
    }
    return 'preset';
  });

  const setRoutingMode = useCallback((mode: RoutingMode) => {
    setRoutingModeState(mode);
    try {
      localStorage.setItem(LOCAL_STORAGE_ROUTING_MODE, mode);
    } catch {
      // Ignore
    }
  }, []);

  // 1. Tier models (can be persisted to localStorage as it only contains model name choices, not secrets)
  const [tierModels, setTierModelsState] = useState<Record<Tier, TierModelSelection>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_TIER_MODELS);
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    return DEFAULT_TIER_MODELS;
  });

  // 2. BYOK API Keys (Strict Security Protocol: In-memory only by default. Session storage only with explicit opt-in)
  const [rememberInSession, setRememberInSessionState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(SESSION_STORAGE_KEY) !== null;
      } catch {
        // Ignore
      }
    }
    return false;
  });

  const [apiKeys, setApiKeysState] = useState<Record<ProviderId, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    return {
      groq: '',
      google: '',
      openai: '',
      anthropic: '',
      deepseek: '',
    };
  });

  const setTierModel = useCallback((tier: Tier, selection: TierModelSelection) => {
    setTierModelsState((prev) => {
      const updated = { ...prev, [tier]: selection };
      try {
        localStorage.setItem(LOCAL_STORAGE_TIER_MODELS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const resetTierModels = useCallback(() => {
    setTierModelsState(DEFAULT_TIER_MODELS);
    try {
      localStorage.removeItem(LOCAL_STORAGE_TIER_MODELS);
    } catch {
      // Ignore
    }
  }, []);

  const setApiKey = useCallback((provider: ProviderId, key: string) => {
    setApiKeysState((prev) => {
      const updated = { ...prev, [provider]: key };
      if (rememberInSession) {
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
      return updated;
    });
  }, [rememberInSession]);

  const setRememberInSession = useCallback((remember: boolean) => {
    setRememberInSessionState(remember);
    if (remember) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(apiKeys));
      } catch {
        // Ignore
      }
    } else {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, [apiKeys]);

  const clearAllKeys = useCallback(() => {
    const emptyKeys: Record<ProviderId, string> = {
      groq: '',
      google: '',
      openai: '',
      anthropic: '',
      deepseek: '',
    };
    setApiKeysState(emptyKeys);
    setRememberInSessionState(false);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // In 'preset' mode, we use server keys only. In 'byok' mode, we send the user's active keys.
  const getActiveUserApiKeys = useCallback(() => {
    if (routingMode === 'preset') {
      return {};
    }
    const active: Record<string, string> = {};
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.trim().length > 0) {
        active[provider] = key.trim();
      }
    }
    return active;
  }, [apiKeys, routingMode]);

  // In 'preset' mode, default routing rules apply. In 'byok' mode, user overrides apply.
  const getTierModelOverrides = useCallback(() => {
    if (routingMode === 'preset') {
      return {};
    }
    const overrides: Partial<Record<Tier, { model: string; provider: string }>> = {};
    for (const [t, sel] of Object.entries(tierModels) as [Tier, TierModelSelection][]) {
      const defaultSel = DEFAULT_TIER_MODELS[t];
      if (sel.provider !== defaultSel.provider || sel.model !== defaultSel.model) {
        overrides[t] = { model: sel.model, provider: sel.provider };
      }
    }
    return overrides;
  }, [tierModels, routingMode]);

  const activeKeyCount = useMemo(() => {
    return Object.values(apiKeys).filter((k) => k && k.trim().length > 0).length;
  }, [apiKeys]);

  const value = useMemo(
    () => ({
      routingMode,
      setRoutingMode,
      tierModels,
      setTierModel,
      resetTierModels,
      apiKeys,
      setApiKey,
      rememberInSession,
      setRememberInSession,
      clearAllKeys,
      activeKeyCount,
      getActiveUserApiKeys,
      getTierModelOverrides,
    }),
    [
      routingMode,
      setRoutingMode,
      tierModels,
      setTierModel,
      resetTierModels,
      apiKeys,
      setApiKey,
      rememberInSession,
      setRememberInSession,
      clearAllKeys,
      activeKeyCount,
      getActiveUserApiKeys,
      getTierModelOverrides,
    ],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfigStore(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfigStore must be used within a ConfigProvider');
  }
  return context;
}
