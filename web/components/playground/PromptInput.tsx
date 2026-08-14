'use client';

import { useState } from 'react';
import styles from './PromptInput.module.css';

interface Props {
  onSubmit: (prompt: string, byokKey?: string) => void;
  isLoading: boolean;
  requestsRemaining: number | null;
}

export function PromptInput({ onSubmit, isLoading, requestsRemaining }: Props) {
  const [prompt, setPrompt] = useState('');
  const [byokKey, setByokKey] = useState('');
  const [showByok, setShowByok] = useState(false);

  const tokenEstimate = Math.ceil(prompt.split(/\s+/).filter(Boolean).length * 1.3);
  const canSubmit = prompt.trim().length > 0 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(prompt.trim(), byokKey || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Prompt textarea */}
      <div className={styles.textareaWrapper}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste any prompt here — Token Pilot will classify its complexity and route it to the cheapest capable model..."
          rows={6}
          className={styles.textarea}
          disabled={isLoading}
          id="prompt-input"
        />
        <div className={styles.textareaFooter}>
          <span className={styles.tokenCount}>
            ~{tokenEstimate.toLocaleString()} tokens
          </span>
          <span className={styles.hint}>⌘ + Enter to send</span>
        </div>
      </div>

      {/* BYOK toggle */}
      <div className={styles.byokRow}>
        <button
          type="button"
          className={styles.byokToggle}
          onClick={() => setShowByok((v) => !v)}
        >
          🔑 {showByok ? 'Hide' : 'Use your own API key'}
          <span className={styles.byokBadge}>High tier</span>
        </button>

        {showByok && (
          <input
            type="password"
            value={byokKey}
            onChange={(e) => setByokKey(e.target.value)}
            placeholder="sk-... or sk-ant-..."
            className={`${styles.byokInput} input`}
            id="byok-input"
          />
        )}
      </div>

      {/* Submit row */}
      <div className={styles.submitRow}>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn btn-primary"
          id="send-prompt-btn"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Routing...
            </>
          ) : (
            'Route Prompt →'
          )}
        </button>

        {requestsRemaining !== null && (
          <div className={styles.rateLimitBar}>
            <span className={styles.rateLimitLabel}>
              {requestsRemaining}/10 requests left
            </span>
            <div className={styles.rateLimitTrack}>
              <div
                className={styles.rateLimitFill}
                style={{ width: `${(requestsRemaining / 10) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
