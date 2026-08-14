'use client';

import styles from './TierModelEditor.module.css';

interface TierEntry {
  model: string;
  provider: string;
  cost: string;
}

interface Props {
  tiers: Record<string, TierEntry>;
}

export function TierModelEditor({ tiers }: Props) {
  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Configured Model Registry</span>
          <p className={styles.subtitle}>Active models assigned to each classification tier</p>
        </div>
      </div>

      {/* Tiers List */}
      <div className={styles.tierList}>
        {Object.entries(tiers).map(([tierKey, entry]) => (
          <div key={tierKey} className={styles.tierRow}>
            <div className={styles.tierInfo}>
              <span className={`tier-badge ${tierKey}`}>{tierKey}</span>
              <div>
                <span className={`mono ${styles.modelName}`}>{entry.model}</span>
                <span className={styles.providerName}>Provider: {entry.provider}</span>
              </div>
            </div>

            <div className={styles.tierCost}>
              <span className="mono">{entry.cost}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
