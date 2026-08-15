'use client';

import React, { useState } from 'react';
import {
  useConfigStore,
  PROVIDER_CATALOG,
  Tier,
  ProviderId,
} from '@/lib/config-store';
import styles from './TierModelEditor.module.css';

const TIER_META: Record<Tier, { label: string; role: string }> = {
  low: {
    label: 'LOW',
    role: 'Low Complexity: Fast utilities, basic formatting & extraction',
  },
  medium: {
    label: 'MEDIUM',
    role: 'Medium Complexity: Algorithmic logic, structure & explanations',
  },
  high: {
    label: 'HIGH',
    role: 'High Complexity: Architecture refactoring & distributed systems',
  },
  high_alt: {
    label: 'HIGH_ALT',
    role: 'Alternative Frontier: Deep multi-paradigm analysis & synthesis',
  },
};

const PROVIDER_OPTIONS: { id: ProviderId; label: string }[] = [
  { id: 'groq', label: 'Groq (Free Tier / LPU)' },
  { id: 'google', label: 'Google AI Studio (Gemini)' },
  { id: 'openai', label: 'OpenAI (BYOK)' },
  { id: 'anthropic', label: 'Anthropic (BYOK)' },
  { id: 'deepseek', label: 'DeepSeek (BYOK)' },
];

export function TierModelEditor() {
  const { tierModels, setTierModel, resetTierModels, apiKeys } = useConfigStore();
  const tiers: Tier[] = ['low', 'medium', 'high', 'high_alt'];

  const [customModes, setCustomModes] = useState<Record<Tier, boolean>>({
    low: false,
    medium: false,
    high: false,
    high_alt: false,
  });

  const [pingResults, setPingResults] = useState<
    Record<Tier, { state: 'idle' | 'loading' | 'success' | 'error'; message: string }>
  >({
    low: { state: 'idle', message: '' },
    medium: { state: 'idle', message: '' },
    high: { state: 'idle', message: '' },
    high_alt: { state: 'idle', message: '' },
  });

  const handleProviderChange = (tier: Tier, newProvider: ProviderId) => {
    setCustomModes((prev) => ({ ...prev, [tier]: false }));
    const defaultModelForProvider =
      PROVIDER_CATALOG[newProvider]?.models[0]?.id ?? '';
    setTierModel(tier, { provider: newProvider, model: defaultModelForProvider });
  };

  const handleModelSelect = (tier: Tier, modelId: string) => {
    const currentProvider = tierModels[tier].provider;
    setTierModel(tier, { provider: currentProvider, model: modelId });
  };

  const handleReset = () => {
    setCustomModes({ low: false, medium: false, high: false, high_alt: false });
    resetTierModels();
  };

  const pingTierTarget = async (tier: Tier) => {
    const target = tierModels[tier];
    const key = apiKeys[target.provider];

    setPingResults((prev) => ({
      ...prev,
      [tier]: { state: 'loading', message: 'Checking…' },
    }));

    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: target.provider,
          key: key?.trim(),
          model: target.model,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPingResults((prev) => ({
          ...prev,
          [tier]: { state: 'success', message: `Reachable (${data.latencyMs}ms)` },
        }));
      } else {
        setPingResults((prev) => ({
          ...prev,
          [tier]: { state: 'error', message: data.message || 'Unreachable' },
        }));
      }
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [tier]: { state: 'error', message: 'Ping failed' },
      }));
    }
  };

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Tier & Model Routing Configuration</span>
          <p className={styles.subtitle}>
            Assign any model and provider to each complexity tier. You can use a single provider across all 4 tiers or mix providers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className={styles.resetBtn}
          title="Reset tier models to system defaults"
        >
          Reset to defaults
        </button>
      </div>

      {/* Tiers List */}
      <div className={styles.tierList}>
        {tiers.map((tier) => {
          const meta = TIER_META[tier];
          const current = tierModels[tier];
          const providerInfo = PROVIDER_CATALOG[current.provider];
          const catalogModels = providerInfo?.models ?? [];
          const isCustom =
            customModes[tier] ||
            (!catalogModels.some((m) => m.id === current.model) && current.model.length > 0);
          const ping = pingResults[tier];

          return (
            <div key={tier} className={styles.tierCard}>
              <div className={styles.tierHeader}>
                <div className={styles.tierBadgeRow}>
                  <span className={`tier-badge ${tier}`}>{meta.label}</span>
                  <span className={styles.tierRole}>{meta.role}</span>
                </div>
              </div>

              <div className={styles.controlsRow}>
                {/* Provider Selector */}
                <div className={styles.selectWrapper}>
                  <label htmlFor={`provider-select-${tier}`} className={styles.selectLabel}>
                    Provider
                  </label>
                  <select
                    id={`provider-select-${tier}`}
                    value={current.provider}
                    onChange={(e) =>
                      handleProviderChange(tier, e.target.value as ProviderId)
                    }
                    className={styles.selectInput}
                  >
                    {PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selector */}
                <div className={styles.selectWrapper}>
                  <label htmlFor={`model-select-${tier}`} className={styles.selectLabel}>
                    Model
                  </label>
                  <select
                    id={`model-select-${tier}`}
                    value={isCustom ? '__custom__' : current.model}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomModes((prev) => ({ ...prev, [tier]: true }));
                      } else {
                        setCustomModes((prev) => ({ ...prev, [tier]: false }));
                        handleModelSelect(tier, e.target.value);
                      }
                    }}
                    className={styles.selectInput}
                  >
                    {catalogModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id}) — {m.costDesc}
                      </option>
                    ))}
                    <option value="__custom__">Custom Model ID...</option>
                  </select>

                  {isCustom && (
                    <input
                      type="text"
                      value={current.model}
                      onChange={(e) =>
                        setTierModel(tier, {
                          provider: current.provider,
                          model: e.target.value,
                        })
                      }
                      placeholder={`Enter custom ${providerInfo?.name ?? ''} model ID (e.g. gpt-4o-2024-08-06)...`}
                      className={`input ${styles.customModelInput}`}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className={styles.tierFooter}>
                <div>
                  Active target:{' '}
                  <span className={styles.activeSelection}>
                    {providerInfo?.name} → {current.model || '(empty)'}
                  </span>
                </div>

                <div className={styles.footerRight}>
                  {ping.state !== 'idle' && (
                    <span
                      className={`${styles.pingResult} ${
                        ping.state === 'success'
                          ? styles.pingSuccess
                          : ping.state === 'error'
                          ? styles.pingError
                          : styles.pingLoading
                      }`}
                    >
                      {ping.message}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => pingTierTarget(tier)}
                    disabled={ping.state === 'loading'}
                    className={styles.pingTargetBtn}
                    title="Check availability of this model and credentials"
                  >
                    {ping.state === 'loading' ? 'Checking…' : 'Check Reachability'}
                  </button>

                  <div>
                    {providerInfo?.isByokRequired ? (
                      <span className={styles.byokIndicator}>BYOK Required</span>
                    ) : (
                      <span className={styles.freeIndicator}>Free Tier</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
