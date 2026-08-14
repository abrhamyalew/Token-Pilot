'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './TierDonut.module.css';

const TIER_COLORS: Record<string, string> = {
  low:      'oklch(0.520 0.150 150)',
  medium:   'oklch(0.560 0.140 225)',
  high:     'oklch(0.620 0.160 75)',
  high_alt: 'oklch(0.550 0.160 310)',
};

const TIER_LABELS: Record<string, string> = {
  low:      'Low (Free)',
  medium:   'Medium',
  high:     'High',
  high_alt: 'High-Alt',
};

interface Props {
  tierBreakdown: Record<string, number>;
}

export function TierDonut({ tierBreakdown }: Props) {
  const data = Object.entries(tierBreakdown)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({
      name: tier.toUpperCase(),
      label: TIER_LABELS[tier.toLowerCase()] ?? tier.toUpperCase(),
      rawTier: tier.toLowerCase(),
      value: count,
    }));

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (data.length === 0) {
    return (
      <div className={`card ${styles.container}`}>
        <div className={styles.header}>
          <span className={styles.title}>Tier Volume Distribution</span>
        </div>
        <div className={styles.empty}>No distribution data</div>
      </div>
    );
  }

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Tier Volume Distribution</span>
        <span className={`${styles.totalBadge} mono`}>{total.toLocaleString()} total</span>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              stroke="oklch(1.000 0.000 0)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={TIER_COLORS[entry.rawTier] ?? 'oklch(0.420 0.010 80)'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'oklch(1.000 0.000 0)',
                border: '1px solid oklch(0.920 0.006 80)',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: '0 4px 14px oklch(0.180 0.008 80 / 0.08)',
                fontFamily: 'var(--font-mono)',
                color: 'oklch(0.180 0.008 80)',
              }}
              formatter={(v, name) => [`${typeof v === 'number' ? v : 0} requests (${total ? ((Number(v) / total) * 100).toFixed(1) : 0}%)`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Indicative Legend List */}
      <div className={styles.legendList}>
        {data.map((entry) => {
          const pct = total ? ((entry.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={entry.name} className={styles.legendRow}>
              <div className={styles.legendLeft}>
                <span
                  className={styles.dot}
                  style={{ background: TIER_COLORS[entry.rawTier] ?? '#999' }}
                />
                <span className={styles.legendLabel}>{entry.label}</span>
              </div>
              <span className={`mono ${styles.legendPct}`}>{pct}% ({entry.value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
