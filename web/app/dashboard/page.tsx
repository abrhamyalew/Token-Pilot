import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getStatsSummary, getRecentRequests, getTimeseries } from '@/lib/api';
import { HeroMetrics } from '@/components/dashboard/HeroMetrics';
import { SavingsChart } from '@/components/dashboard/SavingsChart';
import { TierDonut } from '@/components/dashboard/TierDonut';
import { LatencyBars } from '@/components/dashboard/LatencyBars';
import { RequestTable } from '@/components/dashboard/RequestTable';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Routing Analytics',
  description: 'Real-time overview of prompt classification volume, cost savings, and tier utilization.',
};

export const revalidate = 30;

export default async function DashboardPage() {
  const [summary, recent, timeseries] = await Promise.all([
    getStatsSummary().catch(() => null),
    getRecentRequests(25).catch(() => []),
    getTimeseries(7).catch(() => []),
  ]);

  const noData = !summary || summary.totalRequests === 0;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={`${styles.title} serif-heading`}>Routing Analytics</h1>
            <p className={styles.subtitle}>
              Aggregate statistics on classification volume, financial savings, and model distribution.
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.refreshTag}>
              <span>Auto-refresh · 30s</span>
            </div>
            <Link href="/" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
              Open Playground
            </Link>
          </div>
        </div>

        {noData ? (
          <EmptyState />
        ) : (
          <div className={styles.dashboardContent}>
            {/* Hero Metrics Bento Grid */}
            <Suspense fallback={<div style={{ height: 96, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }} />}>
              {summary && <HeroMetrics summary={summary} />}
            </Suspense>

            {/* Charts Row: Timeseries & Tier Donut */}
            <div className={styles.chartsRow}>
              <div className={styles.chartMain}>
                <SavingsChart data={timeseries} />
              </div>
              <div className={styles.chartSide}>
                {summary && <TierDonut tierBreakdown={summary.tierBreakdown} />}
              </div>
            </div>

            {/* Latency Comparison */}
            <div className={styles.latencyRow}>
              <LatencyBars requests={recent} />
            </div>

            {/* Requests Table */}
            <RequestTable requests={recent} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={`card ${styles.emptyState}`}>
      <h2 className={`${styles.emptyTitle} serif-heading`}>No request data recorded</h2>
      <p className={styles.emptyDesc}>
        Submit prompts in the Playground to generate telemetry logs, financial comparisons, and tier distribution curves.
      </p>
      <Link href="/" className="btn btn-primary">
        Go to Playground
      </Link>
    </div>
  );
}
