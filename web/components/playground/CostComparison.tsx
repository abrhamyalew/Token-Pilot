'use client';

import type { RoutingMetadata } from '@/lib/hooks/useChat';
import styles from './CostComparison.module.css';

interface Props {
  metadata: RoutingMetadata;
}

export function CostComparison({ metadata }: Props) {
  const actualCost = metadata.actualCost ?? 0;
  const frontierCost = metadata.frontierCost ?? 0;
  const savings = metadata.savings ?? 0;
  const savingsPercent = metadata.savingsPercent ?? 0;
  const latencyMs = metadata.latencyMs ?? 0;

  const formatCost = (c: number) =>
    c === 0 ? '$0.00 (Free)' : `$${c.toFixed(6)}`;

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Cost Delta</span>
        <span className="tier-badge low">
          {savingsPercent.toFixed(0)}% cost reduction
        </span>
      </div>

      {/* 2-Column Comparison Grid */}
      <div className={styles.grid}>
        {/* Routed Cost */}
        <div className={styles.costBox}>
          <span className={styles.costLabel}>Routed model</span>
          <div className={`${styles.costValue} mono`}>
            {formatCost(actualCost)}
          </div>
          <span className={`${styles.costModel} mono`}>{metadata.model}</span>
        </div>

        {/* Frontier Cost */}
        <div className={styles.costBox}>
          <span className={styles.costLabel}>Frontier baseline (GPT-4o)</span>
          <div className={`${styles.costValue} ${styles.frontierValue} mono`}>
            {formatCost(frontierCost)}
          </div>
          <span className={`${styles.costModel} mono`}>gpt-4o</span>
        </div>
      </div>

      {/* Summary Footer */}
      <div className={styles.footer}>
        <div className={styles.savingsSummary}>
          {savings > 0 ? (
            <span>
              Net saved: <strong className="mono">${savings.toFixed(6)}</strong>
            </span>
          ) : (
            <span>Frontier reasoning required</span>
          )}
        </div>

        <div className={styles.latencyText}>
          <span className="mono">{latencyMs}ms</span> latency
        </div>
      </div>
    </div>
  );
}
