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
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatCost(v: number) {
  return v === 0 ? '$0' : `$${v.toFixed(5)}`;
}

export function SavingsChart({ data }: Props) {
  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Savings Over Time</span>
        <span className={styles.legend}>
          <span className={styles.dot} style={{ background: '#22c55e' }} /> Saved
          <span className={styles.dot} style={{ background: '#3b82f6', marginLeft: 12 }} /> Actual Cost
        </span>
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSaved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCost}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label) => typeof label === 'string' ? formatDate(label) : String(label)}
              formatter={(v) => [formatCost(typeof v === 'number' ? v : 0)]}
            />
            <Area
              type="monotone"
              dataKey="saved"
              name="Saved"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#gradSaved)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="actualCost"
              name="Actual Cost"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#gradCost)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
