'use client';

import { motion } from 'framer-motion';
import type { RoutingMetadata } from '@/lib/hooks/useChat';
import styles from './CostComparison.module.css';

interface Props {
  metadata: RoutingMetadata;
}

export function CostComparison({ metadata }: Props) {
  const { actualCost, frontierCost, savings, savingsPercent, latencyMs } = metadata;

  const formatCost = (c: number) =>
    c === 0 ? 'Free' : `$${c.toFixed(6)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={`card glow-border ${styles.container}`}
    >
      <div className={styles.header}>
        <span className={styles.title}>Cost Comparison</span>
        <span className={styles.savingsBadge}>
          🎉 {savingsPercent.toFixed(0)}% saved
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.costBox}>
          <span className={styles.costLabel}>This request</span>
          <span className={`${styles.costValue} ${styles.cheap}`}>
            {formatCost(actualCost)}
          </span>
          <span className={styles.costModel}>{metadata.model}</span>
        </div>

        <div className={styles.vsLabel}>vs</div>

        <div className={styles.costBox}>
          <span className={styles.costLabel}>GPT-4o would cost</span>
          <span className={`${styles.costValue} ${styles.expensive}`}>
            {formatCost(frontierCost)}
          </span>
          <span className={styles.costModel}>gpt-4o</span>
        </div>
      </div>

      {savings > 0 && (
        <div className={styles.savingsRow}>
          <span className={styles.savingsText}>
            You saved <strong>${savings.toFixed(6)}</strong> on this request
          </span>
          <span className={styles.latency}>
            {latencyMs.toLocaleString()}ms latency
          </span>
        </div>
      )}
    </motion.div>
  );
}
