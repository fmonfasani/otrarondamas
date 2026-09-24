import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiAuth, ApiError, API_BASE_URL } from '../../lib/api';
import { useAuth } from './AuthContext';
import { Logo } from '../../components/Logo';

/**
 * RF-17: login de Cliente para la tienda online (otrarondamas.wapsell.com).
 * Solo para clientes (minoristas y mayoristas) — el personal del negocio
 * entra por admin.otrarondamas.wapsell.com (otra app, otra URL).
 */
export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Error de Google OAuth (redirect de vuelta con ?error=google)
  const errorGoogle = params.get('error') === 'google';

  // Token de Google OAuth exitoso (redirect de vuelta con ?token=...)
  const tokenGoogle = params.get('token');
  if (tokenGoogle) {
    // El callback de Google redirigió acá con el token — lo procesamos
    // con un efecto implícito: el componente renderiza brevemente y luego
    // redirige. Usar useEffect acá causaría un flash innecesario; el
    // token ya llegó y podemos resolverlo al montar.
    apiAuth
      .me(tokenGoogle)
      .then((cliente) => {
        setSession(tokenGoogle, cliente);
        navigate(
          cliente.esMayorista && cliente.estadoLegajo === 'PENDIENTE' ? '/mi-cuenta/legajo' : '/',
        );
      })
      .catch(() => navigate('/login?error=google'));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Completá email y contraseña');
      return;
    }
    setEnviando(true);
    try {
      const { accessToken, cliente } = await apiAuth.login({ email, password });
      setSession(accessToken, cliente);
      // Mayorista con legajo pendiente → directo a completar legajo
      if (cliente.esMayorista && cliente.estadoLegajo === 'PENDIENTE') {
        navigate('/mi-cuenta/legajo');
      } else {
        navigate(params.get('next') ?? '/');
      }
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
      {/* Header mínimo */}
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
            Ingresá a tu cuenta
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
            ¿No tenés cuenta?{' '}
            <Link
              to="/registro"
              style={{ color: 'var(--brand-black)', fontWeight: 600, textDecoration: 'underline' }}
            >
              Registrate gratis
            </Link>
          </p>

          {(error || errorGoogle) && (
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
              {error ?? 'No se pudo continuar con Google — intentá con email y contraseña'}
            </div>
          )}

          {/* Google */}
          <a
            href={`${API_BASE_URL}/auth/cliente/google`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--surface-primary)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textDecoration: 'none',
              marginBottom: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>o con email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                Email
              </label>
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
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={enviando} style={btnPrimaryStyle}>
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
