'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StatsSummary, RecentRequest, TimeseriesPoint } from '@/lib/api';

export function useStats(refreshIntervalMs = 30000) {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, recRes, timeRes] = await Promise.all([
        fetch('/api/stats/summary').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/stats/recent?limit=25').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/stats/timeseries?days=7').then((r) => (r.ok ? r.json() : [])),
      ]);
      setSummary(sumRes);
      setRecent(recRes);
      setTimeseries(timeRes);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sumRes, recRes, timeRes] = await Promise.all([
          fetch('/api/stats/summary').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/stats/recent?limit=25').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/stats/timeseries?days=7').then((r) => (r.ok ? r.json() : [])),
        ]);
        if (active) {
          setSummary(sumRes);
          setRecent(recRes);
          setTimeseries(timeRes);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError((err as Error).message ?? 'Failed to load stats');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    if (refreshIntervalMs > 0) {
      const interval = setInterval(load, refreshIntervalMs);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }

    return () => {
      active = false;
    };
  }, [refreshIntervalMs]);

  return { summary, recent, timeseries, loading, error, refetch: fetchAll };
}
