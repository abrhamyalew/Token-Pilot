'use client';

import { useChat } from '@/lib/hooks/useChat';
import { PromptInput } from '@/components/playground/PromptInput';
import { RoutingViz } from '@/components/playground/RoutingViz';
import { ResponsePanel } from '@/components/playground/ResponsePanel';
import { CostComparison } from '@/components/playground/CostComparison';
import styles from './page.module.css';

const EXAMPLE_PROMPTS = [
  {
    tier: 'low',
    category: 'General knowledge',
    label: 'What is a REST API?',
    prompt: 'What is a REST API? Give a brief summary.',
  },
  {
    tier: 'medium',
    category: 'Data structures',
    label: 'Implement an LRU Cache with O(1) operations in TypeScript',
    prompt: 'Implement a generic LRU (Least Recently Used) Cache class in TypeScript with O(1) get and put time complexity using a Doubly Linked List and a Map. Include capacity eviction and unit test assertions.',
  },
  {
    tier: 'high',
    category: 'Architecture',
    label: 'Refactor payment service with Strategy pattern and idempotency',
    prompt: 'Refactor the following TypeScript payment processor to use the Strategy pattern with strict types, idempotency keys, distributed locking via Redis, and transactional outbox event publishing. Provide architecture diagrams in ASCII, failure handling, and test fixtures:\n\n```typescript\nclass PaymentProcessor {\n  async process(type: "card" | "crypto" | "wire", amount: number, accountId: string) {\n    if (type === "card") { await stripe.charge(amount); }\n    else if (type === "crypto") { await web3.transfer(amount); }\n    else { await bank.wire(amount); }\n  }\n}\n```',
  },
  {
    tier: 'high_alt',
    category: 'Distributed Systems & Proofs',
    label: 'Raft consensus formal specification and TLA+ safety proof',
    prompt: 'Provide a formal TLA+ specification for the Raft consensus algorithm leader election and log replication with dynamic cluster membership changes. Include the formal safety invariants, an inductive proof sketch for StateMachineSafety, and complete pseudocode handling network partitions, split votes, and Byzantine failure mitigations.',
  },
];

export default function PlaygroundPage() {
  const { state, send, reset } = useChat();
  const isLoading = state.status === 'classifying' || state.status === 'streaming';

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={`${styles.heroTitle} serif-heading`}>
            Intelligent Prompt Routing
          </h1>

          <p className={styles.heroDesc}>
            Evaluate prompt complexity in sub-5ms across a 12-signal heuristic vector. Route basic queries to high-throughput free models and reserve frontier models for multi-step reasoning.
          </p>
        </div>
      </section>

      <div className={`container ${styles.content}`}>
        <div className={styles.left}>
          <PromptInput
            onSubmit={send}
            isLoading={isLoading}
            requestsRemaining={state.requestsRemaining}
          />

          {state.status !== 'idle' && (
            <div className={styles.toolbar}>
              <button
                type="button"
                className={`btn btn-ghost ${styles.resetBtn}`}
                onClick={reset}
              >
                Clear input
              </button>
            </div>
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

        <div className={styles.right}>
          <RoutingViz status={state.status} metadata={state.metadata} />

          {state.status === 'idle' && (
            <div className={`card ${styles.benchmarksCard}`}>
              <div className={styles.benchmarksHeader}>
                <span className={styles.benchmarksTitle}>Benchmark Scenarios</span>
              </div>
              <div className={styles.benchmarkList}>
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    className={styles.benchmarkBtn}
                    onClick={() => send(ex.prompt)}
                  >
                    <div className={styles.benchmarkTop}>
                      <span className={`tier-badge ${ex.tier}`}>{ex.tier}</span>
                      <span className={styles.benchmarkCategory}>{ex.category}</span>
                    </div>
                    <span className={styles.benchmarkLabel}>{ex.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
