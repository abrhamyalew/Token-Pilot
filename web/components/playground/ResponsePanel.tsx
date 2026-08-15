'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useConfigStore } from '@/lib/config-store';
import styles from './ResponsePanel.module.css';

interface Props {
  content: string;
  status: 'idle' | 'classifying' | 'streaming' | 'done' | 'error';
  error: string | null;
}

export function ResponsePanel({ content, status, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const { setRoutingMode } = useConfigStore();

  const isFrontierWarning =
    content.includes('Preset Demo / Estimate Mode') ||
    content.includes('Frontier Tier Notice') ||
    content.includes('[Token Pilot — Estimate Mode]');

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
            <span className="tier-badge low" style={{ fontSize: '0.65rem' }}>
              Complete
            </span>
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
            <div>
              {isFrontierWarning && (
                <div className={styles.frontierWarningCard}>
                  <div className={styles.frontierWarningHeader}>
                    <div className={styles.frontierWarningTitleRow}>
                      <span className="tier-badge high">Notice</span>
                      <span className={styles.frontierWarningTitle}>
                        Frontier Tier Target (BYOK Key Required)
                      </span>
                    </div>
                  </div>

                  <p className={styles.frontierWarningBody}>
                    This query was evaluated as high complexity and routed to a frontier model. In <strong>Preset Demo Mode</strong>, live inference is provided for <strong>LOW</strong> and <strong>MEDIUM</strong> tiers (Groq & Gemini). To execute live reasoning on frontier models (OpenAI / Anthropic), switch to <strong>BYOK Mode</strong> and supply your API key.
                  </p>

                  <div className={styles.frontierWarningActions}>
                    <Link
                      href="/config"
                      onClick={() => setRoutingMode('byok')}
                      className={styles.switchByokBtn}
                    >
                      <span>Switch to BYOK Mode & Add Key →</span>
                    </Link>
                    <Link href="/config" className={styles.configLink}>
                      Configure routing models in Config
                    </Link>
                  </div>
                </div>
              )}

              <div
                className={
                  isFrontierWarning ? styles.estimateDetailsBox : styles.formattedText
                }
              >
                {content}
                {status === 'streaming' && <span className={styles.cursor} />}
              </div>
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
