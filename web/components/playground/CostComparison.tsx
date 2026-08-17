'use client';

import React from 'react';
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
    c === 0 ? '$0.00 (Free Tier)' : `$${c.toFixed(6)}`;

  const isFree = actualCost === 0;

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <span className={styles.title}>Cost Analysis & Savings</span>
          <span className={styles.headerSubtitle}>
            Intelligent routing cost comparison for this query
          </span>
        </div>
        <span className={`tier-badge ${isFree ? 'low' : 'medium'} ${styles.reductionBadge}`}>
          {savingsPercent.toFixed(0)}% Cost Reduction
        </span>
      </div>

      {/* 2-Column Comparison Grid */}
      <div className={styles.grid}>
        {/* Routed Cost */}
        <div className={`${styles.costBox} ${styles.routedBox}`}>
          <div className={styles.costBoxHeader}>
            <span className={styles.costLabel}>Your Incurred Cost</span>
            <div className={styles.tooltipTrigger}>
              <span className={styles.infoIcon} aria-label="Cost info">?</span>
              <div className={styles.tooltip}>
                <span className={styles.tooltipTitle}>Your Incurred Cost</span>
                <p className={styles.tooltipText}>
                  The actual cost to run this query on the selected model ({metadata.model}). Models on the free tier (like Gemini Flash or Groq LPU) incur $0.00.
                </p>
              </div>
            </div>
          </div>

          <div className={`${styles.costValue} ${isFree ? styles.freeValue : ''} mono`}>
            {formatCost(actualCost)}
          </div>

          <div className={styles.costFooter}>
            <span className={styles.modelTag}>{metadata.model}</span>
            <span className={styles.providerTag}>via {metadata.provider}</span>
          </div>
        </div>

        {/* Frontier Cost */}
        <div className={`${styles.costBox} ${styles.baselineBox}`}>
          <div className={styles.costBoxHeader}>
            <span className={styles.costLabel}>Without Pilot (GPT-4o Baseline)</span>
            <div className={styles.tooltipTrigger}>
              <span className={styles.infoIcon} aria-label="Baseline info">?</span>
              <div className={styles.tooltip}>
                <span className={styles.tooltipTitle}>Frontier Baseline (GPT-4o)</span>
                <p className={styles.tooltipText}>
                  The hypothetical cost if this prompt were sent directly to GPT-4o ($2.50 / 1M input, $10.00 / 1M output) without intelligent routing.
                </p>
              </div>
            </div>
          </div>

          <div className={`${styles.costValue} ${styles.frontierValue} mono`}>
            {formatCost(frontierCost)}
          </div>

          <div className={styles.costFooter}>
            <span className={styles.modelTag}>gpt-4o</span>
            <span className={styles.providerTag}>Standard API rate</span>
          </div>
        </div>
      </div>

      {/* Visual Savings Bar */}
      <div className={styles.barContainer}>
        <div className={styles.barLabels}>
          <span className={styles.barLabelLeft}>
            {isFree ? '100% saved via free tier' : `Saved ${(savingsPercent).toFixed(1)}%`}
          </span>
          <span className={styles.barLabelRight}>
            Baseline: ${frontierCost.toFixed(6)}
          </span>
        </div>
        <div className={styles.barTrack}>
          <div
            className={styles.barFillSaved}
            style={{ width: `${Math.min(100, Math.max(0, savingsPercent))}%` }}
          />
          <div
            className={styles.barFillPaid}
            style={{ width: `${Math.max(0, 100 - savingsPercent)}%` }}
          />
        </div>
      </div>

      {/* Summary Footer */}
      <div className={styles.footer}>
        <div className={styles.savingsSummary}>
          {savings > 0 ? (
            <span>
              Net saved on this query: <strong className="mono">${savings.toFixed(6)}</strong>
              <span className={styles.projectedNote}>
                (~${(savings * 100000).toFixed(2)} / 100k requests)
              </span>
            </span>
          ) : (
            <span>High complexity query: Routed to frontier reasoning tier.</span>
          )}
        </div>

        <div className={styles.latencyText}>
          <span className="mono">{latencyMs}ms</span> total elapsed
        </div>
      </div>
    </div>
  );
}
