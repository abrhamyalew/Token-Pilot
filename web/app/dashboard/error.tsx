'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  const isGatewayDown =
    error.message?.includes('fetch') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch');

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={isGatewayDown ? styles.iconOffline : styles.iconError}>
          {isGatewayDown ? '~' : '!'}
        </div>
        <h2 style={styles.title}>
          {isGatewayDown ? 'Gateway Offline' : 'Dashboard Error'}
        </h2>
        <p style={styles.message}>
          {isGatewayDown
            ? 'The gateway is not responding. Check that the backend is running on port 3001.'
            : error.message || 'Something went wrong loading the dashboard.'}
        </p>
        <button onClick={reset} style={styles.button}>
          Retry
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    padding: '24px',
  },
  card: {
    textAlign: 'center' as const,
    maxWidth: '420px',
    padding: '48px 32px',
    borderRadius: '14px',
    border: '1px solid oklch(0.920 0.006 80)',
    background: 'oklch(1.000 0.000 0)',
    boxShadow: '0 1px 3px oklch(0.180 0.008 80 / 0.04)',
  },
  iconOffline: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    borderRadius: '50%',
    background: 'oklch(0.955 0.035 225)',
    color: 'oklch(0.400 0.120 225)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: 1,
  },
  iconError: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    borderRadius: '50%',
    background: 'oklch(0.955 0.060 25)',
    color: 'oklch(0.450 0.150 25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: 1,
  },
  title: {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 700,
    color: 'oklch(0.180 0.008 80)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  message: {
    margin: '0 0 20px',
    fontSize: '14px',
    color: 'oklch(0.430 0.012 80)',
    lineHeight: 1.5,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  button: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: '1px solid oklch(0.920 0.006 80)',
    background: 'oklch(0.180 0.008 80)',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
