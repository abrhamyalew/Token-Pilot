'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HealthState {
  status: string;
  providers?: Record<string, boolean>;
}

export function useHealth(initialHealth: HealthState | null = null, pollIntervalMs = 60000) {
  const [health, setHealth] = useState<HealthState | null>(initialHealth);
  const [loading, setLoading] = useState(initialHealth === null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
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
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/health');
        if (active) {
          if (res.ok) {
            const data = await res.json();
            setHealth(data);
          } else {
            setHealth({ status: 'degraded' });
          }
        }
      } catch {
        if (active) setHealth(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (initialHealth === null) {
      load();
    }

    if (pollIntervalMs > 0) {
      const interval = setInterval(load, pollIntervalMs);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }

    return () => {
      active = false;
    };
  }, [initialHealth, pollIntervalMs]);

  return { health, loading, refetch: fetchHealth };
}
