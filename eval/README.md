# Token Pilot: Evaluation Benchmark Harness

This directory contains the automated evaluation framework comparing:
1. **Heuristic Rules Classifier** (12-signal feature vector scoring)
2. **LLM Classifier** (Gemini 3.6 Flash structured JSON schema)

---

## Benchmark Dataset

Located at `eval/prompts/eval-set.json`:
- **60 curated prompts** partitioned equally across 3 complexity tiers (20 Low, 20 Medium, 20 High).
- Covers programming, system design, theoretical CS, cryptography, translation, math, summarization, and data structures.

---

## Evaluation Scripts

| Command | Script | Description |
|:--------|:-------|:------------|
| `npm run eval` | `eval/scripts/run-eval.ts` | Runs prompts through both classifiers and records accuracy, confidence, and latency in `eval/results/comparison.json`. |
| `npm run eval:judge` | `eval/scripts/judge.ts` | Uses an LLM Judge to evaluate completion quality (accuracy, completeness, reasoning depth on a 1-5 scale) in `eval/results/scores.json`. |
| `npm run eval:chart` | `eval/scripts/chart.ts` | Computes the Cost vs Quality Pareto frontier and outputs an SVG chart in `eval/results/pareto.svg`. |
| `npm run eval:all` | - | Runs the complete evaluation, judge scoring, and chart generation in sequence. |

---

## Results Artifacts

- `eval/results/comparison.json`: Per-prompt classification decisions, latency, and match status.
- `eval/results/scores.json`: Quality ratings and aggregate scores.
- `eval/results/pareto.svg`: Vector Pareto frontier chart showing cost savings vs quality tradeoff.
