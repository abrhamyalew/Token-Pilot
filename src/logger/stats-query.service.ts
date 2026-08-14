/**
 * Stats Query Service — aggregates request_logs data for the dashboard.
 *
 * All queries are read-only. Returns plain objects (no ORM wrappers)
 * so they're directly JSON-serialisable from the controller.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_TOKEN, Database } from '../database/database.module';
import { requestLogs } from '../database/schema';
import { sql, desc, gte } from 'drizzle-orm';

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

@Injectable()
export class StatsQueryService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async getSummary(): Promise<StatsSummary> {
    const rows = await this.db
      .select({
        totalRequests: sql<number>`count(*)::int`,
        totalActualCost: sql<number>`coalesce(sum(actual_cost), 0)`,
        totalFrontierCost: sql<number>`coalesce(sum(frontier_cost), 0)`,
        totalSaved: sql<number>`coalesce(sum(frontier_cost - actual_cost), 0)`,
        avgLatencyMs: sql<number>`coalesce(avg(latency_ms)::int, 0)`,
      })
      .from(requestLogs);

    const tierRows = await this.db
      .select({
        tier: requestLogs.tier,
        count: sql<number>`count(*)::int`,
      })
      .from(requestLogs)
      .groupBy(requestLogs.tier);

    const row = rows[0];
    const tierBreakdown: Record<string, number> = {};
    for (const t of tierRows) {
      tierBreakdown[t.tier] = t.count;
    }

    const totalSaved = Number(row.totalSaved);
    const totalFrontierCost = Number(row.totalFrontierCost);
    const savingsPercent =
      totalFrontierCost > 0 ? (totalSaved / totalFrontierCost) * 100 : 0;

    return {
      totalRequests: Number(row.totalRequests),
      totalActualCost: Number(row.totalActualCost),
      totalFrontierCost,
      totalSaved,
      savingsPercent,
      avgLatencyMs: Number(row.avgLatencyMs),
      tierBreakdown,
    };
  }

  async getRecent(limit: number = 20): Promise<RecentRequest[]> {
    const rows = await this.db
      .select()
      .from(requestLogs)
      .orderBy(desc(requestLogs.createdAt))
      .limit(Math.min(limit, 100));

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      promptText: r.promptText,
      promptLength: r.promptLength,
      tier: r.tier,
      model: r.model,
      provider: r.provider,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      latencyMs: r.latencyMs,
      status: r.status,
      actualCost: r.actualCost,
      frontierCost: r.frontierCost,
      confidence: r.confidence ?? null,
      features: r.features,
    }));
  }

  async getTimeseries(days: number = 7): Promise<TimeseriesPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - Math.min(days, 90));

    const rows = await this.db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        requests: sql<number>`count(*)::int`,
        actualCost: sql<number>`coalesce(sum(actual_cost), 0)`,
        frontierCost: sql<number>`coalesce(sum(frontier_cost), 0)`,
        saved: sql<number>`coalesce(sum(frontier_cost - actual_cost), 0)`,
      })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, since))
      .groupBy(sql`date_trunc('day', created_at)::date::text`)
      .orderBy(sql`date_trunc('day', created_at)::date::text`);

    return rows.map((r) => ({
      date: r.date,
      requests: Number(r.requests),
      actualCost: Number(r.actualCost),
      frontierCost: Number(r.frontierCost),
      saved: Number(r.saved),
    }));
  }
}
