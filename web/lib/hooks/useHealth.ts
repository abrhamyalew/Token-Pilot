'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface HealthState {
  status: string;
  providers?: Record<string, boolean>;
}

export function useHealth(initialHealth: HealthState | null = null, pollIntervalMs = 60000) {
  const [health, setHealth] = useState<HealthState | null>(initialHealth);
  const [loading, setLoading] = useState(initialHealth === null);
  const initialRef = useRef(initialHealth);

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

    if (initialRef.current === null) {
      fetchHealth();
    }

    if (pollIntervalMs > 0) {
      const interval = setInterval(() => {
        if (active) {
          fetchHealth();
        }
      }, pollIntervalMs);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }

    return () => {
      active = false;
    };
  }, [pollIntervalMs, fetchHealth]);

  return { health, loading, refetch: fetchHealth };
}
