'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { RoutingMetadata } from '@/lib/hooks/useChat';
import styles from './RoutingViz.module.css';

type Status = 'idle' | 'classifying' | 'streaming' | 'done' | 'error';

const TIER_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  high_alt: 'High Alt',
};

const PIPELINE_STEPS = ['Extracting Features', 'Scoring', 'Routing', 'Streaming'];

interface Props {
  status: Status;
  metadata: RoutingMetadata | null;
}

export function RoutingViz({ status, metadata }: Props) {
  const activeStep =
    status === 'classifying' ? 0
    : status === 'streaming'  ? 2
    : status === 'done'       ? 3
    : -1;

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Routing Pipeline</span>
        {status !== 'idle' && (
          <span className={`tier-badge ${metadata?.tier ?? ''}`}>
            {metadata ? TIER_LABELS[metadata.tier] ?? metadata.tier : '...'}
          </span>
        )}
      </div>

      {/* Pipeline steps */}
      <div className={styles.pipeline}>
        {PIPELINE_STEPS.map((step, i) => {
          const isDone    = activeStep > i || status === 'done';
          const isActive  = activeStep === i;
          const isPending = activeStep < i && status !== 'done';

          return (
            <div key={step} className={styles.stepRow}>
              <div
                className={`${styles.stepDot} ${isDone ? styles.done : ''} ${isActive ? styles.active : ''} ${isPending ? styles.pending : ''}`}
              >
                {isDone ? '✓' : isActive ? <span className={styles.pulse} /> : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${isPending ? styles.muted : ''}`}>
                {step}
              </span>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Metadata reveal */}
      <AnimatePresence>
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={styles.meta}
          >
            <MetaRow label="Provider"    value={metadata.provider}                 mono />
            <MetaRow label="Model"       value={metadata.model}                    mono />
            <MetaRow label="Score"       value={metadata.score.toFixed(3)}         mono />
            <MetaRow label="Confidence"  value={`${(metadata.confidence * 100).toFixed(0)}%`} mono />
            <MetaRow label="Classifier"  value={metadata.classifier}               mono />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle state */}
      {status === 'idle' && (
        <p className={styles.idle}>
          Submit a prompt to see the routing pipeline in action.
        </p>
      )}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={mono ? `${styles.metaValue} mono` : styles.metaValue}>{value}</span>
    </div>
  );
}
