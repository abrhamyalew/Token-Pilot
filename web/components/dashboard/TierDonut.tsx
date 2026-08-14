'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import styles from './TierDonut.module.css';

const TIER_COLORS: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  high_alt: '#a855f7',
};

interface Props {
  tierBreakdown: Record<string, number>;
}

export function TierDonut({ tierBreakdown }: Props) {
  const data = Object.entries(tierBreakdown)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({ name: tier, value: count }));

  if (data.length === 0) return null;

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Tier Distribution</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={TIER_COLORS[entry.name] ?? '#6b7280'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v, name) => [typeof v === 'number' ? v : 0, name]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{val}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
