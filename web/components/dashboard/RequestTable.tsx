'use client';

import { useState } from 'react';
import type { RecentRequest } from '@/lib/api';
import styles from './RequestTable.module.css';

interface Props {
  requests: RecentRequest[];
}

function formatCost(n: number): string {
  return n === 0 ? '$0.00' : `$${n.toFixed(6)}`;
}

function truncate(s: string, max = 54): string {
  if (!s) return '—';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch {
    return iso;
  }
}

export function RequestTable({ requests }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const toggleRow = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Inference Request Log</span>
          <p className={styles.hint}>Click any record to inspect the full prompt and extracted feature signals</p>
        </div>
        <span className={`${styles.count} mono`}>{requests.length} records</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Prompt Snippet</th>
              <th>Tier</th>
              <th>Routed Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Net Saved</th>
              <th>Latency</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const saved = r.frontierCost - r.actualCost;
              const isExpanded = expandedId === r.id;
              return (
                <tr
                  key={r.id}
                  className={`${styles.row} ${isExpanded ? styles.expandedRow : ''}`}
                  onClick={() => toggleRow(r.id)}
                >
                  <td className={styles.expandIcon}>
                    <span className={styles.iconCaret}>{isExpanded ? '▾' : '▸'}</span>
                  </td>
                  <td className={styles.promptCell} title={r.promptText}>
                    {truncate(r.promptText)}
                  </td>
                  <td>
                    <span className={`tier-badge ${r.tier.toLowerCase()}`}>
                      {r.tier}
                    </span>
                  </td>
                  <td className={`${styles.mono} ${styles.modelCell}`}>{r.model}</td>
                  <td className={styles.mono}>
                    <span className={styles.tokenIn}>{r.inputTokens}in</span> /{' '}
                    <span className={styles.tokenOut}>{r.outputTokens}out</span>
                  </td>
                  <td className={`${styles.mono} ${styles.actualCostCell}`}>{formatCost(r.actualCost)}</td>
                  <td className={`${styles.mono} ${styles.savedCell}`}>
                    {saved > 0 ? `+${formatCost(saved)}` : '—'}
                  </td>
                  <td className={styles.mono}>{r.latencyMs}ms</td>
                  <td className={styles.timeCell}>{relativeTime(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Inspection View */}
      {expandedId && (
        <ExpandedDetails
          request={requests.find((r) => r.id === expandedId)!}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}

function ExpandedDetails({
  request,
  onClose,
}: {
  request: RecentRequest;
  onClose: () => void;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(request.promptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {}
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(request, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {}
  };

  return (
    <div className={styles.detailsBox}>
      <div className={styles.detailsHeader}>
        <div className={styles.detailsTitleGroup}>
          <h4>Inspection: <span className="mono">{request.id}</span></h4>
        </div>

        <div className={styles.detailsActions}>
          <button type="button" className={styles.inspectBtn} onClick={copyPrompt}>
            {copiedPrompt ? 'Copied' : 'Copy prompt'}
          </button>
          <button type="button" className={styles.inspectBtn} onClick={copyJson}>
            {copiedJson ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className={styles.detailsBody}>
        {/* Full Prompt */}
        <div className={styles.detailSection}>
          <span className={styles.sectionLabel}>Full Prompt</span>
          <pre className={styles.promptPre}>{request.promptText}</pre>
        </div>

        {/* 2-Column Info */}
        <div className={styles.detailsGrid}>
          <div className={styles.detailCard}>
            <span className={styles.sectionLabel}>Routing Decision</span>
            <div className={styles.detailRow}>
              <span>Tier:</span>
              <span className={`tier-badge ${request.tier.toLowerCase()}`}>{request.tier}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Model:</span>
              <span className="mono">{request.model}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Provider:</span>
              <span className="mono">{request.provider}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Confidence:</span>
              <span className="mono">
                {request.confidence ? `${(request.confidence * 100).toFixed(0)}%` : 'Rule-based'}
              </span>
            </div>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.sectionLabel}>Financial Delta</span>
            <div className={styles.detailRow}>
              <span>Actual Cost:</span>
              <span className="mono">{formatCost(request.actualCost)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Frontier (GPT-4o):</span>
              <span className="mono">{formatCost(request.frontierCost)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Net Saved:</span>
              <span className="mono" style={{ color: 'var(--tier-low-text)', fontWeight: 600 }}>
                {formatCost(request.frontierCost - request.actualCost)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span>Roundtrip Latency:</span>
              <span className="mono">{request.latencyMs}ms</span>
            </div>
          </div>
        </div>

        {/* 12-Signal Features */}
        {request.features && typeof request.features === 'object' ? (
          <div className={styles.detailSection}>
            <span className={styles.sectionLabel}>12-Signal Feature Vector</span>
            <div className={styles.featurePills}>
              {Object.entries(request.features as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className={styles.featurePill}>
                  <span className={styles.featureKey}>{k}:</span>
                  <span className={`${styles.featureVal} mono`}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
