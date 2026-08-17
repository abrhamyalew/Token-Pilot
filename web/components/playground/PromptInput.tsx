'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useConfigStore } from '@/lib/config-store';
import { RateLimitBar } from './RateLimitBar';
import styles from './PromptInput.module.css';

interface Props {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  requestsRemaining: number | null;
}

export function PromptInput({ onSubmit, isLoading, requestsRemaining }: Props) {
  const [prompt, setPrompt] = useState('');
  const { routingMode, setRoutingMode, activeKeyCount } = useConfigStore();

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;
  const tokenEstimate = Math.ceil(wordCount * 1.33);
  const canSubmit = prompt.trim().length > 0 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(prompt.trim());
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

        {/* Mode Selector Segmented Control */}
        <div className={styles.modeControlBar}>
          <div className={styles.modeToggleGroup}>
            <button
              type="button"
              className={`${styles.modeToggleBtn} ${
                routingMode === 'preset' ? styles.modeActive : ''
              }`}
              onClick={() => setRoutingMode('preset')}
              title="Use public preset demo keys (free live inference for Low/Med tiers; High tiers show routing & complexity analysis)"
            >
              <span>Preset Mode (Free Demo)</span>
            </button>

            <button
              type="button"
              className={`${styles.modeToggleBtn} ${
                routingMode === 'byok' ? styles.modeActive : ''
              }`}
              onClick={() => setRoutingMode('byok')}
              title="Use your own API keys and custom model mappings for all tiers"
            >
              <span>BYOK Mode (Custom Keys)</span>
              {activeKeyCount > 0 && (
                <span className={styles.activeKeyCountBadge}>{activeKeyCount}</span>
              )}
            </button>
          </div>

          <span className={styles.modeDescription}>
            {routingMode === 'preset'
              ? 'Free demo for Low/Med (Groq & Gemini) • High tiers require BYOK key'
              : `Custom provider keys & model overrides active (${activeKeyCount} keys entered)`}
          </span>
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
            onClick={() =>
              applySnippet(
                'What is a REST API? Give a brief summary.',
              )
            }
          >
            REST API Summary (Low)
          </button>
          <button
            type="button"
            className={styles.snippetBtn}
            onClick={() =>
              applySnippet(
                'Implement a generic LRU Cache in TypeScript with O(1) get and put using a Doubly Linked List and Map.',
              )
            }
          >
            LRU Cache (Med)
          </button>
          <button
            type="button"
            className={styles.snippetBtn}
            onClick={() =>
              applySnippet(
                'Refactor this TypeScript payment processor to use the Strategy pattern with idempotency keys, distributed locking via Redis, and a transactional outbox for event publishing. Include error handling and test fixtures.\n\n```typescript\nclass PaymentProcessor {\n  async process(type: "card" | "crypto" | "wire", amount: number) {\n    if (type === "card") { await stripe.charge(amount); }\n    else if (type === "crypto") { await web3.transfer(amount); }\n    else { await bank.wire(amount); }\n  }\n}\n```',
              )
            }
          >
            Payment Refactor (High)
          </button>
        </div>

        {/* Footer with BYOK status & Shortcuts */}
        <div className={styles.windowFooter}>
          <Link href="/config" className={styles.byokLink}>
            {routingMode === 'byok' ? (
              <span className={styles.activeKeyPill}>
                <span className={styles.activeKeyDot} />
                BYOK Mode: {activeKeyCount} {activeKeyCount === 1 ? 'key' : 'keys'} active (Config)
              </span>
            ) : (
              <span>Preset Mode active • Configure custom BYOK keys</span>
            )}
          </Link>

          <div className={styles.shortcutNotice}>
            <kbd>⌘</kbd> <kbd>Enter</kbd> to submit
          </div>
        </div>
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
              <span>Routing prompt...</span>
            </>
          ) : (
            <span>Route prompt</span>
          )}
        </button>

        <RateLimitBar requestsRemaining={requestsRemaining} />
      </div>
    </form>
  );
}
