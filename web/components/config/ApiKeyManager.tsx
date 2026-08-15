'use client';

import React, { useState } from 'react';
import {
  useConfigStore,
  PROVIDER_CATALOG,
  DEFAULT_TIER_MODELS,
  ProviderId,
  Tier,
} from '@/lib/config-store';
import styles from './ApiKeyManager.module.css';

interface PingStatus {
  state: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  latencyMs?: number;
}

export function ApiKeyManager() {
  const {
    apiKeys,
    setApiKey,
    tierModels,
    setTierModel,
    rememberInSession,
    setRememberInSession,
    clearAllKeys,
    activeKeyCount,
  } = useConfigStore();

  const [revealed, setRevealed] = useState<Record<ProviderId, boolean>>({
    groq: false,
    google: false,
    openai: false,
    anthropic: false,
    deepseek: false,
  });

  const [pingStates, setPingStates] = useState<Record<ProviderId, PingStatus>>({
    groq: { state: 'idle', message: '' },
    google: { state: 'idle', message: '' },
    openai: { state: 'idle', message: '' },
    anthropic: { state: 'idle', message: '' },
    deepseek: { state: 'idle', message: '' },
  });

  const toggleReveal = (provider: ProviderId) => {
    setRevealed((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const providers: ProviderId[] = ['groq', 'google', 'openai', 'anthropic', 'deepseek'];
  const allTiers: Tier[] = ['low', 'medium', 'high', 'high_alt'];

  const validateKeyFormat = (provider: ProviderId, key: string) => {
    if (!key || key.trim().length === 0) {
      return {
        status: 'empty',
        label: PROVIDER_CATALOG[provider].isByokRequired
          ? 'Key required for real calls'
          : 'Optional (free fallback)',
      };
    }
    const trimmed = key.trim();
    const prefix = PROVIDER_CATALOG[provider].keyPrefix;
    if (!trimmed.startsWith(prefix)) {
      return { status: 'invalid', label: `Must start with "${prefix}"` };
    }
    if (trimmed.length < 15) {
      return { status: 'invalid', label: 'Key too short' };
    }
    return { status: 'valid', label: 'Valid format' };
  };

  const testProviderKey = async (provider: ProviderId) => {
    const key = apiKeys[provider];
    setPingStates((prev) => ({
      ...prev,
      [provider]: { state: 'loading', message: 'Testing connection…' },
    }));

    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: key?.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setPingStates((prev) => ({
          ...prev,
          [provider]: {
            state: 'success',
            message: `Available (${data.latencyMs}ms)`,
            latencyMs: data.latencyMs,
          },
        }));
      } else {
        setPingStates((prev) => ({
          ...prev,
          [provider]: {
            state: 'error',
            message: data.message || 'Connection failed',
          },
        }));
      }
    } catch {
      setPingStates((prev) => ({
        ...prev,
        [provider]: {
          state: 'error',
          message: 'Network error reaching tester',
        },
      }));
    }
  };

  const assignTierToProvider = (tier: Tier, provider: ProviderId) => {
    const defaultModel = PROVIDER_CATALOG[provider]?.models[0]?.id ?? 'default-model';
    setTierModel(tier, { provider, model: defaultModel });
  };

  const unassignTierFromProvider = (tier: Tier, currentProvider: ProviderId) => {
    const defaultForTier = DEFAULT_TIER_MODELS[tier];
    if (defaultForTier.provider !== currentProvider) {
      setTierModel(tier, defaultForTier);
    } else {
      const alternateProviders = providers.filter((pr) => pr !== currentProvider);
      const nextProvider = alternateProviders[0];
      const nextModel = PROVIDER_CATALOG[nextProvider]?.models[0]?.id ?? 'default-model';
      setTierModel(tier, { provider: nextProvider, model: nextModel });
    }
  };

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Provider BYOK & Target Tier Management</span>
          <p className={styles.subtitle}>
            Manage API credentials and quickly map any complexity tier directly to your preferred provider.
          </p>
        </div>

        <div className={styles.headerActions}>
          {activeKeyCount > 0 && (
            <span className={styles.activeBadge}>
              <span className={styles.activeDot} />
              {activeKeyCount} {activeKeyCount === 1 ? 'key active' : 'keys active'}
            </span>
          )}
          {activeKeyCount > 0 && (
            <button
              type="button"
              onClick={clearAllKeys}
              className={styles.clearBtn}
              title="Clear all stored API keys from memory and session"
            >
              Clear all keys
            </button>
          )}
        </div>
      </div>

      {/* Advisory Note */}
      <div className={styles.advisoryNote}>
        <span className={styles.advisoryIcon}>i</span>
        <span>
          Tip: We recommend using a spend-limited or scoped API key from your provider&apos;s dashboard.
        </span>
      </div>

      {/* Provider List */}
      <div className={styles.providerList}>
        {providers.map((p) => {
          const info = PROVIDER_CATALOG[p];
          const val = apiKeys[p] ?? '';
          const isRevealed = revealed[p] ?? false;
          const validation = validateKeyFormat(p, val);
          const ping = pingStates[p];

          // Find which tiers currently target this provider
          const assignedTiers = allTiers.filter((t) => tierModels[t].provider === p);
          const unassignedTiers = allTiers.filter((t) => tierModels[t].provider !== p);

          return (
            <div key={p} className={styles.providerCard}>
              <div className={styles.providerTop}>
                <div className={styles.providerNameRow}>
                  <span className={styles.providerName}>{info.name}</span>
                  <span
                    className={`${styles.providerBadge} ${
                      info.isByokRequired ? styles.badgeByok : styles.badgeFree
                    }`}
                  >
                    {info.badge}
                  </span>
                </div>

                <a
                  href={info.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.portalLink}
                >
                  Get API Key →
                </a>
              </div>

              {/* Tier Assignment Row */}
              <div className={styles.tierAssignmentRow}>
                <span className={styles.tierAssignmentLabel}>Assigned Tiers:</span>
                <div className={styles.tierPillsGroup}>
                  {assignedTiers.length > 0 ? (
                    assignedTiers.map((t) => (
                      <span key={t} className={`tier-badge ${t} ${styles.assignedPill}`}>
                        <span>
                          {t.toUpperCase()} ({tierModels[t].model})
                        </span>
                        <button
                          type="button"
                          onClick={() => unassignTierFromProvider(t, p)}
                          className={styles.removePillBtn}
                          title={`Remove ${t.toUpperCase()} assignment from ${info.name}`}
                          aria-label={`Remove ${t.toUpperCase()} assignment from ${info.name}`}
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="1" y1="1" x2="9" y2="9" />
                            <line x1="9" y1="1" x2="1" y2="9" />
                          </svg>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                      None currently
                    </span>
                  )}

                  {unassignedTiers.length > 0 && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                      Quick assign:
                    </span>
                  )}
                  {unassignedTiers.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => assignTierToProvider(t, p)}
                      className={styles.unassignedOption}
                      title={`Assign ${t.toUpperCase()} tier to ${info.name}`}
                    >
                      + {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input & Test Key Controls */}
              <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    type={isRevealed ? 'text' : 'password'}
                    value={val}
                    onChange={(e) => setApiKey(p, e.target.value)}
                    placeholder={info.placeholder}
                    className={`input ${styles.keyInput}`}
                    autoComplete="off"
                    spellCheck="false"
                    id={`byok-key-${p}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleReveal(p)}
                    className={styles.revealToggle}
                    aria-label={isRevealed ? 'Hide key' : 'Show key'}
                  >
                    {isRevealed ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => testProviderKey(p)}
                  disabled={ping.state === 'loading'}
                  className={styles.testKeyBtn}
                  id={`test-key-${p}`}
                >
                  {ping.state === 'loading' ? 'Testing…' : 'Test Key & Health'}
                </button>
              </div>

              {/* Status Feedback Row */}
              <div className={styles.statusRow}>
                <span
                  className={`${styles.statusIndicator} ${
                    validation.status === 'valid'
                      ? styles.statusValid
                      : validation.status === 'invalid'
                      ? styles.statusInvalid
                      : styles.statusEmpty
                  }`}
                >
                  {validation.label}
                </span>

                {ping.state !== 'idle' && (
                  <span
                    className={`${styles.healthPingResult} ${
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with Session Opt-In */}
      <div className={styles.footerRow}>
        <label className={styles.rememberOptIn}>
          <input
            type="checkbox"
            checked={rememberInSession}
            onChange={(e) => setRememberInSession(e.target.checked)}
            className={styles.checkbox}
            id="remember-session-keys"
          />
          <span>Remember keys for this session (cleared on tab close)</span>
        </label>
        <span className={styles.memoryNotice}>
          Keys are never written to localStorage or server disk.
        </span>
      </div>
    </div>
  );
}
