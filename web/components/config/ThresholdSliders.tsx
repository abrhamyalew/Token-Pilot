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
  { label: 'Regex SemVer validator', prompt: 'Write a regular expression to validate semantic version numbers according to SemVer 2.0.' },
  { label: 'Async concurrency queue', prompt: 'Write a TypeScript async queue with concurrency limits, retry backoff, and error callbacks.' },
  { label: 'Distributed consensus analysis', prompt: 'Analyze the trade-offs of Raft vs Paxos in distributed systems with high network partition rates.' },
];

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

  const lowPct = Math.max(5, thresholds.lowMax * 100);
  const medPct = Math.max(5, (thresholds.mediumMax - thresholds.lowMax) * 100);
  const highPct = Math.max(5, (thresholds.highMax - thresholds.mediumMax) * 100);
  const altPct = Math.max(5, (1 - thresholds.highMax) * 100);

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Threshold Boundaries</span>
          <p className={styles.subtitle}>Calibrate complexity cutoff boundaries across model tiers</p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={reset}
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          Reset
        </button>
      </div>

      {/* Spectrum Bar */}
      <div className={styles.spectrumSection}>
        <div className={styles.spectrum}>
          <div
            className={styles.spectrumSegment}
            style={{
              width: `${lowPct}%`,
              background: 'var(--tier-low-bg)',
              color: 'var(--tier-low-text)',
              borderRight: '1px solid var(--tier-low-border)',
            }}
          >
            <span>LOW (≤{thresholds.lowMax.toFixed(2)})</span>
          </div>
          <div
            className={styles.spectrumSegment}
            style={{
              width: `${medPct}%`,
              background: 'var(--tier-medium-bg)',
              color: 'var(--tier-medium-text)',
              borderRight: '1px solid var(--tier-medium-border)',
            }}
          >
            <span>MED (≤{thresholds.mediumMax.toFixed(2)})</span>
          </div>
          <div
            className={styles.spectrumSegment}
            style={{
              width: `${highPct}%`,
              background: 'var(--tier-high-bg)',
              color: 'var(--tier-high-text)',
              borderRight: '1px solid var(--tier-high-border)',
            }}
          >
            <span>HIGH (≤{thresholds.highMax.toFixed(2)})</span>
          </div>
          <div
            className={styles.spectrumSegment}
            style={{
              width: `${altPct}%`,
              background: 'var(--tier-alt-bg)',
              color: 'var(--tier-alt-text)',
            }}
          >
            <span>HIGH-ALT</span>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className={styles.sliders}>
        {/* Low Max */}
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span>Low Cutoff (≤ Low Max)</span>
            <span className="mono" style={{ color: 'var(--tier-low-text)', fontWeight: 600 }}>
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
            <span>Medium Cutoff (≤ Med Max)</span>
            <span className="mono" style={{ color: 'var(--tier-medium-text)', fontWeight: 600 }}>
              {thresholds.mediumMax.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={thresholds.lowMax + 0.05}
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
            <span>High Cutoff (≤ High Max → High-Alt)</span>
            <span className="mono" style={{ color: 'var(--tier-high-text)', fontWeight: 600 }}>
              {thresholds.highMax.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={thresholds.mediumMax + 0.05}
            max={0.98}
            step={0.01}
            value={thresholds.highMax}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, highMax: parseFloat(e.target.value) }))
            }
            className={styles.slider}
          />
        </div>
      </div>

      {/* Live Simulation Previews */}
      <div className={styles.preview}>
        <span className={styles.previewTitle}>Live Previews</span>
        <div className={styles.previewRows}>
          {previews.map(({ label, score, tier }) => (
            <div key={label} className={styles.previewRow}>
              <span className={styles.previewLabel}>{label}</span>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {score.toFixed(3)}
              </span>
              <span className={`tier-badge ${tier}`}>{tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
