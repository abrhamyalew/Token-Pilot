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
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  high_alt: '#a855f7',
};

export function LatencyBars({ requests }: Props) {
  // Aggregate average latency per tier from recent requests
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
    // Default preview benchmarks if no recent requests
    data.push(
      { tier: 'LOW', rawTier: 'low', avgLatency: 280, count: 0 },
      { tier: 'MEDIUM', rawTier: 'medium', avgLatency: 640, count: 0 },
      { tier: 'HIGH', rawTier: 'high', avgLatency: 1450, count: 0 },
      { tier: 'HIGH_ALT', rawTier: 'high_alt', avgLatency: 1820, count: 0 },
    );
  }

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Avg Latency by Tier (ms)</span>
        <span className={styles.subtitle}>Response time across model tiers</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="ms"
          />
          <YAxis
            type="category"
            dataKey="tier"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [`${v} ms`, 'Avg Latency']}
          />
          <Bar dataKey="avgLatency" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.rawTier} fill={TIER_COLORS[entry.rawTier] ?? '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
