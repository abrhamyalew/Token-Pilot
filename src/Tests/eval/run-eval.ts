/**
 * Eval Runner — measures classifier accuracy against a labeled dataset.
 *
 * Usage:  npx ts-node eval/run-eval.ts
 *
 * Prints:
 *   - Per-tier accuracy (correct / total)
 *   - Confusion matrix
 *   - Overall accuracy
 *   - All misclassified prompts with scores and features
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractFeatures } from '../../classifier/feature-extractor';
import { scorePrompt } from '../../classifier/scoring-engine';
import { Tier } from '../../shared/types/classifier';

// ─── Types ─────────────────────────────────────────────────────────────────

interface EvalEntry {
  prompt: string;
  expectedTier: Tier;
  rationale: string;
}

interface EvalResult {
  index: number;
  prompt: string;
  expected: Tier;
  predicted: Tier;
  score: number;
  confidence: number;
  correct: boolean;
  rationale: string;
}

const TIERS: Tier[] = ['low', 'medium', 'high', 'high_alt'];

// ─── Main ──────────────────────────────────────────────────────────────────

function main(): void {
  // Load dataset
  const datasetPath = path.join(__dirname, 'eval-dataset.json');
  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const dataset: EvalEntry[] = JSON.parse(raw);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  TOKEN PILOT — Classifier Eval`);
  console.log(`  Dataset: ${dataset.length} prompts`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Run classifier on each prompt
  const results: EvalResult[] = dataset.map((entry, i) => {
    const features = extractFeatures(entry.prompt, false, 1);
    const { tier, score, confidence } = scorePrompt(features);

    return {
      index: i + 1,
      prompt: entry.prompt,
      expected: entry.expectedTier,
      predicted: tier,
      score,
      confidence,
      correct: tier === entry.expectedTier,
      rationale: entry.rationale,
    };
  });

  // ─── Per-Tier Accuracy ───────────────────────────────────────────────

  console.log('PER-TIER ACCURACY');
  console.log('─'.repeat(50));

  for (const tier of TIERS) {
    const tierResults = results.filter((r) => r.expected === tier);
    const correct = tierResults.filter((r) => r.correct).length;
    const total = tierResults.length;
    const pct = total > 0 ? ((correct / total) * 100).toFixed(1) : 'N/A';
    const bar = total > 0 ? '█'.repeat(Math.round((correct / total) * 20)) : '';
    console.log(
      `  ${tier.padEnd(10)} ${correct}/${total} (${pct}%)  ${bar}`,
    );
  }

  const totalCorrect = results.filter((r) => r.correct).length;
  const overallPct = ((totalCorrect / results.length) * 100).toFixed(1);
  console.log('─'.repeat(50));
  console.log(
    `  ${'OVERALL'.padEnd(10)} ${totalCorrect}/${results.length} (${overallPct}%)`,
  );

  // ─── Confusion Matrix ────────────────────────────────────────────────

  console.log(`\n\nCONFUSION MATRIX (rows = expected, cols = predicted)`);
  console.log('─'.repeat(60));

  // Header row
  const colWidth = 10;
  let header = ''.padEnd(colWidth);
  for (const t of TIERS) {
    header += t.padEnd(colWidth);
  }
  console.log(header);

  // Data rows
  for (const expected of TIERS) {
    let row = expected.padEnd(colWidth);
    for (const predicted of TIERS) {
      const count = results.filter(
        (r) => r.expected === expected && r.predicted === predicted,
      ).length;
      const cell = count > 0 ? String(count) : '·';
      row += cell.padEnd(colWidth);
    }
    console.log(row);
  }

  // ─── Misclassified Prompts ────────────────────────────────────────────

  const misclassified = results.filter((r) => !r.correct);

  if (misclassified.length > 0) {
    console.log(`\n\nMISCLASSIFIED PROMPTS (${misclassified.length})`);
    console.log('─'.repeat(70));

    for (const r of misclassified) {
      const truncated =
        r.prompt.length > 80 ? r.prompt.substring(0, 80) + '...' : r.prompt;
      console.log(
        `  #${String(r.index).padStart(2)} | expected: ${r.expected.padEnd(9)} | predicted: ${r.predicted.padEnd(9)} | score: ${r.score.toFixed(3)} | conf: ${r.confidence.toFixed(3)}`,
      );
      console.log(`       "${truncated}"`);
      console.log(`       Rationale: ${r.rationale}`);
      console.log();
    }
  } else {
    console.log('\n\n✅ All prompts classified correctly!');
  }

  // ─── Score Distribution ────────────────────────────────────────────────

  console.log(`\nSCORE DISTRIBUTION BY TIER`);
  console.log('─'.repeat(60));

  for (const tier of TIERS) {
    const tierResults = results.filter((r) => r.expected === tier);
    if (tierResults.length === 0) continue;

    const scores = tierResults.map((r) => r.score);
    const min = Math.min(...scores).toFixed(3);
    const max = Math.max(...scores).toFixed(3);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3);

    console.log(
      `  ${tier.padEnd(10)} min=${min}  avg=${avg}  max=${max}`,
    );
  }

  // ─── Exit Code ────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(70)}\n`);

  if (totalCorrect / results.length < 0.7) {
    console.log(
      `⚠️  Overall accuracy (${overallPct}%) is below the 70% target.`,
    );
    process.exit(1);
  } else {
    console.log(`✅ Overall accuracy: ${overallPct}%`);
    process.exit(0);
  }
}

main();
