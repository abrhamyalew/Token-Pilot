'use client';

import { useState } from 'react';
import { DEFAULT_WEIGHTS, scorePrompt, extractFeatures } from '@token-pilot/classifier';
import type { ClassifierWeights } from '@token-pilot/classifier';
import styles from './WeightSliders.module.css';

const WEIGHT_KEYS: { key: keyof ClassifierWeights; label: string; min: number; max: number }[] = [
  { key: 'tokenCount',       label: 'Token Count',       min: 0, max: 0.3 },
  { key: 'avgSentenceLength',label: 'Sentence Length',   min: 0, max: 0.2 },
  { key: 'questionCount',    label: 'Question Count',    min: 0, max: 0.2 },
  { key: 'codeBlockPresent', label: 'Code Presence',     min: 0, max: 0.3 },
  { key: 'reasoningKeywords',label: 'Reasoning Keywords',min: 0, max: 0.3 },
  { key: 'simpleKeywords',   label: 'Simple Keywords',   min: -0.3, max: 0 },
  { key: 'constraintCount',  label: 'Constraint Count',  min: 0, max: 0.2 },
  { key: 'structuralDepth',  label: 'Structural Depth',  min: 0, max: 0.2 },
  { key: 'domainTermDensity',label: 'Domain Density',    min: 0, max: 0.3 },
  { key: 'formalLanguageScore',label:'Formal Language',  min: 0, max: 0.3 },
  { key: 'systemPrompt',     label: 'System Prompt',     min: 0, max: 0.2 },
  { key: 'multiTurnCount',   label: 'Multi-turn Count',  min: 0, max: 0.2 },
];

const TEST_PROMPTS = [
  { label: 'Low',    prompt: 'Translate hello to French' },
  { label: 'Medium', prompt: 'Explain how DNS resolution works step-by-step for a new engineer' },
  { label: 'High',   prompt: 'Formally prove the correctness of the Byzantine fault-tolerant consensus algorithm with 3f+1 nodes' },
];

const TIER_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', high_alt: '#a855f7',
};

export function WeightSliders() {
  const [weights, setWeights] = useState<ClassifierWeights>({ ...DEFAULT_WEIGHTS });

  const setWeight = (key: keyof ClassifierWeights, value: number) => {
    setWeights((w) => ({ ...w, [key]: value }));
  };

  const reset = () => setWeights({ ...DEFAULT_WEIGHTS });

  // Live preview on test prompts
  const previews = TEST_PROMPTS.map(({ label, prompt }) => {
    const features = extractFeatures(prompt);
    const result = scorePrompt(features, weights);
    return { label, tier: result.tier, score: result.score };
  });

  return (
    <div className={`card ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Classifier Weights</span>
        <button type="button" className="btn btn-ghost" onClick={reset}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          Reset
        </button>
      </div>

      <div className={styles.sliders}>
        {WEIGHT_KEYS.map(({ key, label, min, max }) => {
          const val = weights[key] as number;
          const pct = ((val - min) / (max - min)) * 100;
          const isNeg = val < 0;
          return (
            <div key={key} className={styles.sliderRow}>
              <div className={styles.sliderLabel}>
                <span>{label}</span>
                <span className={`mono ${styles.sliderValue} ${isNeg ? styles.neg : ''}`}>
                  {val >= 0 ? '+' : ''}{val.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={0.01}
                value={val}
                onChange={(e) => setWeight(key, parseFloat(e.target.value))}
                className={styles.slider}
                style={{ '--pct': `${pct}%` } as React.CSSProperties}
                aria-label={label}
              />
            </div>
          );
        })}
      </div>

      {/* Live preview */}
      <div className={styles.preview}>
        <span className={styles.previewTitle}>Live Preview</span>
        <div className={styles.previewRows}>
          {previews.map(({ label, tier, score }) => (
            <div key={label} className={styles.previewRow}>
              <span className={styles.previewLabel}>{label} prompt</span>
              <span className="tier-badge" style={{
                color: TIER_COLORS[tier],
                background: `${TIER_COLORS[tier]}18`,
              }}>
                {tier}
              </span>
              <span className={`mono ${styles.previewScore}`}>{score.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
