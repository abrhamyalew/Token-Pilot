'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ResponsePanel.module.css';

interface Props {
  content: string;
  status: 'idle' | 'classifying' | 'streaming' | 'done' | 'error';
  error: string | null;
}

export function ResponsePanel({ content, status, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'streaming') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [content, status]);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (status === 'idle') return null;

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Model Response</span>
          {status === 'streaming' && (
            <span className={styles.streamingStatus}>Streaming…</span>
          )}
          {status === 'done' && (
            <span className="tier-badge low" style={{ fontSize: '0.65rem' }}>Complete</span>
          )}
        </div>

        {content && status === 'done' && (
          <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Body */}
      {error ? (
        <div className={styles.errorBox}>
          <span className={styles.errorLabel}>Error:</span>
          <p className={styles.errorText}>{error}</p>
        </div>
      ) : (
        <div className={styles.content}>
          {content ? (
            <div className={styles.formattedText}>
              {content}
              {status === 'streaming' && <span className={styles.cursor} />}
            </div>
          ) : (
            <span className={styles.placeholder}>Awaiting model tokens…</span>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
