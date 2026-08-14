/**
 * Gateway API client — typed fetch wrapper for all gateway endpoints.
 * Used by both Next.js API routes (server-side) and the playground hook (client-side SSE).
 */

const GATEWAY_URL =
  process.env.GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StatsSummary {
  totalRequests: number;
  totalActualCost: number;
  totalFrontierCost: number;
  totalSaved: number;
  savingsPercent: number;
  avgLatencyMs: number;
  tierBreakdown: Record<string, number>;
}

export interface RecentRequest {
  id: string;
  createdAt: string;
  promptText: string;
  promptLength: number;
  tier: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: string;
  actualCost: number;
  frontierCost: number;
  confidence: number | null;
  features: unknown;
}

export interface TimeseriesPoint {
  date: string;
  requests: number;
  actualCost: number;
  frontierCost: number;
  saved: number;
}

// ─── API functions ───────────────────────────────────────────────────────────

async function fetchGateway<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    next: { revalidate: 30 }, // ISR: revalidate every 30s
  });
  if (!res.ok) {
    throw new Error(`Gateway error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getStatsSummary(): Promise<StatsSummary> {
  return fetchGateway<StatsSummary>('/api/stats/summary');
}

export async function getRecentRequests(limit = 20): Promise<RecentRequest[]> {
  return fetchGateway<RecentRequest[]>(`/api/stats/recent?limit=${limit}`);
}

export async function getTimeseries(days = 7): Promise<TimeseriesPoint[]> {
  return fetchGateway<TimeseriesPoint[]>(`/api/stats/timeseries?days=${days}`);
}

export async function getHealth(): Promise<{ status: string; providers: Record<string, boolean> }> {
  return fetchGateway('/health');
}

/** Returns the base gateway URL for client-side SSE streaming */
export function getGatewayUrl(): string {
  return process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';
}
