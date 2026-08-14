'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RecentRequest } from '@/lib/api';
import styles from './LatencyBars.module.css';

interface Props {
  requests: RecentRequest[];
}

const TIER_COLORS: Record<string, string> = {
  low:      'oklch(0.520 0.150 150)',
  medium:   'oklch(0.560 0.140 225)',
  high:     'oklch(0.620 0.160 75)',
  high_alt: 'oklch(0.550 0.160 310)',
};

export function LatencyBars({ requests }: Props) {
  const tierStats: Record<string, { totalMs: number; count: number }> = {
    low: { totalMs: 0, count: 0 },
    medium: { totalMs: 0, count: 0 },
    high: { totalMs: 0, count: 0 },
    high_alt: { totalMs: 0, count: 0 },
  };

  for (const req of requests) {
    const tier = req.tier.toLowerCase();
    if (tierStats[tier]) {
      tierStats[tier].totalMs += req.latencyMs;
      tierStats[tier].count += 1;
    }
  }

  const data = Object.entries(tierStats)
    .filter(([, stat]) => stat.count > 0)
    .map(([tier, stat]) => ({
      tier: tier.toUpperCase(),
      rawTier: tier,
      avgLatency: Math.round(stat.totalMs / stat.count),
      count: stat.count,
    }));

  if (data.length === 0) {
    data.push(
      { tier: 'LOW', rawTier: 'low', avgLatency: 280, count: 0 },
      { tier: 'MEDIUM', rawTier: 'medium', avgLatency: 640, count: 0 },
      { tier: 'HIGH', rawTier: 'high', avgLatency: 1450, count: 0 },
      { tier: 'HIGH_ALT', rawTier: 'high_alt', avgLatency: 1820, count: 0 },
    );
  }

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Average Latency by Tier (ms)</span>
          <p className={styles.subtitle}>End-to-end response time benchmark per model class</p>
        </div>

        <div className={styles.legendGroup}>
          <span className={styles.legendTag}>
            <span className={styles.dot} style={{ background: TIER_COLORS.low }} />
            <span>Low (Groq)</span>
          </span>
          <span className={styles.legendTag}>
            <span className={styles.dot} style={{ background: TIER_COLORS.medium }} />
            <span>Medium (Gemini)</span>
          </span>
          <span className={styles.legendTag}>
            <span className={styles.dot} style={{ background: TIER_COLORS.high }} />
            <span>High (OpenAI)</span>
          </span>
          <span className={styles.legendTag}>
            <span className={styles.dot} style={{ background: TIER_COLORS.high_alt }} />
            <span>High-Alt (Anthropic)</span>
          </span>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.948 0.004 80)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'oklch(0.560 0.012 80)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              unit="ms"
            />
            <YAxis
              type="category"
              dataKey="tier"
              tick={{ fill: 'oklch(0.430 0.012 80)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
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
              formatter={(v) => [`${v} ms`, 'Average latency']}
            />
            <Bar dataKey="avgLatency" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.rawTier} fill={TIER_COLORS[entry.rawTier] ?? 'oklch(0.180 0.008 80)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
