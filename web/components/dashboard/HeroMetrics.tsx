import type { StatsSummary } from '@/lib/api';
import styles from './HeroMetrics.module.css';

interface Props {
  summary: StatsSummary;
}

function formatCost(n: number): string {
  if (n < 0.001) return `$${(n * 100).toFixed(4)}¢`;
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
      value: summary.totalRequests.toLocaleString(),
      icon: '↗',
      color: 'blue',
    },
    {
      id: 'total-saved',
      label: 'Total Saved',
      value: formatCost(summary.totalSaved),
      icon: '💰',
      color: 'green',
    },
    {
      id: 'savings-pct',
      label: 'Savings Rate',
      value: formatPct(summary.savingsPercent),
      icon: '📉',
      color: 'green',
    },
    {
      id: 'avg-latency',
      label: 'Avg Latency',
      value: `${summary.avgLatencyMs.toLocaleString()}ms`,
      icon: '⚡',
      color: 'blue',
    },
  ];

  return (
    <div className={`grid-4 ${styles.grid}`}>
      {metrics.map((m) => (
        <div key={m.id} id={m.id} className={`card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>{m.icon}</span>
            <span className={styles.label}>{m.label}</span>
          </div>
          <div className={`${styles.value} ${styles[m.color]}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}
