'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TimeseriesPoint } from '@/lib/api';
import styles from './SavingsChart.module.css';

interface Props {
  data: TimeseriesPoint[];
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

function formatCost(v: number) {
  if (v === 0) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

export function SavingsChart({ data }: Props) {
  const totalSaved = data.reduce((acc, curr) => acc + curr.saved, 0);
  const totalCost = data.reduce((acc, curr) => acc + curr.actualCost, 0);

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Cumulative Cost & Savings Trajectory</span>
          <p className={styles.subtitle}>7-day rolling window of frontier cost savings vs actual expenditure</p>
        </div>

        <div className={styles.legend}>
          <div className={`${styles.legendPill} ${styles.pillSaved}`}>
            <span className={styles.dotSaved} />
            <span>Saved: <strong className="mono">{formatCost(totalSaved)}</strong></span>
          </div>

          <div className={`${styles.legendPill} ${styles.pillCost}`}>
            <span className={styles.dotCost} />
            <span>Cost: <strong className="mono">{formatCost(totalCost)}</strong></span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className={styles.empty}>No timeseries data recorded yet</div>
      ) : (
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="oklch(0.520 0.150 150)" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="oklch(0.520 0.150 150)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="oklch(0.480 0.080 260)" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="oklch(0.480 0.080 260)" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.948 0.004 80)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: 'oklch(0.560 0.012 80)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCost}
                tick={{ fill: 'oklch(0.560 0.012 80)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
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
                labelFormatter={(label) => typeof label === 'string' ? formatDate(label) : String(label)}
                formatter={(v) => [formatCost(typeof v === 'number' ? v : 0)]}
              />
              <Area
                type="monotone"
                dataKey="saved"
                name="Net Saved"
                stroke="oklch(0.460 0.140 150)"
                strokeWidth={2}
                fill="url(#gradSaved)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="actualCost"
                name="Actual Cost"
                stroke="oklch(0.440 0.080 260)"
                strokeWidth={2}
                fill="url(#gradCost)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
