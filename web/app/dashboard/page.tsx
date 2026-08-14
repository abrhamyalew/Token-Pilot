import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getStatsSummary, getRecentRequests, getTimeseries } from '@/lib/api';
import { HeroMetrics } from '@/components/dashboard/HeroMetrics';
import { SavingsChart } from '@/components/dashboard/SavingsChart';
import { TierDonut } from '@/components/dashboard/TierDonut';
import { LatencyBars } from '@/components/dashboard/LatencyBars';
import { RequestTable } from '@/components/dashboard/RequestTable';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Real-time analytics — cost savings, tier distribution, and request history.',
};

// Revalidate every 30 seconds
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
        {/* Page header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>
              Live analytics — refreshes every 30 seconds
            </p>
          </div>
          {summary && (
            <div className={styles.refreshBadge}>
              ISR · 30s cache
            </div>
          )}
        </div>

        {noData ? (
          <EmptyState />
        ) : (
          <>
            {/* Hero metrics */}
            <Suspense fallback={<div className="skeleton" style={{ height: 120 }} />}>
              {summary && <HeroMetrics summary={summary} />}
            </Suspense>

            {/* Charts row 1: Savings Over Time & Tier Donut */}
            <div className={styles.chartsRow}>
              <div className={styles.chartMain}>
                <SavingsChart data={timeseries} />
              </div>
              <div className={styles.chartSide}>
                {summary && <TierDonut tierBreakdown={summary.tierBreakdown} />}
              </div>
            </div>

            {/* Charts row 2: Latency distribution */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <LatencyBars requests={recent} />
            </div>

            {/* Request table */}
            <RequestTable requests={recent} />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📊</div>
      <h2>No data yet</h2>
      <p>
        Go to the <a href="/">Playground</a> and submit a few prompts — they&apos;ll appear here.
      </p>
    </div>
  );
}
