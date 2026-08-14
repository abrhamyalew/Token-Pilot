import styles from './ProviderHealth.module.css';

interface HealthData {
  status: string;
  providers?: Record<string, boolean>;
}

interface Props {
  health: HealthData | null;
}

const PROVIDERS = [
  { key: 'groq',     label: 'Groq',     tier: 'low' },
  { key: 'google',   label: 'Google AI', tier: 'medium' },
  { key: 'openai',   label: 'OpenAI',   tier: 'high' },
  { key: 'anthropic',label: 'Anthropic', tier: 'high_alt' },
];

export function ProviderHealth({ health }: Props) {
  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Provider Health</span>
        {health && (
          <span className={`${styles.gatewayStatus} ${health.status === 'ok' ? styles.ok : styles.err}`}>
            Gateway {health.status === 'ok' ? '✓' : '✕'}
          </span>
        )}
      </div>

      {!health ? (
        <p className={styles.offline}>Gateway unreachable</p>
      ) : (
        <div className={styles.providerList}>
          {PROVIDERS.map(({ key, label, tier }) => {
            const online = health.providers?.[key] !== false;
            return (
              <div key={key} className={styles.providerRow}>
                <span className={`status-dot ${online ? 'online' : 'offline'}`} />
                <span className={styles.providerLabel}>{label}</span>
                <span className={`tier-badge ${tier}`}>{tier}</span>
                <span className={`${styles.providerStatus} ${online ? styles.online : styles.offline}`}>
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
