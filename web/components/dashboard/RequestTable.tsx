'use client';

import { useState } from 'react';
import type { RecentRequest } from '@/lib/api';
import styles from './RequestTable.module.css';

interface Props {
  requests: RecentRequest[];
}

const TIER_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  high_alt: '#a855f7',
};

function formatCost(n: number): string {
  return n === 0 ? 'Free' : `$${n.toFixed(6)}`;
}

function truncate(s: string, max = 60): string {
  if (!s) return '—';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RequestTable({ requests }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const toggleRow = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Recent Requests</span>
          <p className={styles.hint}>Click any row to view feature vectors & full prompt</p>
        </div>
        <span className={styles.count}>{requests.length} logged</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Prompt</th>
              <th>Tier</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Actual</th>
              <th>Saved</th>
              <th>Latency</th>
              <th>When</th>
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
                  <td className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</td>
                  <td className={styles.promptCell} title={r.promptText}>
                    {truncate(r.promptText)}
                  </td>
                  <td>
                    <span
                      className="tier-badge"
                      style={{
                        color: TIER_COLORS[r.tier] ?? '#3b82f6',
                        background: `${TIER_COLORS[r.tier] ?? '#3b82f6'}18`,
                      }}
                    >
                      {r.tier}
                    </span>
                  </td>
                  <td className={`${styles.mono} ${styles.modelCell}`}>{r.model}</td>
                  <td className={styles.mono}>
                    <span className={styles.tokenIn}>{r.inputTokens}in</span> /{' '}
                    <span className={styles.tokenOut}>{r.outputTokens}out</span>
                  </td>
                  <td className={styles.mono}>{formatCost(r.actualCost)}</td>
                  <td className={`${styles.mono} ${styles.savedCell}`}>
                    {saved > 0 ? `+${formatCost(saved)}` : '—'}
                  </td>
                  <td className={styles.mono}>{r.latencyMs.toLocaleString()}ms</td>
                  <td className={styles.timeCell}>{relativeTime(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  return (
    <div className={styles.detailsModal}>
      <div className={styles.detailsHeader}>
        <div>
          <h4>Request Inspection</h4>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            ID: {request.id}
          </span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 10px' }}>
          ✕ Close
        </button>
      </div>

      <div className={styles.detailsBody}>
        <div className={styles.detailSection}>
          <label>Full Prompt</label>
          <pre className={styles.promptPre}>{request.promptText}</pre>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailCard}>
            <label>Routing Decision</label>
            <div className={styles.detailRow}>
              <span>Tier:</span>
              <span className="tier-badge" style={{ color: TIER_COLORS[request.tier] }}>
                {request.tier}
              </span>
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
                {request.confidence ? `${(request.confidence * 100).toFixed(1)}%` : 'Rule-based'}
              </span>
            </div>
          </div>

          <div className={styles.detailCard}>
            <label>Financial Breakdown</label>
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
              <span className="mono" style={{ color: 'var(--color-success)' }}>
                {formatCost(request.frontierCost - request.actualCost)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span>Latency:</span>
              <span className="mono">{request.latencyMs}ms</span>
            </div>
          </div>
        </div>

        {request.features && typeof request.features === 'object' ? (
          <div className={styles.detailSection}>
            <label>Extracted 12-Signal Features</label>
            <div className={styles.featurePills}>
              {Object.entries(request.features as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className={styles.featurePill}>
                  <span className={styles.featureKey}>{k}:</span>
                  <span className="mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
