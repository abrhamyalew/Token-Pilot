'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h2 style={styles.title}>Critical Error</h2>
            <p style={styles.message}>
              The application encountered a fatal error and could not recover.
            </p>
            {error.digest && (
              <code style={styles.digest}>Error ID: {error.digest}</code>
            )}
            <button onClick={reset} style={styles.button}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    background: '#fafaf9',
  },
  card: {
    textAlign: 'center' as const,
    maxWidth: '420px',
    padding: '48px 32px',
    borderRadius: '14px',
    border: '1px solid #e5e5e3',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  icon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    borderRadius: '50%',
    background: '#fde8e8',
    color: '#b91c1c',
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
    color: '#1a1a18',
  },
  message: {
    margin: '0 0 16px',
    fontSize: '14px',
    color: '#64645e',
    lineHeight: 1.5,
  },
  digest: {
    display: 'block',
    margin: '0 0 20px',
    fontSize: '11px',
    color: '#8a8a84',
    fontFamily: "monospace",
  },
  button: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: '1px solid #e5e5e3',
    background: '#1a1a18',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
