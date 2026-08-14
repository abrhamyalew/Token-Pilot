import type { StatsSummary } from '@/lib/api';
import styles from './HeroMetrics.module.css';

interface Props {
  summary: StatsSummary;
}

function formatCost(n: number): string {
  if (n < 0.001) return `$${(n * 100).toFixed(3)}¢`;
  return `$${n.toFixed(4)}`;
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function HeroMetrics({ summary }: Props) {
  const metrics = [
    {
      id: 'total-requests',
      label: 'Total Requests',
      sublabel: 'Prompts routed through gateway',
      value: summary.totalRequests.toLocaleString(),
      badgeText: 'Traffic',
      type: 'traffic',
    },
    {
      id: 'total-saved',
      label: 'Net Financial Savings',
      sublabel: 'Calculated against frontier baseline',
      value: formatCost(summary.totalSaved),
      badgeText: 'Saved',
      type: 'savings',
    },
    {
      id: 'savings-pct',
      label: 'Optimization Rate',
      sublabel: 'Cost reduction margin',
      value: formatPct(summary.savingsPercent),
      badgeText: 'Efficiency',
      type: 'savings',
    },
    {
      id: 'avg-latency',
      label: 'Average Overhead Latency',
      sublabel: 'End-to-end roundtrip duration',
      value: `${summary.avgLatencyMs.toLocaleString()}ms`,
      badgeText: 'Latency',
      type: 'latency',
    },
  ];

  return (
    <div className={`grid-4 ${styles.grid}`}>
      {metrics.map((m) => (
        <div key={m.id} id={m.id} className={`card ${styles.metricCard}`}>
          <div className={styles.topRow}>
            <span className={styles.label}>{m.label}</span>
            <span className={`${styles.badge} ${styles[`badge_${m.type}`]}`}>
              {m.badgeText}
            </span>
          </div>

          <div className={`${styles.value} mono`}>
            {m.value}
          </div>

          <span className={styles.sublabel}>{m.sublabel}</span>
        </div>
      ))}
    </div>
  );
}
