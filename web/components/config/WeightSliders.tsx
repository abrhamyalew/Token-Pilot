'use client';

import { useState } from 'react';
import { DEFAULT_WEIGHTS, scorePrompt, extractFeatures } from '@token-pilot/classifier';
import type { ClassifierWeights } from '@token-pilot/classifier';
import styles from './WeightSliders.module.css';

const WEIGHT_KEYS: { key: keyof ClassifierWeights; label: string; desc: string; min: number; max: number }[] = [
  { key: 'tokenCount',         label: 'Token Length',        desc: 'Logarithmic length multiplier', min: 0, max: 0.3 },
  { key: 'avgSentenceLength',  label: 'Sentence Density',    desc: 'Syntactic complexity & clause length', min: 0, max: 0.2 },
  { key: 'questionCount',      label: 'Question Density',    desc: 'Multi-question prompt signals', min: 0, max: 0.2 },
  { key: 'codeBlockPresent',   label: 'Code & Syntax',       desc: 'Code snippets and syntax blocks', min: 0, max: 0.3 },
  { key: 'reasoningKeywords',  label: 'Reasoning Keywords',  desc: 'Proof, verify, analyze, calculate', min: 0, max: 0.3 },
  { key: 'simpleKeywords',     label: 'Simplicity Bias (Neg)', desc: 'Translate, define, greeting', min: -0.3, max: 0 },
  { key: 'constraintCount',    label: 'Constraint Count',    desc: 'JSON format, schema rules', min: 0, max: 0.2 },
  { key: 'structuralDepth',    label: 'Structural Nesting',  desc: 'Indentation, bullet hierarchies', min: 0, max: 0.2 },
  { key: 'domainTermDensity',  label: 'Domain Specificity',  desc: 'Technical & domain terminology', min: 0, max: 0.3 },
  { key: 'formalLanguageScore',label: 'Formal Logic Score',  desc: 'Mathematical & algorithmic precision', min: 0, max: 0.3 },
  { key: 'systemPrompt',       label: 'System Directives',   desc: 'Custom developer instructions', min: 0, max: 0.2 },
  { key: 'multiTurnCount',     label: 'Multi-Turn Context',  desc: 'Conversational history depth', min: 0, max: 0.2 },
];

const TEST_PROMPTS = [
  { label: 'Low: Utility helper', prompt: 'Write a TypeScript helper to check if a JavaScript object is empty.' },
  { label: 'Medium: Data structure', prompt: 'Implement a binary search tree in TypeScript with insert, search, and in-order traversal methods.' },
  { label: 'High: Distributed consensus', prompt: 'Formally prove the correctness of the Byzantine fault-tolerant consensus algorithm with 3f+1 nodes and network partitions' },
];

export function WeightSliders() {
  const [weights, setWeights] = useState<ClassifierWeights>({ ...DEFAULT_WEIGHTS });

  const setWeight = (key: keyof ClassifierWeights, value: number) => {
    setWeights((w) => ({ ...w, [key]: value }));
  };

  const reset = () => setWeights({ ...DEFAULT_WEIGHTS });

  const previews = TEST_PROMPTS.map(({ label, prompt }) => {
    const features = extractFeatures(prompt);
    const result = scorePrompt(features, weights);
    return { label, tier: result.tier, score: result.score };
  });

  return (
    <div className={`card ${styles.container}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>12-Signal Classifier Weights</span>
          <p className={styles.subtitle}>Adjust signal coefficients in the heuristic scoring formula</p>
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

      {/* Sliders List */}
      <div className={styles.sliders}>
        {WEIGHT_KEYS.map(({ key, label, desc, min, max }) => {
          const val = weights[key] as number;
          const isNeg = val < 0;
          return (
            <div key={key} className={styles.sliderRow}>
              <div className={styles.sliderLabel}>
                <div>
                  <span className={styles.paramName}>{label}</span>
                  <span className={styles.paramDesc}>{desc}</span>
                </div>
                <span className={`mono ${styles.sliderValue} ${isNeg ? styles.neg : styles.pos}`}>
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
                aria-label={label}
              />
            </div>
          );
        })}
      </div>

      {/* Live Preview */}
      <div className={styles.preview}>
        <span className={styles.previewTitle}>Live Previews</span>
        <div className={styles.previewRows}>
          {previews.map(({ label, tier, score }) => (
            <div key={label} className={styles.previewRow}>
              <span className={styles.previewLabel}>{label}</span>
              <span className={`tier-badge ${tier.toLowerCase()}`}>
                {tier}
              </span>
              <span className={`mono ${styles.previewScore}`}>Score: {score.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
