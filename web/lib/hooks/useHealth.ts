'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HealthState {
  status: string;
  providers?: Record<string, boolean>;
}

export function useHealth(pollIntervalMs = 60000) {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'degraded' });
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    if (pollIntervalMs > 0) {
      const timer = setInterval(fetchHealth, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchHealth, pollIntervalMs]);

  return { health, loading, refetch: fetchHealth };
}
