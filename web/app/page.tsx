'use client';

import { useChat } from '@/lib/hooks/useChat';
import { PromptInput } from '@/components/playground/PromptInput';
import { RoutingViz } from '@/components/playground/RoutingViz';
import { ResponsePanel } from '@/components/playground/ResponsePanel';
import { CostComparison } from '@/components/playground/CostComparison';
import styles from './page.module.css';

export default function PlaygroundPage() {
  const { state, send, reset } = useChat();
  const isLoading = state.status === 'classifying' || state.status === 'streaming';

  return (
    <div className={styles.page}>
      {/* Hero section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="status-dot online" />
            <span>Live Demo — No signup required</span>
          </div>
          <h1 className={`${styles.heroTitle} gradient-text`}>
            Route any prompt to the<br />cheapest capable model
          </h1>
          <p className={styles.heroDesc}>
            Token Pilot classifies prompt complexity in milliseconds using a 12-signal
            feature vector and routes to the most cost-effective LLM — saving up to 80%
            vs always using frontier models.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className={`container ${styles.content}`}>
        {/* Left: Input + response */}
        <div className={styles.left}>
          <PromptInput
            onSubmit={send}
            isLoading={isLoading}
            requestsRemaining={state.requestsRemaining}
          />

          {state.status !== 'idle' && (
            <button
              type="button"
              className={`btn btn-ghost ${styles.resetBtn}`}
              onClick={reset}
            >
              ↺ Reset
            </button>
          )}

          {state.metadata && (
            <CostComparison metadata={state.metadata} />
          )}

          <ResponsePanel
            content={state.content}
            status={state.status}
            error={state.error}
          />
        </div>

        {/* Right: Routing viz */}
        <div className={styles.right}>
          <RoutingViz status={state.status} metadata={state.metadata} />

          {/* Example prompts */}
          {state.status === 'idle' && (
            <div className={`card ${styles.examples}`}>
              <p className={styles.examplesTitle}>Try an example</p>
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className={styles.exampleBtn}
                  onClick={() => send(ex.prompt)}
                >
                  <span className={`tier-badge ${ex.tier}`}>{ex.tier}</span>
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  {
    tier: 'low',
    label: 'Translate "Hello World" to French',
    prompt: 'Translate "Hello World" to French',
  },
  {
    tier: 'medium',
    label: 'Explain how DNS resolution works',
    prompt: 'Explain how DNS resolution works, step by step, for a software engineer who is new to networking.',
  },
  {
    tier: 'high',
    label: 'Refactor this class to use Strategy Pattern',
    prompt: 'Refactor the following TypeScript class to use the Strategy pattern. The class currently has 3 different sorting algorithms hardcoded as methods. Explain your design decisions.\n\n```typescript\nclass DataProcessor {\n  sortBubble(arr: number[]): number[] { /* ... */ }\n  sortMerge(arr: number[]): number[] { /* ... */ }\n  sortQuick(arr: number[]): number[] { /* ... */ }\n}\n```',
  },
];
