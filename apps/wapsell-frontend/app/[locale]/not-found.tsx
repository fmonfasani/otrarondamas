export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>404</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>Página no encontrada</p>
      </div>
    </div>
  );
}
