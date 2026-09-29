import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Perfil del cliente autenticado. Muestra datos básicos y, para mayoristas
 * con legajo PENDIENTE, un banner que los lleva a completarlo.
 */
export function MiCuentaPage() {
  const { cliente, logout } = useAuth();
  const navigate = useNavigate();

  // Guardia: si no hay sesión, redirigir al login con ?next=/mi-cuenta
  if (!cliente) {
    navigate('/login?next=/mi-cuenta', { replace: true });
    return null;
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const estadoBadge = () => {
    if (!cliente.esMayorista) return null;
    if (cliente.estadoLegajo === 'PENDIENTE') {
      return (
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 99,
            background: '#fef3c7',
            color: '#92400e',
          }}
        >
          Legajo pendiente
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 99,
          background: '#d1fae5',
          color: '#065f46',
        }}
      >
        Mayorista aprobado
      </span>
    );
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header mínimo igual al del login (sin el Header completo de la tienda) */}
      <div
        style={{
          background: 'var(--brand-black)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
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
        </Link>
      </div>

      <div
        style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '28px 16px' }}
      >
        {/* Banner mayorista con legajo pendiente */}
        {cliente.esMayorista && cliente.estadoLegajo === 'PENDIENTE' && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
              Completá tu legajo para comprar como mayorista
            </div>
            <div style={{ fontSize: 13, color: '#78350f', marginBottom: 10 }}>
              Necesitás cargar tu CUIT y razón social para que el equipo pueda aprobar tu acceso
              mayorista.
            </div>
            <Link
              to="/mi-cuenta/legajo"
              style={{
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 600,
                color: '#92400e',
                textDecoration: 'underline',
              }}
            >
              Completar legajo →
            </Link>
          </div>
        )}

        <div
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 20px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}
              >
                {cliente.nombre}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cliente.email}</div>
            </div>
            {estadoBadge()}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <Row label="Tipo de cuenta" value={cliente.esMayorista ? 'Mayorista' : 'Minorista'} />
            <Row
              label="Ingresó con"
              value={cliente.metodoLogin === 'google' ? 'Google' : 'Email y contraseña'}
            />
            <Row
              label="Miembro desde"
              value={new Date(cliente.createdAt).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
              })}
            />
          </div>
        </div>

        {cliente.esMayorista && (
          <Link
            to="/mi-cuenta/legajo"
            style={{
              display: 'block',
              padding: '12px 16px',
              marginBottom: 12,
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Ver / editar legajo →
          </Link>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: 14,
            fontWeight: 500,
            background: 'transparent',
            color: 'var(--state-danger)',
            border: '1px solid var(--state-danger)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
