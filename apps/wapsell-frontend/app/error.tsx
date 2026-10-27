'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>Error</h1>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '24px' }}>Algo salió mal</p>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#D97757',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
