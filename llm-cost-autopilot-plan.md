# LLM Cost Autopilot — Implementation Plan

A GitHub portfolio project: an addon that sits in front of multiple LLM providers, classifies how complex an incoming request is, and routes it to the cheapest model capable of handling it well.

---

## 1. The Problem

Frontier and budget LLMs are priced roughly 100x apart per token. Most real-world prompts (formatting, extraction, simple Q&A) don't need frontier-level reasoning, but naive integrations send every request to the same model regardless of difficulty. If a system can reliably tell which requests actually need the expensive model, the rest can be routed to something far cheaper with little to no quality loss.

## 2. Goal

This is **not** a SaaS or paid service. It's a GitHub project built to demonstrate engineering skill: systems design, provider integration, and applied ML/evaluation rigor. Success looks like a working, honestly-evaluated demo with a defensible number behind it ("X% cost reduction at Y% quality retained"), not a commercial product.

## 3. How It Works (Architecture)

```
User prompt
    │
    ▼
[Classifier] ── scores difficulty (category or 1-10)
    │
    ▼
[Routing Policy] ── maps score → model tier
    │
    ├─ low      ──► cheap/free-tier model
    ├─ medium   ──► mid-tier model
    └─ high     ──► frontier model
    │
    ▼
[Provider Adapter] ── calls the actual API
    │
    ▼
Response ──► [Cost/Quality Logger] ──► back to user
    │
    └─ if confidence is low ──► escalate one tier up, retry
```

The classifier is the only genuinely hard part. Everything else is standard gateway/proxy plumbing.

## 4. Tech Stack

- **NestJS** — gateway/router service, TypeScript throughout
- **Postgres** — logs every request: prompt, model used, tokens, cost, latency
- **Next.js** — live demo UI + cost/routing dashboard
- Deployed on a free hosting tier (e.g. Render), with the caveat that free Postgres instances there expire after 30 days and need periodic renewal

## 5. The Classifier

The classifier only ever outputs a **tier label**, never a model name. Four approaches, used across phases:

1. **Rules** — word count, keyword triggers ("prove," "refactor" vs "summarize"). Fast, brittle.
2. **LLM-as-router** — a cheap, fast model scores incoming prompt difficulty before routing. No training data required.
3. **Trained classifier** — embeddings + logistic regression, or a small BERT-style model, trained on labeled (prompt → correct tier) pairs. Labels can be bootstrapped using a judge model over a public benchmark subset instead of hand-labeling.
4. **Confidence-based escalation** — if the cheap model's own answer looks low-confidence, automatically retry one tier up.

## 6. Tier-to-Model Configuration

The classifier decides a tier; a separate config resolves that tier to an actual model. This keeps model swaps a config change, not a code change:

```json
{
  "low":    { "model": "llama-3.3-70b", "provider": "groq" },
  "medium": { "model": "gemini-flash",  "provider": "google" },
  "high":   { "model": "gpt-5.5-pro",   "provider": "openai" }
}
```

API keys/secrets live in environment variables; the tier mapping itself lives in this config file so fallback models and per-model cost rates can be added later without touching classifier logic.

## 7. Interfaces

- **Primary: OpenAI-compatible HTTP endpoint.** Anyone integrating swaps their `baseURL` to point at the router and keeps every other line of their existing SDK code unchanged.
- **Live demo: Next.js web app.** A visitor pastes a prompt and immediately sees which model was picked, why, and the cost comparison versus always using the frontier model. This is the artifact most visitors actually engage with, worth deploying live rather than "clone to try."
- **CLI: optional, thin wrapper** around the same HTTP endpoint. Not a priority; adds little signal beyond the API and demo.
- Explicitly **not building** an IDE extension — real integration effort for no additional proof of the core skill being demonstrated.

## 8. Cost-Safe Public Demo Design

Constraint: no budget for API credits, and the demo must be safely left open to the public.

- **Live tiers use genuinely free providers.** Groq (free, rate-limited, open-source models, no credit card) and Google AI Studio's free tier power the low/medium tiers that actually execute in the public demo.
- **Frontier tier is estimate-only by default.** The demo shows "router would choose GPT-5.5-pro, estimated cost: $0.02" without making the real call, clearly labeled as an estimate rather than presented as a live response.
- **Optional BYOK unlock.** A visitor can paste their own API key to see a real frontier-tier call. The key is used in-memory for that request only and is never logged or persisted to Postgres.
- **Hard per-visitor rate limit** (e.g. 10 requests/hour by IP/session), enforced in the app itself, not relied on from the provider dashboard alone.
- **Tight `max_tokens` cap** on demo responses to bound worst-case cost per request.
- **Provider-side spend limit** kept on as a backup line of defense, understanding that enforcement isn't always instantaneous.

## 9. Usage Scenarios

- **Discover:** found via GitHub search or a portfolio link; the README leads with the cost/quality chart and a live demo link.
- **Try it:** open the demo, paste a prompt, watch the routing decision and cost comparison happen in real time. Zero setup.
- **Integrate:** clone the repo, add provider keys to `.env`, run it locally, point an existing app's `baseURL` at it. One line changed, rest of the calling code stays identical.
- **Extend:** fork the repo, drop a new file into `provider-adapters/` or `classifiers/` (both kept pluggable), run the eval script against the change to confirm no regression in the cost/quality numbers, open a PR. The eval harness doubles as the contribution gate.

## 10. Build Phases

**Phase 1 — Easy (plumbing):**
- NestJS gateway, one endpoint, forwards to a model and returns the response
- Wire up 2-3 real providers
- Rule-based router
- Log every call to Postgres (prompt, model, tokens, cost)

**Phase 2 — Medium (prove it's smarter than rules):**
- Build a 30-100 prompt eval set (reuse a public benchmark subset)
- Swap in the LLM-as-router classifier
- Run the eval set through both rules and classifier, score with a judge model, produce the cost-saved vs quality-retained number
- Next.js dashboard showing routing decisions and that chart

**Phase 3 — Hard (the differentiator):**
- Train a small classifier (embeddings + logistic regression, or small BERT) on bootstrapped labels
- Add confidence-based escalation
- Publish a side-by-side comparison chart: rules vs LLM-as-router vs trained classifier

Phase 1 alone is a working project. Phase 2 is what makes it stand out. Phase 3 is worth it only for going deep on the ML side specifically.

## 11. Further Reading

- RouteLLM paper (matrix factorization / Bradley-Terry routing): arxiv.org/abs/2406.18665
- Practical router architecture breakdown: openlegion.ai/en/learn/llm-routing
- Benchmark numbers by classifier type: neuraltrust.ai/blog/llm-model-routing
