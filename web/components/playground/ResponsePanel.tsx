'use client';

import { useEffect, useRef } from 'react';
import styles from './ResponsePanel.module.css';

interface Props {
  content: string;
  status: 'idle' | 'classifying' | 'streaming' | 'done' | 'error';
  error: string | null;
}

export function ResponsePanel({ content, status, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll while streaming
  useEffect(() => {
    if (status === 'streaming') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [content, status]);

  if (status === 'idle') return null;

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Response</span>
        {status === 'streaming' && (
          <span className={styles.streamingBadge}>
            <span className={styles.streamDot} />
            Streaming
          </span>
        )}
        {status === 'done' && <span className={styles.doneBadge}>✓ Complete</span>}
        {status === 'error' && <span className={styles.errorBadge}>✕ Error</span>}
        {status === 'classifying' && <span className={styles.classifyingBadge}>Classifying…</span>}
      </div>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.content}>
          {content || <span className={styles.placeholder}>Waiting for response…</span>}
          {status === 'streaming' && <span className={styles.cursor} />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
