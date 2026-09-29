import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiAuth, ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';
import { Logo } from '../../components/Logo';

/**
 * Activación de cuenta para clientes mayoristas.
 * El Owner crea la invitación desde el panel (POST /invitaciones/mayorista),
 * el cliente recibe un email con ?token=... y aterriza acá.
 */
export function ActivarInvitacionMayoristaPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token') ?? '';

  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div style={centeredPage}>
        <p style={{ color: 'var(--state-danger)', fontSize: 15 }}>
          Link de invitación inválido. Pedile al dueño que te reenvíe el email.
        </p>
        <Link to="/" style={{ color: 'var(--brand-black)', fontWeight: 600 }}>
          Volver al catálogo
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setEnviando(true);
    try {
      const { accessToken, cliente } = await apiAuth.activarInvitacionMayorista({
        token,
        nombre,
        password,
      });
      setSession(accessToken, cliente);
      // Siempre va a /mi-cuenta/legajo — el mayorista recién activado
      // siempre tiene estadoLegajo=PENDIENTE y necesita completar el legajo.
      navigate('/mi-cuenta/legajo');
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
            Activar cuenta mayorista
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
            Elegí un nombre y contraseña para tu cuenta. Después vas a completar tu legajo para que
            el equipo pueda aprobar tu acceso mayorista.
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
              <label style={labelStyle}>Nombre o razón social</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                placeholder="Ej: Distribuidora ABC"
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
              {enviando ? 'Activando cuenta...' : 'Activar cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const centeredPage: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: '24px 16px',
};

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
