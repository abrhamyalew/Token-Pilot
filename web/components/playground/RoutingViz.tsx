'use client';

import type { RoutingMetadata } from '@/lib/hooks/useChat';
import styles from './RoutingViz.module.css';

type Status = 'idle' | 'classifying' | 'streaming' | 'done' | 'error';

const PIPELINE_STAGES = [
  { id: 'extract', label: 'Extract 12-signal vector' },
  { id: 'score',   label: 'Calculate complexity score' },
  { id: 'resolve', label: 'Resolve optimal tier' },
  { id: 'stream',  label: 'Stream model response' },
];

interface Props {
  status: Status;
  metadata: RoutingMetadata | null;
}

export function RoutingViz({ status, metadata }: Props) {
  const activeStep =
    status === 'classifying' ? 1
    : status === 'streaming'  ? 3
    : status === 'done'       ? 4
    : 0;

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Routing Pipeline</span>
        {status !== 'idle' && metadata && (
          <span className={`tier-badge ${metadata.tier}`}>
            {metadata.tier}
          </span>
        )}
      </div>

      {/* Stage Progression Checklist */}
      <div className={styles.pipeline}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = activeStep > i || status === 'done';
          const isActive = activeStep === i && status !== 'done' && status !== 'idle';
          const isPending = activeStep < i && status !== 'done';

          return (
            <div key={stage.id} className={styles.stageRow}>
              <div
                className={`${styles.node} ${isDone ? styles.nodeDone : ''} ${isActive ? styles.nodeActive : ''} ${isPending ? styles.nodePending : ''}`}
              >
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`${styles.stageLabel} ${isPending ? styles.muted : ''}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Metadata Telemetry Box */}
      {metadata && (
        <div className={styles.telemetryBox}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Target model:</span>
            <span className="mono">{metadata.model}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Provider:</span>
            <span className="mono">{metadata.provider}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Complexity score:</span>
            <span className="mono">{(metadata.score ?? 0).toFixed(3)} / 1.000</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Confidence:</span>
            <span className="mono">{((metadata.confidence ?? 0) * 100).toFixed(0)}%</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Overhead latency:</span>
            <span className="mono">{metadata.latencyMs ?? 0}ms</span>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <p className={styles.idleNotice}>
          Submit a prompt above to observe feature vector extraction and routing decisions in real time.
        </p>
      )}
    </div>
  );
}
