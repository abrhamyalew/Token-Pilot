/**
 * Feature Extractor — extracts 10 signal dimensions from a raw prompt.
 *
 * This runs BEFORE any LLM call, so it uses only heuristics and regex.
 * Token count is approximated (words × 1.3) to avoid a tokenizer dependency.
 *
 * Zero NestJS dependencies — importable by both the gateway and the frontend.
 */

import { PromptFeatures } from './types';

// ─── Keyword Lists ──────────────────────────────────────────────────────────

// Strong reasoning signals — multi-word phrases that reliably indicate complex reasoning
const STRONG_REASONING_KEYWORDS = [
  'explain why', 'step-by-step', 'step by step',
  'compare and contrast', 'think through', 'reason about',
  'what are the implications', 'comprehensive analysis',
  'design pattern', 'trade-off', 'tradeoff', 'pros and cons',
  'deep dive', 'in-depth', 'critically analyze',
  'formally prove', 'derive from', 'systematically',
];

// Weak reasoning signals — ambiguous single words that CAN indicate reasoning
// but often appear in simple prompts too. Counted at half weight.
const WEAK_REASONING_KEYWORDS = [
  'prove', 'analyze', 'evaluate', 'derive', 'critically',
  'debate', 'argue', 'refactor', 'optimize', 'architect',
];

const SIMPLE_KEYWORDS = [
  'summarize', 'list', 'translate', 'format', 'convert',
  'extract', 'define', 'what is', 'give me', 'show me',
  'hello', 'hi', 'thanks', 'thank you', 'help me write',
  'rewrite', 'fix grammar', 'fix spelling', 'correct',
  'tldr', 'tl;dr', 'brief', 'short answer',
];

const CONSTRAINT_KEYWORDS = [
  'must', 'do not', "don't", 'only', 'exactly', 'never',
  'always', 'required', 'mandatory', 'forbidden', 'ensure',
  'strictly', 'precisely', 'no more than', 'at least',
  'between', 'maximum', 'minimum', 'limit',
  'under', 'per', 'each', 'within', 'across',
  'include', 'cover', 'address', 'support',
];

// Expanded domain terms — covers CS, security, crypto, law, finance, bio, physics, academic
const DOMAIN_TERMS = [
  // CS & Engineering — core
  'algorithm', 'complexity', 'asymptotic', 'polymorphism', 'inheritance',
  'kubernetes', 'microservice', 'docker', 'api', 'oauth', 'jwt',
  'neural network', 'gradient descent', 'backpropagation', 'transformer',
  'sql', 'nosql', 'index', 'transaction', 'isolation level',
  'tcp', 'udp', 'http', 'websocket', 'grpc', 'protobuf',
  'mutex', 'semaphore', 'deadlock', 'race condition', 'concurrency',
  'encryption', 'hashing', 'certificate', 'tls', 'ssl',
  'regression', 'classification', 'clustering', 'embedding',
  // CS — languages, frameworks, common concepts
  'python', 'javascript', 'typescript', 'react', 'node.js', 'golang',
  'rust', 'java', 'component', 'function', 'class', 'schema',
  'frontend', 'backend', 'middleware', 'pipeline', 'deployment',
  'ci/cd', 'monorepo', 'graphql', 'rest api',
  // CS — formal verification & concurrency theory
  'linearizable', 'lock-free', 'wait-free', 'invariant',
  'formal proof', 'formal verification', 'correctness proof',
  'abstract interpretation', 'type system', 'typing judgment',
  'soundness', 'completeness', 'decidability', 'undecidable',
  // CS — formal methods & theorem provers
  'coq', 'lean', 'isabelle', 'tla+', 'temporal logic',
  'operational semantics', 'denotational semantics', 'bisimulation',
  'machine-checked proof', 'formal specification',
  // Distributed systems & consensus
  'byzantine', 'consensus', 'finality', 'liveness', 'safety',
  'proof of stake', 'proof of work', 'replication', 'quorum',
  'crdt', 'conflict-free', 'saga', 'event sourcing', 'idempotent',
  'exactly-once', 'at-least-once', 'partition tolerance',
  // Security & cryptography
  'reentrancy', 'smart contract', 'solidity', 'vulnerability',
  'zero-knowledge', 'zkp', 'zk-snark', 'zk-stark', 'plonk', 'groth16',
  'lattice', 'post-quantum', 'ring-lwe', 'homomorphic',
  'pkce', 'openid connect', 'mtls', 'zero-trust',
  'front-running', 'overflow', 'underflow',
  // DevOps & infrastructure
  'istio', 'service mesh', 'ebpf', 'cilium', 'envoy',
  'helm', 'terraform', 'vault', 'ingress', 'egress',
  'blue-green', 'canary', 'rollback', 'health check',
  // Data engineering
  'kafka', 'flink', 'spark', 'iceberg', 'parquet',
  'schema evolution', 'exactly-once processing', 'backpressure',
  'stream processing', 'batch processing', 'data lake',
  // Graphics & shaders
  'shader', 'glsl', 'webgl', 'vulkan', 'raymarching',
  'fragment shader', 'vertex shader', 'rasterization',
  // JVM & Spring ecosystem
  'spring boot', 'heap dump', 'jvm', 'garbage collector',
  'threadlocal', 'classloader', 'bytecode',
  // Game theory & mechanism design
  'game theory', 'incentive-compatible', 'nash equilibrium',
  'mechanism design', 'auction theory', 'revelation principle',
  'dominant strategy', 'social welfare', 'allocative efficiency',
  // Crypto-economics & blockchain
  'mev', 'proposer-builder', 'mempool', 'sequencer',
  'quadratic voting', 'governance', 'staking',
  // Law
  'jurisdiction', 'tort', 'liability', 'precedent', 'statute',
  'constitutional', 'due process', 'amendment', 'plaintiff', 'defendant',
  'fair use', 'compliance', 'regulatory',
  // Finance
  'amortization', 'derivative', 'equity', 'arbitrage', 'hedging',
  'portfolio', 'volatility', 'liquidity', 'yield curve', 'securitization',
  // Biology & Medicine
  'mitosis', 'phenotype', 'crispr', 'genomics', 'pathology',
  'pharmacokinetics', 'contraindication', 'immunology', 'metabolism',
  'epidemiology', 'biomarker', 'protein folding',
  // Physics & Math
  'thermodynamics', 'quantum', 'entropy', 'eigenstate', 'hamiltonian',
  'topology', 'differential equation', 'fourier', 'laplacian',
  'sobolev', 'navier-stokes', 'error correction', 'surface code',
  'depolarizing', 'fault-tolerant', 'threshold theorem',
  // Philosophy & cognitive science
  'ontological', 'epistemic', 'emergence', 'autopoiesis',
  'incompleteness', 'computability',
  // Statistics & econometrics
  'causal inference', 'instrumental variable', 'synthetic control',
  'treatment effect', 'estimator', 'asymptotic properties',
  'double machine learning', 'propensity score',
  // General Academic
  'meta-analysis', 'longitudinal study', 'falsifiable', 'peer-reviewed',
  'empirical', 'hypothesis', 'methodology', 'correlation', 'causation',
  'formalization', 'taxonomy', 'framework',
];

// ─── Extractor ──────────────────────────────────────────────────────────────

export function extractFeatures(
  prompt: string,
  hasSystemPrompt: boolean = false,
  multiTurnCount: number = 1,
): PromptFeatures {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/).filter((w) => w.length > 0);
  const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const tokenCount = Math.ceil(words.length * 1.3);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = tokenCount / sentenceCount;
  const questionCount = (prompt.match(/\?/g) || []).length;

  // Graduated code scoring: 0.0 → 1.0 based on code presence and volume
  const fencedBlocks = prompt.match(/```[\s\S]*?```/g) || [];
  const hasInlineCode = /`[^`]+`/.test(prompt);
  let codeBlockPresent = 0.0;
  if (fencedBlocks.length >= 2) {
    codeBlockPresent = 1.0;
  } else if (fencedBlocks.length === 1) {
    const blockLines = fencedBlocks[0].split('\n').length;
    codeBlockPresent = blockLines >= 10 ? 1.0 : 0.7;
  } else if (hasInlineCode) {
    codeBlockPresent = 0.3;
  }

  // Reasoning: strong phrases count fully, weak (ambiguous) words at half weight
  const strongHits = countKeywords(lower, STRONG_REASONING_KEYWORDS);
  const weakHits = countKeywords(lower, WEAK_REASONING_KEYWORDS);
  const reasoningKeywords = strongHits + weakHits * 0.5;
  const simpleKeywords = countKeywords(lower, SIMPLE_KEYWORDS);
  const constraintCount = countKeywords(lower, CONSTRAINT_KEYWORDS);

  // Structural depth: headers, bullets, XML tags, numbered lists
  const headers = (prompt.match(/^#{1,6}\s/gm) || []).length;
  const bullets = (prompt.match(/^\s*[-*]\s/gm) || []).length;
  const numberedItems = (prompt.match(/^\s*\d+[.)]\s/gm) || []).length;
  const xmlTags = (prompt.match(/<\/?[a-zA-Z][^>]*>/g) || []).length;
  const structuralDepth = headers + bullets + numberedItems + xmlTags;

  // Domain term density
  const domainHits = countKeywords(lower, DOMAIN_TERMS);
  const domainTermDensity = words.length > 0 ? domainHits / words.length : 0;

  // Formal / academic language score
  const FORMAL_SIGNALS = [
    'formally prove', 'formally verify', 'formal proof', 'formal specification',
    'formal verification', 'formal mathematical', 'machine-checked proof',
    'derive the', 'derive a', 'derivation of', 'mathematically derive',
    'proof of', 'prove the', 'prove that', 'prove correctness',
    'theorem', 'axiom', 'lemma', 'corollary',
    'rigorous', 'rigorously', 'mathematically rigorous',
    'asymptotic properties', 'complexity bounds', 'complexity proof',
    'necessary and sufficient', 'without loss of generality',
    'comparative legal analysis', 'methodological evaluation',
    'mathematical foundations', 'mathematical comparison',
    'game-theoretic', 'game theoretic', 'incentive-compatible',
    'correctness and liveness', 'safety and liveness',
    'error correction threshold', 'threshold theorem',
    'causal inference', 'treatment effect',
  ];
  let formalLanguageScore = 0;
  for (const signal of FORMAL_SIGNALS) {
    if (lower.includes(signal)) {
      formalLanguageScore++;
    }
  }

  return {
    tokenCount,
    sentenceCount,
    avgSentenceLength,
    questionCount,
    codeBlockPresent,
    reasoningKeywords,
    simpleKeywords,
    constraintCount,
    structuralDepth,
    domainTermDensity,
    domainHitCount: domainHits,
    formalLanguageScore,
    systemPrompt: hasSystemPrompt,
    multiTurnCount,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const NEGATION_WORDS = [
  "don't", 'do not', 'not', 'no need to', 'without',
  'never', 'avoid', 'skip', "doesn't", 'does not',
  "won't", 'will not', "isn't", 'is not',
];

/**
 * Count keyword occurrences in text with negation awareness.
 * - Single words: exact word-boundary match
 * - Multi-word phrases: flexible regex allowing up to 3 intervening words
 * - Negation: if a negation word appears within ~40 chars before the match,
 *   the hit decrements instead of incrementing (floor-clamped to 0).
 */
function countKeywords(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    let regex: RegExp;
    if (kw.includes(' ')) {
      const parts = kw.split(/\s+/).map(escapeRegex);
      const pattern = parts.join('\\s+(?:\\S+\\s+){0,3}');
      regex = new RegExp(pattern, 'gi');
    } else {
      regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi');
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (isNegated(text, match.index)) {
        count = Math.max(0, count - 1);
      } else {
        count++;
      }
    }
  }
  return count;
}

function isNegated(text: string, matchIndex: number): boolean {
  const windowStart = Math.max(0, matchIndex - 40);
  const window = text.substring(windowStart, matchIndex).toLowerCase();
  return NEGATION_WORDS.some((neg) => window.includes(neg));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
