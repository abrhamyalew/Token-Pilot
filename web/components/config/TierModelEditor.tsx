import styles from './TierModelEditor.module.css';

const TIER_COLORS: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  high_alt: '#a855f7',
};

interface TierInfo { model: string; provider: string; cost: string; }

interface Props {
  tiers: Record<string, TierInfo>;
}

export function TierModelEditor({ tiers }: Props) {
  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Tier → Model Mapping</span>
      </div>
      <div className={styles.tiers}>
        {Object.entries(tiers).map(([tier, info]) => (
          <div key={tier} className={styles.tierRow}>
            <div className={styles.tierLeft}>
              <span
                className="tier-badge"
                style={{
                  color: TIER_COLORS[tier],
                  background: `${TIER_COLORS[tier]}18`,
                }}
              >
                {tier}
              </span>
            </div>
            <div className={styles.arrow}>→</div>
            <div className={styles.tierRight}>
              <span className={`${styles.model} mono`}>{info.model}</span>
              <span className={styles.provider}>{info.provider}</span>
            </div>
            <div className={styles.cost}>{info.cost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
