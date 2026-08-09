/**
 * Feature Extractor — extracts 10 signal dimensions from a raw prompt.
 *
 * This runs BEFORE any LLM call, so it uses only heuristics and regex.
 * Token count is approximated (words × 1.3) to avoid a tokenizer dependency.
 */

import { PromptFeatures } from '../shared/types';

// ─── Keyword Lists ──────────────────────────────────────────────────────────

const REASONING_KEYWORDS = [
  'prove', 'explain why', 'step-by-step', 'step by step',
  'analyze', 'evaluate', 'compare and contrast', 'think through',
  'reason about', 'derive', 'what are the implications', 'critically',
  'debate', 'argue', 'refactor', 'optimize', 'architect',
  'design pattern', 'trade-off', 'tradeoff', 'pros and cons',
  'deep dive', 'in-depth', 'comprehensive analysis',
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
];

const DOMAIN_TERMS = [
  'algorithm', 'complexity', 'asymptotic', 'polymorphism', 'inheritance',
  'kubernetes', 'microservice', 'docker', 'api', 'oauth', 'jwt',
  'neural network', 'gradient descent', 'backpropagation', 'transformer',
  'sql', 'nosql', 'index', 'transaction', 'isolation level',
  'tcp', 'udp', 'http', 'websocket', 'grpc', 'protobuf',
  'mutex', 'semaphore', 'deadlock', 'race condition', 'concurrency',
  'encryption', 'hashing', 'certificate', 'tls', 'ssl',
  'regression', 'classification', 'clustering', 'embedding',
];

// ─── Extractor ──────────────────────────────────────────────────────────────

export function extractFeatures(prompt: string): PromptFeatures {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/).filter((w) => w.length > 0);
  const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const tokenCount = Math.ceil(words.length * 1.3);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = tokenCount / sentenceCount;
  const questionCount = (prompt.match(/\?/g) || []).length;
  const codeBlockPresent =
    /```[\s\S]*?```/.test(prompt) || /`[^`]+`/.test(prompt);

  const reasoningKeywords = countKeywords(lower, REASONING_KEYWORDS);
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
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countKeywords(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    // Use word-boundary-safe matching for single words,
    // simple indexOf for multi-word phrases
    if (kw.includes(' ')) {
      let idx = 0;
      while ((idx = text.indexOf(kw, idx)) !== -1) {
        count++;
        idx += kw.length;
      }
    } else {
      const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) count += matches.length;
    }
  }
  return count;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
