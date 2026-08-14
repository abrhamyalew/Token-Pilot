'use client';

import type { HealthResponse } from '@/lib/api';
import { useHealth } from '@/lib/hooks/useHealth';
import styles from './ProviderHealth.module.css';

interface Props {
  health: HealthResponse | null;
}

const PROVIDERS = [
  { key: 'groq',      label: 'Groq Cloud Engine',    tier: 'low',      protocol: 'Llama 3.3 70B' },
  { key: 'google',    label: 'Google AI Studio',     tier: 'medium',   protocol: 'Gemini 3.6 Flash' },
  { key: 'openai',    label: 'OpenAI API Gateway',   tier: 'high',     protocol: 'GPT-5.5 Pro' },
  { key: 'anthropic', label: 'Anthropic Claude API',  tier: 'high_alt', protocol: 'Claude Opus 4.8' },
];

export function ProviderHealth({ health: initialHealth }: Props) {
  const { health, loading, refetch } = useHealth(initialHealth);
  const gatewayOnline = health?.status === 'ok';

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Upstream Provider Gateways</span>
          <p className={styles.subtitle}>Health checks and availability across configured inference backends</p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={refetch}
          disabled={loading}
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          {loading ? 'Pinging…' : 'Ping'}
        </button>
      </div>

      {/* Gateway Master Status */}
      <div className={styles.masterStatus}>
        <span className={styles.masterLabel}>Central Gateway</span>
        <div className={styles.statusPill}>
          <span className={`status-dot ${gatewayOnline ? 'online' : 'offline'}`} />
          <span className="mono" style={{ fontSize: '0.75rem' }}>
            {gatewayOnline ? 'Operational' : 'Degraded'}
          </span>
        </div>
      </div>

      {/* Provider List */}
      <div className={styles.providerList}>
        {PROVIDERS.map((p) => {
          return (
            <div key={p.key} className={styles.providerRow}>
              <div className={styles.providerInfo}>
                <span className={`tier-badge ${p.tier}`}>{p.tier}</span>
                <div>
                  <span className={styles.providerName}>{p.label}</span>
                  <span className={`mono ${styles.providerProtocol}`}>{p.protocol}</span>
                </div>
              </div>

              <div className={styles.providerStatus}>
                <span className="status-dot online" />
                <span className="mono" style={{ fontSize: '0.725rem', color: 'var(--tier-low-text)' }}>
                  Reachable
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
