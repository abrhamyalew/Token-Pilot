'use client';

import React from 'react';
import styles from './RateLimitBar.module.css';

interface Props {
  requestsRemaining: number | null;
  maxRequests?: number;
}

export function RateLimitBar({ requestsRemaining, maxRequests = 10 }: Props) {
  if (requestsRemaining === null) {
    return null;
  }

  const safeRemaining = Math.max(0, Math.min(requestsRemaining, maxRequests));
  const percentage = Math.round((safeRemaining / maxRequests) * 100);

  const fillStateClass =
    safeRemaining > 5
      ? styles.stateNormal
      : safeRemaining > 1
      ? styles.stateWarning
      : styles.stateDanger;

  return (
    <div
      className={styles.container}
      role="status"
      aria-label={`${safeRemaining} of ${maxRequests} requests remaining`}
      title="Demo rate limit window: 10 requests / min"
    >
      <div className={styles.meterTrack} aria-hidden="true">
        <div
          className={`${styles.meterFill} ${fillStateClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <span className={styles.label}>
        <span className={`${styles.count} mono`}>{safeRemaining}</span>
        <span className={styles.dim}>/{maxRequests} remaining</span>
      </span>
    </div>
  );
}
