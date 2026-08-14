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

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;
  const tokenEstimate = Math.ceil(wordCount * 1.33);
  const canSubmit = prompt.trim().length > 0 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(prompt.trim(), byokKey.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const applySnippet = (text: string) => {
    setPrompt(text);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Faux-OS Window Chrome */}
      <div className="window-frame">
        <div className="window-header">
          <div className="window-dots">
            <span className="window-dot" />
            <span className="window-dot" />
            <span className="window-dot" />
          </div>

          <div className={styles.metaCounters}>
            <span className="mono">{charCount} chars</span>
            <span className={styles.dotSeparator}>·</span>
            <span className="mono">~{tokenEstimate} tokens</span>
          </div>
        </div>

        {/* Textarea */}
        <div className={styles.textareaWrapper}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter any prompt to evaluate its complexity and route to the most cost-effective model..."
            rows={5}
            className={styles.textarea}
            disabled={isLoading}
            id="prompt-input"
          />
        </div>

        {/* Snippet Suggestions */}
        <div className={styles.snippetBar}>
          <span className={styles.snippetLabel}>Presets:</span>
          <button
            type="button"
            className={styles.snippetBtn}
            onClick={() => applySnippet('Explain the difference between optimistic and pessimistic locking in databases.')}
          >
            Database Locking
          </button>
          <button
            type="button"
            className={styles.snippetBtn}
            onClick={() => applySnippet('Write a Python function to parse JSON with type validation and error handling.')}
          >
            Python Parser
          </button>
          <button
            type="button"
            className={styles.snippetBtn}
            onClick={() => applySnippet('Compare the time complexity of QuickSort vs MergeSort in worst-case scenarios.')}
          >
            Sorting Algorithms
          </button>
        </div>

        {/* Footer with BYOK & Shortcuts */}
        <div className={styles.windowFooter}>
          <button
            type="button"
            className={styles.byokToggle}
            onClick={() => setShowByok((v) => !v)}
          >
            <span>{showByok ? 'Hide custom API key' : 'Custom API key (BYOK)'}</span>
          </button>

          <div className={styles.shortcutNotice}>
            <kbd>⌘</kbd> <kbd>Enter</kbd> to submit
          </div>
        </div>

        {/* Collapsible BYOK Input Drawer */}
        {showByok && (
          <div className={styles.byokDrawer}>
            <label className={styles.byokLabel}>OpenAI or Anthropic API Key (stored in local memory only)</label>
            <input
              type="password"
              value={byokKey}
              onChange={(e) => setByokKey(e.target.value)}
              placeholder="sk-..."
              className={`input ${styles.byokInput}`}
              id="byok-input"
            />
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className={styles.actionRow}>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`btn btn-primary ${styles.submitBtn}`}
          id="send-prompt-btn"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              <span>Routing prompt…</span>
            </>
          ) : (
            <span>Route prompt</span>
          )}
        </button>

        {requestsRemaining !== null && (
          <div className={styles.rateLimitText}>
            <span className="mono">{requestsRemaining} / 10</span> requests remaining
          </div>
        )}
      </div>
    </form>
  );
}
