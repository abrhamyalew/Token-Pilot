'use client';

import React from 'react';
import type { RoutingMetadata } from '@/lib/hooks/useChat';
import styles from './RoutingViz.module.css';

type Status = 'idle' | 'classifying' | 'streaming' | 'done' | 'error';

const PIPELINE_STAGES = [
  {
    id: 'extract',
    label: 'Analyze prompt features',
    tooltip: 'Analyzes prompt length, code blocks, reasoning verbs, constraints, structural depth, and syntax.',
  },
  {
    id: 'score',
    label: 'Score complexity',
    tooltip: 'Evaluates complexity either via 12-signal heuristic weights or Gemini Flash structured JSON reasoning.',
  },
  {
    id: 'resolve',
    label: 'Resolve optimal tier',
    tooltip: 'Maps complexity score to optimal tier (Low, Medium, High, Ultra High) to select the best model.',
  },
  {
    id: 'stream',
    label: 'Stream model response',
    tooltip: 'Dispatches request to the selected provider adapter and streams response tokens via Server-Sent Events (SSE).',
  },
];

const TIER_DESCRIPTIONS: Record<string, { title: string; desc: string; range: string; models: string }> = {
  low: {
    title: 'Low Complexity',
    desc: 'Simple Q&A, definitions, greetings, and basic text queries routed to fast, cost-free or ultra-cheap models.',
    range: 'Score: 0.000 - 0.080',
    models: 'e.g. Llama 3.1 8B, Gemini Flash Lite',
  },
  medium: {
    title: 'Medium Complexity',
    desc: 'Standard programming tasks, moderate explanations, and structured summaries routed to balanced workhorse models.',
    range: 'Score: 0.081 - 0.200',
    models: 'e.g. Gemini 2.5 Flash, Llama 3.3 70B',
  },
  high: {
    title: 'High Complexity',
    desc: 'Advanced software architecture, multi-constraint coding, and algorithmic problems routed to high-capacity reasoning models.',
    range: 'Score: 0.201 - 0.420',
    models: 'e.g. Claude 3.5 Sonnet, GPT-4o',
  },
  high_alt: {
    title: 'Ultra High (High Alt)',
    desc: 'Frontier-level formal proofs, distributed consensus, and heavy multi-file systems requiring top-tier flagship models.',
    range: 'Score: > 0.420',
    models: 'e.g. Claude 3.7 Sonnet / Opus, o1',
  },
};

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

  const currentTierInfo = metadata?.tier ? TIER_DESCRIPTIONS[metadata.tier] || TIER_DESCRIPTIONS.medium : null;

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Routing Pipeline</span>
        {status !== 'idle' && metadata && (
          <div className={styles.tierBadgeWrapper}>
            <span className={`tier-badge ${metadata.tier} ${styles.tierBadgeInteractive}`}>
              {metadata.tier}
            </span>
            <div className={`${styles.tooltip} ${styles.tierTooltip}`}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>{currentTierInfo?.title || metadata.tier}</span>
                <span className={styles.tooltipBadge}>{currentTierInfo?.range}</span>
              </div>
              <p className={styles.tooltipText}>{currentTierInfo?.desc}</p>
              <div className={styles.tooltipFootnote}>
                <strong>Typical models:</strong> {currentTierInfo?.models}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Progression Checklist */}
      <div className={styles.pipeline}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = activeStep > i || status === 'done';
          const isActive = activeStep === i && status !== 'done' && status !== 'idle';
          const isPending = activeStep < i && status !== 'done';

          return (
            <div key={stage.id} className={styles.stageRowWrapper}>
              <div className={styles.stageRow}>
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
                <span className={styles.infoDot} aria-hidden="true">i</span>
              </div>

              <div className={`${styles.tooltip} ${styles.stageTooltip}`}>
                <div className={styles.tooltipHeader}>
                  <span className={styles.tooltipTitle}>Stage {i + 1}: {stage.label}</span>
                </div>
                <p className={styles.tooltipText}>{stage.tooltip}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metadata Telemetry Box with Rich Hover Information */}
      {metadata && (
        <div className={styles.telemetryBox}>
          {/* Classifier Engine */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Classifier engine
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">
                {metadata.classifier === 'llm'
                  ? (metadata.classifierModel
                      ? `${metadata.classifierProvider ? metadata.classifierProvider + ' / ' : ''}${metadata.classifierModel}`
                      : 'LLM Classifier')
                  : 'Heuristic Rules'}
                {metadata.fallbackFrom && ' (Fallback)'}
              </span>
            </div>
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Classifier Engine</span>
              </div>
              <p className={styles.tooltipText}>
                {metadata.classifier === 'llm'
                  ? `Classified using ${metadata.classifierModel ?? 'LLM'} structured JSON schema${metadata.classifierProvider ? ` via ${metadata.classifierProvider}` : ''}.`
                  : 'Classified using calibrated 12-signal heuristic feature vector.'}
                {metadata.fallbackFrom && ' Note: Defaulted to rules because LLM confidence was low or unavailable.'}
              </p>
            </div>
          </div>

          {/* Target Model */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Target model
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">{metadata.model}</span>
            </div>
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Target Model</span>
              </div>
              <p className={styles.tooltipText}>
                The specific LLM selected to execute this request based on the calculated complexity tier and adapter availability.
              </p>
            </div>
          </div>

          {/* Provider */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Provider
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">{metadata.provider}</span>
            </div>
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Inference Provider</span>
              </div>
              <p className={styles.tooltipText}>
                The hosting cloud infrastructure running the model (e.g. Google AI Studio, Groq LPUs, OpenRouter).
              </p>
            </div>
          </div>

          {/* Complexity Score / Reasoning */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Complexity score
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">
                {(metadata.score ?? 0).toFixed(3)}
                {metadata.classifier !== 'llm' && ' / 1.000'}
              </span>
            </div>
            <div className={`${styles.tooltip} ${styles.scoreTooltip}`}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Complexity Score: {(metadata.score ?? 0).toFixed(3)}</span>
              </div>
              <p className={styles.tooltipText}>
                {metadata.reasoning
                  ? `Classification reasoning: "${metadata.reasoning}"`
                  : 'Composite score evaluated from 12 weighted linguistic and structural features.'}
              </p>
              {metadata.classifier === 'llm' && (
                <p className={styles.tooltipNote}>
                  Score shown is the canonical midpoint for the classified tier (LLM classifiers return a tier label, not a continuous score). Confidence: {((metadata.confidence ?? 0) * 100).toFixed(0)}%.
                </p>
              )}
              <div className={styles.tierGuide}>
                <div className={styles.tierGuideTitle}>Routing Tier Thresholds:</div>
                <div className={`${styles.tierGuideRow} ${metadata.tier === 'low' ? styles.tierGuideRowActive : ''}`}>
                  <span className={`${styles.tierIndicator} ${styles.tierLow}`}>LOW (0.000 - 0.080)</span>
                  <span className={styles.tierGuideDesc}>Simple Q&A, definitions, concise tasks</span>
                </div>
                <div className={`${styles.tierGuideRow} ${metadata.tier === 'medium' ? styles.tierGuideRowActive : ''}`}>
                  <span className={`${styles.tierIndicator} ${styles.tierMedium}`}>MEDIUM (0.081 - 0.200)</span>
                  <span className={styles.tierGuideDesc}>Standard coding, functions, summaries</span>
                </div>
                <div className={`${styles.tierGuideRow} ${metadata.tier === 'high' ? styles.tierGuideRowActive : ''}`}>
                  <span className={`${styles.tierIndicator} ${styles.tierHigh}`}>HIGH (0.201 - 0.420)</span>
                  <span className={styles.tierGuideDesc}>Architecture, multi-constraint refactoring</span>
                </div>
                <div className={`${styles.tierGuideRow} ${metadata.tier === 'high_alt' ? styles.tierGuideRowActive : ''}`}>
                  <span className={`${styles.tierIndicator} ${styles.tierAlt}`}>ULTRA HIGH (&gt; 0.420)</span>
                  <span className={styles.tierGuideDesc}>Frontier logic, distributed proofs, formal systems</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confidence */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Confidence
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">{((metadata.confidence ?? 0) * 100).toFixed(0)}%</span>
            </div>
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Routing Confidence</span>
              </div>
              <p className={styles.tooltipText}>
                Certainty metric. For rules, measures distance from threshold boundaries. For LLM, provides the model assessed confidence score.
              </p>
            </div>
          </div>

          {/* Overhead Latency */}
          <div className={styles.metaRowWrapper}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>
                Overhead latency
                <span className={styles.infoIcon}>?</span>
              </span>
              <span className="mono">{metadata.classifyLatencyMs ?? metadata.latencyMs ?? 0}ms</span>
            </div>
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipTitle}>Classification Overhead</span>
              </div>
              <p className={styles.tooltipText}>
                Time taken in milliseconds to evaluate complexity and determine the optimal route before initiating the model stream.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <p className={styles.idleNotice}>
          Submit a prompt above to observe feature vector extraction and routing decisions in real time. Hover over any metric for details.
        </p>
      )}
    </div>
  );
}
