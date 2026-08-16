# Token Pilot

> **Intelligent Prompt Router & Cost Optimizer for Large Language Models**

Token Pilot evaluates prompt complexity across a 12-signal heuristic vector in under 5ms, routing simple and utility queries to high-throughput, low-cost models while reserving expensive frontier models for complex multi-step reasoning.

---

## Highlights

- **Sub-5ms Classification**: Zero-latency heuristic scoring engine extracts structural, syntactic, and semantic signals without calling an LLM for classification.
- **Up to 80%+ Cost Reduction**: Automatically pairs query complexity with the most cost-effective model tier instead of routing all traffic to expensive frontier models.
- **Drop-in OpenAI SDK Compatibility**: Exposes standard `/v1/chat/completions` with full SSE streaming and metadata extensions.
- **BYOK (Bring Your Own Key) Support**: Supports custom user-provided API keys for OpenAI, Anthropic, DeepSeek, Google AI Studio, and Groq with strict client and server format validation.
- **Real-Time Financial Telemetry**: In-flight token calculation and asynchronous Drizzle ORM logging compute exact dollar savings against a GPT-4o frontier baseline.
- **Monorepo Architecture**: Clean separation between NestJS gateway, shared pure TypeScript classifier package, and Next.js 15 App Router web interface.

---

## Architecture Overview

```
                        +-----------------------------------------+
                        |           Incoming Prompt Request       |
                        +-----------------------------------------+
                                             |
                                             v
                        +-----------------------------------------+
                        |  Feature Extractor (12-Signal Vector)   |
                        |  - Token count & sentence length        |
                        |  - Code blocks & structural depth       |
                        |  - Reasoning keywords & constraints     |
                        |  - Domain terminology & hit density     |
                        +-----------------------------------------+
                                             |
                                             v
                        +-----------------------------------------+
                        |       Linear Scoring Engine (<5ms)      |
                        |       Score in [0.000, 1.000]           |
                        +-----------------------------------------+
                                             |
            +----------------+---------------+----------------+----------------+
            | (< 0.25)       | (0.25 - 0.55) | (0.55 - 0.85)  | (> 0.85)       |
            v                v               v                v                v
     +--------------+ +--------------+ +---------------+ +---------------+
     |   Tier: LOW  | | Tier: MEDIUM | |  Tier: HIGH   | | Tier: HIGH_ALT|
     |   Groq       | | Google       | |  OpenAI       | | Anthropic     |
     |   Llama 3.3  | | Gemini Flash | |  GPT-4o       | | Claude Opus   |
     |   (Free/Low) | | (Low Cost)   | |  (Frontier)   | | (Complex Rea.)|
     +--------------+ +--------------+ +---------------+ +---------------+
            |                |               |                |
            +----------------+---------------+----------------+
                                     |
                                     v
                        +-----------------------------------------+
                        |       Provider Adapter Execution        |
                        |       - Streaming SSE or JSON           |
                        |       - Retry logic with backoff        |
                        +-----------------------------------------+
                                     |
                                     v
                        +-----------------------------------------+
                        |      Async Telemetry & Cost Engine      |
                        |      - Exact token usage & dollar delta |
                        |      - request_logs in Supabase/Postgres|
                        +-----------------------------------------+
```

---

## Monorepo Structure

```text
token-pilot/
├── packages/
│   └── classifier/           # Shared pure TypeScript feature extractor & scoring engine
│       ├── src/
│       │   ├── feature-extractor.ts
│       │   ├── scoring-engine.ts
│       │   └── types.ts
│       └── package.json
├── src/                      # NestJS Gateway Backend (port 3000)
│   ├── auth/                 # API Key authentication guard
│   ├── classifier/           # Gateway classifier service wrapper
│   ├── database/             # Drizzle ORM schema & Supabase Postgres connection
│   ├── logger/               # Async request logger & cost delta calculator
│   ├── providers/            # Adapters (Groq, Google, OpenAI, Anthropic, DeepSeek, Mock)
│   ├── rate-limiter/         # Sliding-window IP rate limiting guard
│   ├── router/               # Core routing service, controller, and validation pipes
│   ├── shared/               # Cost registry, token estimators, and shared types
│   └── main.ts               # Gateway bootstrap
├── web/                      # Next.js 15 App Router Frontend (port 3001)
│   ├── app/                  # Route handlers and pages (Playground, Dashboard, Config)
│   ├── components/           # UI components with OKLCH design system
│   │   ├── config/           # Key management, weights, thresholds, provider health
│   │   ├── dashboard/        # Hero metrics, timeseries savings, latency charts
│   │   └── playground/       # Prompt input, routing viz, cost comparison, rate limit bar
│   └── lib/                  # State management (Zustand/Context), hooks, and API clients
├── Dockerfile                # Production multi-stage Docker build
├── drizzle.config.ts         # Drizzle migration configuration
├── package.json              # Monorepo root with npm workspaces
└── vitest.config.ts          # Vitest unit test suite configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: Supabase or any standard PostgreSQL instance

---

### Installation

Clone the repository and install all monorepo dependencies:

```bash
git clone https://github.com/abrhamyalew/Token-Pilot.git
cd Token-Pilot
npm ci
```

Building the shared classifier package happens automatically during `prepare` and `pretest` lifecycle steps.

---

### Environment Configuration

#### 1. Gateway Backend (`.env`)

Copy `.env.example` in the project root:

```bash
cp .env.example .env
```

Configure your secrets:

```env
# Database (Postgres connection string)
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres

# Server-side provider keys (used for preset demo mode)
GROQ_API_KEY=gsk_your_groq_key
GOOGLE_API_KEY=AIzayour_google_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
DEEPSEEK_API_KEY=sk-your_deepseek_key

# Gateway authentication (required for production)
API_KEY=your_secret_gateway_api_key

# Rate limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=3600000

# Proxy & Port
PORT=3000
NODE_ENV=development
```

#### 2. Web Frontend (`web/.env.local`)

Copy `.env.local.example` inside `web/`:

```bash
cp web/.env.local.example web/.env.local
```

```env
GATEWAY_URL=http://localhost:3000
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
```

---

### Database Setup

Push the Drizzle ORM schema to your PostgreSQL database:

```bash
npm run db:push
```

To view the database in Drizzle Studio:

```bash
npm run db:studio
```

---

### Running in Development

Run both the Gateway backend (port 3000) and the Next.js frontend (port 3001):

**Terminal 1 (Backend Gateway):**
```bash
npm run dev
```

**Terminal 2 (Frontend Interface):**
```bash
cd web
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Testing

Run the full Vitest unit and integration test suite:

```bash
npm test
```

Run test coverage:

```bash
npm run test:coverage
```

---

## Production Build & Docker

### Local Monorepo Build

```bash
# Builds classifier package and NestJS gateway
npm run build

# Builds Next.js frontend
cd web && npm run build
```

### Docker Container

Build and run the production gateway container:

```bash
docker build -t token-pilot .
docker run -p 3000:3000 --env-file .env token-pilot
```

---

## API Reference

### 1. Route Prompt (`POST /v1/chat/completions`)

OpenAI-compatible chat completion endpoint.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <API_KEY>` (when API_KEY is set)

**Request Body:**
```json
{
  "model": "auto",
  "messages": [
    { "role": "user", "content": "Write a TypeScript debounce utility function." }
  ],
  "stream": true,
  "user_api_keys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  }
}
```

**Response Extension (Metadata):**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "llama-3.3-70b-versatile",
  "choices": [...],
  "routing": {
    "tier": "low",
    "score": 0.185,
    "confidence": 0.92,
    "model": "llama-3.3-70b-versatile",
    "provider": "groq",
    "actual_cost": 0.000021,
    "frontier_cost": 0.002500,
    "savings": 0.002479,
    "latency_ms": 320
  }
}
```

### 2. Gateway Health (`GET /health`)

Returns operational status and availability of configured upstream provider gateways.

### 3. Analytics Endpoints

- `GET /api/stats/summary` - Aggregate metrics (total requests, dollars saved, savings percentage, tier distribution)
- `GET /api/stats/recent?limit=25` - Recent request telemetry log
- `GET /api/stats/timeseries?days=7` - Daily request volume and financial savings curve

---
