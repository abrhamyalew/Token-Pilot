/**
 * Drizzle ORM schema - Supabase Postgres.
 *
 * Tables:
 *   - request_logs: every routed request with classification, cost, and timing data
 *   - daily_stats:  pre-aggregated daily metrics for the dashboard
 */

import {
  pgTable,
  uuid,
  timestamp,
  text,
  integer,
  real,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const requestLogs = pgTable(
  'request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    // Request metadata: prompt stored in plain text (users informed via consent banner)
    promptText: text('prompt_text').notNull(),
    promptLength: integer('prompt_length').notNull(),

    // Classification
    tier: text('tier').notNull(),
    classifier: text('classifier').notNull(),
    confidence: real('confidence'),
    features: jsonb('features'),
    reasoning: text('reasoning'),
    classifyLatencyMs: integer('classify_latency_ms'),

    // Execution
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    status: text('status').notNull(),

    // Cost
    actualCost: real('actual_cost').notNull(),
    frontierCost: real('frontier_cost').notNull(),

    // Escalation / fallback tracking
    escalatedFrom: text('escalated_from'),
    escalationReason: text('escalation_reason'),
    fallbackFrom: text('fallback_from'),
    fallbackReason: text('fallback_reason'),
  },
  (table) => [
    index('idx_logs_created').on(table.createdAt),
    index('idx_logs_tier').on(table.tier),
    index('idx_logs_provider').on(table.provider),
  ],
);
// Type helpers for insert/select
export type RequestLog = typeof requestLogs.$inferSelect;
export type NewRequestLog = typeof requestLogs.$inferInsert;

