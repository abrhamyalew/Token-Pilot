'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>!</div>
        <h2 style={styles.title}>Something went wrong</h2>
        <p style={styles.message}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <code style={styles.digest}>Error ID: {error.digest}</code>
        )}
        <button onClick={reset} style={styles.button}>
          Try Again
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
    minHeight: '60vh',
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
  icon: {
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
    margin: '0 0 16px',
    fontSize: '14px',
    color: 'oklch(0.430 0.012 80)',
    lineHeight: 1.5,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  digest: {
    display: 'block',
    margin: '0 0 20px',
    fontSize: '11px',
    color: 'oklch(0.560 0.012 80)',
    fontFamily: "'JetBrains Mono', monospace",
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
