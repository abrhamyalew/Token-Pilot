'use client';

import React, { useState } from 'react';
import { useConfigStore, ClassifierMode, ProviderId } from '@/lib/config-store';
import styles from './ClassifierToggle.module.css';

const CLASSIFIER_PRESETS: Record<ProviderId, { id: string; name: string }[]> = {
  google: [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Recommended / Fast)' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (Ultra-fast)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Fast LPU)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-low latency)' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Cost Efficient)' },
    { id: 'gpt-4o', name: 'GPT-4o Omnimodel' },
    { id: 'o3-mini', name: 'o3-mini (Reasoning)' },
    { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku (Lightweight / Fast)' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3 Chat (671B MoE)' },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 Reasoner' },
  ],
};

const PROVIDER_NAMES: Record<ProviderId, string> = {
  google: 'Google AI Studio',
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
};

export function ClassifierToggle() {
  const {
    classifierMode,
    setClassifierMode,
    llmClassifierProvider,
    setLlmClassifierProvider,
    llmClassifierModel,
    setLlmClassifierModel,
    llmClassifierApiKey,
    setLlmClassifierApiKey,
    apiKeys,
  } = useConfigStore();

  const [isCustomModel, setIsCustomModel] = useState<boolean>(() => {
    const presets = CLASSIFIER_PRESETS[llmClassifierProvider] || [];
    return !presets.some((p) => p.id === llmClassifierModel);
  });

  const handleSelectMode = (mode: ClassifierMode) => {
    setClassifierMode(mode);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ProviderId;
    setLlmClassifierProvider(newProvider);
    setIsCustomModel(false);
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomModel(true);
    } else {
      setIsCustomModel(false);
      setLlmClassifierModel(val);
    }
  };

  const handleCustomModelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLlmClassifierModel(e.target.value);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLlmClassifierApiKey(e.target.value);
  };

  const availablePresets = CLASSIFIER_PRESETS[llmClassifierProvider] || CLASSIFIER_PRESETS.google;
  const hasSavedByKey = !!apiKeys[llmClassifierProvider];
  const isKeyActive = !!(llmClassifierApiKey || hasSavedByKey);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Complexity Classifier</span>
          <span className={styles.subtitle}>
            Choose between deterministic heuristic vector scoring and LLM AI pre-classification.
          </span>
        </div>
        <span className={styles.activeBadge}>
          Active: {classifierMode === 'llm' ? `${PROVIDER_NAMES[llmClassifierProvider] || 'LLM'}` : 'Heuristic Rules'}
        </span>
      </div>

      <div className={styles.optionsGrid}>
        <button
          type="button"
          className={`${styles.optionCard} ${classifierMode === 'rules' ? styles.optionSelected : ''}`}
          onClick={() => handleSelectMode('rules')}
        >
          <div className={styles.optionHeader}>
            <span className={styles.optionName}>Heuristic Vector (Rules)</span>
            <span className={styles.optionTag}>Deterministic</span>
          </div>
          <p className={styles.optionDesc}>
            12-signal scoring vector (tokens, keywords, code blocks, density, structure).
            Calculates complexity score instantly with zero external API calls.
          </p>
          <div className={styles.optionStats}>
            <span className={styles.statItem}>Latency: &lt;5ms</span>
            <span className={styles.statItem}>Cost: $0.00</span>
          </div>
        </button>

        <button
          type="button"
          className={`${styles.optionCard} ${classifierMode === 'llm' ? styles.optionSelected : ''}`}
          onClick={() => handleSelectMode('llm')}
        >
          <div className={styles.optionHeader}>
            <span className={styles.optionName}>LLM Classifier (Custom Model)</span>
            <span className={styles.optionTagAi}>AI Powered</span>
          </div>
          <p className={styles.optionDesc}>
            Uses any LLM model to classify reasoning depth via structured JSON.
            Supports all 5 providers and custom model identifiers.
          </p>
          <div className={styles.optionStats}>
            <span className={styles.statItem}>Latency: ~150ms</span>
            <span className={styles.statItem}>Fallback: Auto</span>
          </div>
        </button>
      </div>

      {classifierMode === 'llm' && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsHeader}>
            <span className={styles.settingsTitle}>Classifier Model &amp; Key Settings</span>
            <span className={`${styles.keyStatus} ${isKeyActive ? styles.keyActive : ''}`}>
              {isKeyActive ? 'Key Ready' : 'Key Required for Custom Calls'}
            </span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="classifier-provider-select">
                Classifier Provider (5 Supported)
              </label>
              <select
                id="classifier-provider-select"
                className={styles.select}
                value={llmClassifierProvider}
                onChange={handleProviderChange}
              >
                <option value="google">Google AI Studio (Gemini)</option>
                <option value="groq">Groq (LPU Inference)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="classifier-preset-select">
                Preset Model
              </label>
              <select
                id="classifier-preset-select"
                className={styles.select}
                value={isCustomModel ? '__custom__' : llmClassifierModel}
                onChange={handlePresetSelect}
              >
                {availablePresets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="__custom__">Custom model ID...</option>
              </select>
            </div>
          </div>

          {isCustomModel && (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="classifier-custom-model-input">
                Custom Model Identifier for {PROVIDER_NAMES[llmClassifierProvider]}
              </label>
              <input
                id="classifier-custom-model-input"
                type="text"
                className={styles.input}
                placeholder="e.g. gpt-4o-2024-08-06, claude-3-5-haiku-20241022, deepseek-chat..."
                value={llmClassifierModel}
                onChange={handleCustomModelInput}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className={styles.keyField}>
            <label className={styles.fieldLabel} htmlFor="classifier-api-key-input">
              Dedicated {PROVIDER_NAMES[llmClassifierProvider] || 'Provider'} API Key (Optional)
            </label>
            <input
              id="classifier-api-key-input"
              type="password"
              className={styles.input}
              placeholder={
                hasSavedByKey
                  ? `Using saved key from BYOK settings (${apiKeys[llmClassifierProvider]?.slice(0, 7)}...)`
                  : `Enter dedicated ${PROVIDER_NAMES[llmClassifierProvider]} API key...`
              }
              value={llmClassifierApiKey}
              onChange={handleKeyChange}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className={styles.note}>
            Note: You can pick any of the 5 providers, choose a preset or type a custom model ID, and supply a dedicated key or rely on your saved BYOK keys.
          </div>
        </div>
      )}
    </div>
  );
}
