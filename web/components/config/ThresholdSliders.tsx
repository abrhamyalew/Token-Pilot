'use client';

import { useState } from 'react';
import { DEFAULT_WEIGHTS, scorePrompt, extractFeatures } from '@token-pilot/classifier';
import styles from './ThresholdSliders.module.css';

interface Props {
  initialThresholds?: {
    lowMax: number;
    mediumMax: number;
    highMax: number;
  };
}

const DEFAULT_THRESHOLDS = {
  lowMax: 0.35,
  mediumMax: 0.7,
  highMax: 0.9,
};

const TEST_PROMPTS = [
  { label: 'Simple', prompt: 'Translate this word to Spanish: apple' },
  { label: 'Moderate', prompt: 'Write a regex to match email addresses according to RFC 5322.' },
  { label: 'Complex', prompt: 'Analyze the trade-offs of Raft vs Paxos in distributed systems with high network partition rates.' },
];

const TIER_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  high_alt: '#a855f7',
};

export function ThresholdSliders({ initialThresholds = DEFAULT_THRESHOLDS }: Props) {
  const [thresholds, setThresholds] = useState(initialThresholds);

  const reset = () => setThresholds(DEFAULT_THRESHOLDS);

  const getTierForScore = (score: number) => {
    if (score <= thresholds.lowMax) return 'low';
    if (score <= thresholds.mediumMax) return 'medium';
    if (score <= thresholds.highMax) return 'high';
    return 'high_alt';
  };

  const previews = TEST_PROMPTS.map(({ label, prompt }) => {
    const features = extractFeatures(prompt);
    const scoreResult = scorePrompt(features, DEFAULT_WEIGHTS);
    const resolvedTier = getTierForScore(scoreResult.score);
    return {
      label,
      score: scoreResult.score,
      tier: resolvedTier,
    };
  });

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Tier Threshold Boundaries</span>
          <p className={styles.subtitle}>Adjust score cutoffs between model tiers</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={reset}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          Reset
        </button>
      </div>

      <div className={styles.sliders}>
        {/* Low Max */}
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span>Low Tier Cutoff (Score ≤ Low Max)</span>
            <span className="mono" style={{ color: 'var(--color-tier-low)' }}>
              {thresholds.lowMax.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.01}
            value={thresholds.lowMax}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, lowMax: parseFloat(e.target.value) }))
            }
            className={styles.slider}
          />
        </div>

        {/* Medium Max */}
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span>Medium Tier Cutoff (Score ≤ Medium Max)</span>
            <span className="mono" style={{ color: 'var(--color-tier-medium)' }}>
              {thresholds.mediumMax.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={0.85}
            step={0.01}
            value={thresholds.mediumMax}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, mediumMax: parseFloat(e.target.value) }))
            }
            className={styles.slider}
          />
        </div>

        {/* High Max */}
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span>High Tier Cutoff (Score ≤ High Max → High, &gt; High Max → High Alt)</span>
            <span className="mono" style={{ color: 'var(--color-tier-high)' }}>
              {thresholds.highMax.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={0.99}
            step={0.01}
            value={thresholds.highMax}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, highMax: parseFloat(e.target.value) }))
            }
            className={styles.slider}
          />
        </div>
      </div>

      {/* Visual tier spectrum bar */}
      <div className={styles.spectrum}>
        <div
          className={styles.spectrumSegment}
          style={{
            flex: thresholds.lowMax,
            background: 'rgba(34, 197, 94, 0.25)',
            borderRight: '2px solid var(--color-tier-low)',
          }}
        >
          LOW (≤ {thresholds.lowMax.toFixed(2)})
        </div>
        <div
          className={styles.spectrumSegment}
          style={{
            flex: thresholds.mediumMax - thresholds.lowMax,
            background: 'rgba(245, 158, 11, 0.25)',
            borderRight: '2px solid var(--color-tier-medium)',
          }}
        >
          MEDIUM (≤ {thresholds.mediumMax.toFixed(2)})
        </div>
        <div
          className={styles.spectrumSegment}
          style={{
            flex: thresholds.highMax - thresholds.mediumMax,
            background: 'rgba(239, 68, 68, 0.25)',
            borderRight: '2px solid var(--color-tier-high)',
          }}
        >
          HIGH (≤ {thresholds.highMax.toFixed(2)})
        </div>
        <div
          className={styles.spectrumSegment}
          style={{
            flex: 1 - thresholds.highMax,
            background: 'rgba(168, 85, 247, 0.25)',
          }}
        >
          ALT
        </div>
      </div>

      {/* Live impact preview */}
      <div className={styles.preview}>
        <span className={styles.previewTitle}>Impact on Sample Prompts</span>
        <div className={styles.previewRows}>
          {previews.map(({ label, score, tier }) => (
            <div key={label} className={styles.previewRow}>
              <span className={styles.previewLabel}>{label}</span>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                score {score.toFixed(3)}
              </span>
              <span
                className="tier-badge"
                style={{
                  color: TIER_COLORS[tier],
                  background: `${TIER_COLORS[tier]}18`,
                }}
              >
                {tier}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
