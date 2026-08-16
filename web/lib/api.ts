/**
 * Gateway API client - typed fetch wrapper for all server-side gateway endpoints.
 * Used by Next.js Server Components and API route handlers.
 */

import { getGatewayUrl } from './gateway-client';
export { getGatewayUrl };

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

export interface HealthResponse {
  status: string;
  providers: Record<string, boolean>;
}

// ─── Server API functions ───────────────────────────────────────────────────

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

export async function getHealth(): Promise<HealthResponse> {
  return fetchGateway<HealthResponse>('/health');
}
