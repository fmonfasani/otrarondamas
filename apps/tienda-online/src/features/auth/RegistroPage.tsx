import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiAuth, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';
import { Logo } from '../../components/Logo';

export function RegistroPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setEnviando(true);
    try {
      const { accessToken, cliente } = await apiAuth.registro({ nombre, email, password });
      setSession(accessToken, cliente);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: 'var(--brand-black)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Link to="/" aria-label="Ir al catálogo">
          <Logo size={32} />
        </Link>
        <div style={{ lineHeight: 1.05 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brand-yellow)',
              letterSpacing: 0.2,
            }}
          >
            OTRA RONDA
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brand-white)',
              letterSpacing: 0.2,
              marginTop: -2,
            }}
          >
            MAS
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: '0 0 6px',
              color: 'var(--text-primary)',
            }}
          >
            Crear cuenta
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
            ¿Ya tenés cuenta?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--brand-black)', fontWeight: 600, textDecoration: 'underline' }}
            >
              Ingresá
            </Link>
          </p>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 14,
                color: 'var(--state-danger)',
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                placeholder="Tu nombre"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="tu@email.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={enviando} style={btnPrimaryStyle}>
              {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Al registrarte aceptás comprar como cliente minorista de Otra Ronda Más.
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-primary)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: 15,
  fontWeight: 600,
  background: 'var(--brand-black)',
  color: 'var(--brand-yellow)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  marginTop: 4,
};
