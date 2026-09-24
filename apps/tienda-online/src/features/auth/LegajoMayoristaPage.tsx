import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiAuth, ApiError, type LegajoCliente } from '../../lib/api';
import { useAuth } from './AuthContext';

const CONDICION_IVA_OPCIONES = [
  'Responsable Inscripto',
  'Monotributista',
  'Exento',
  'Consumidor Final',
] as const;

const TIPO_FACTURA_OPCIONES = ['A', 'B', 'C'] as const;

/**
 * Formulario de legajo para clientes mayoristas.
 * Solo accesible si `cliente.esMayorista === true`.
 */
export function LegajoMayoristaPage() {
  const { cliente, token } = useAuth();
  const navigate = useNavigate();

  const [legajo, setLegajo] = useState<LegajoCliente | null>(null);
  const [cargandoLegajo, setCargandoLegajo] = useState(true);

  const [cuit, setCuit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [condicionIva, setCondicionIva] = useState('');
  const [tipoFactura, setTipoFactura] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // Guard: solo mayoristas autenticados
  useEffect(() => {
    if (!cliente) {
      navigate('/login?next=/mi-cuenta/legajo', { replace: true });
      return;
    }
    if (!cliente.esMayorista) {
      navigate('/mi-cuenta', { replace: true });
      return;
    }
  }, [cliente, navigate]);

  // Cargar legajo existente (puede no existir todavía si nunca lo completó)
  useEffect(() => {
    if (!token) return;
    apiAuth
      .miLegajo(token)
      .then((data) => {
        setLegajo(data);
        setCuit(data.cuit ?? '');
        setRazonSocial(data.razonSocial ?? '');
        setCondicionIva(data.condicionIva ?? '');
        setTipoFactura(data.tipoFactura ?? '');
      })
      .catch(() => {
        // 404 = todavía no tiene legajo, formulario vacío
      })
      .finally(() => setCargandoLegajo(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(false);
    if (!cuit.trim() || !razonSocial.trim() || !condicionIva) {
      setError('CUIT, razón social y condición de IVA son obligatorios');
      return;
    }
    if (!token) return;
    setGuardando(true);
    try {
      const updated = await apiAuth.actualizarLegajo(token, {
        cuit: cuit.trim(),
        razonSocial: razonSocial.trim(),
        condicionIva,
        ...(tipoFactura ? { tipoFactura } : {}),
      });
      setLegajo(updated);
      setExito(true);
      // Scroll al top para que vea el mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  if (!cliente?.esMayorista) return null;

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
        <Link to="/mi-cuenta" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 13, color: 'var(--brand-yellow)' }}>← Mi cuenta</span>
        </Link>
      </div>

      <div
        style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '28px 16px' }}
      >
        <h1
          style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}
        >
          Legajo mayorista
        </h1>

        {/* Estado del legajo */}
        <div style={{ marginBottom: 20 }}>
          {cliente.estadoLegajo === 'PENDIENTE' ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 13,
                color: '#92400e',
              }}
            >
              <strong>Pendiente de aprobación.</strong> Completá los datos y el equipo revisará tu
              legajo para habilitar el acceso mayorista.
            </div>
          ) : (
            <div
              style={{
                background: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 13,
                color: '#065f46',
              }}
            >
              <strong>Legajo aprobado.</strong> Podés actualizar tus datos si cambiaron.
            </div>
          )}
        </div>

        {exito && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 14,
              color: '#166534',
            }}
          >
            Legajo guardado correctamente.
          </div>
        )}

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

        {cargandoLegajo ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              color: 'var(--text-secondary)',
              fontSize: 14,
            }}
          >
            Cargando legajo...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {legajo?.id && <input type="hidden" value={legajo.id} />}

            <div>
              <label style={labelStyle}>CUIT *</label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="20-12345678-9"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Razón social *</label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Ej: Distribuidora ABC S.R.L."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Condición frente al IVA *</label>
              <select
                value={condicionIva}
                onChange={(e) => setCondicionIva(e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleccioná una opción</option>
                {CONDICION_IVA_OPCIONES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tipo de factura preferido</label>
              <select
                value={tipoFactura}
                onChange={(e) => setTipoFactura(e.target.value)}
                style={inputStyle}
              >
                <option value="">Sin preferencia</option>
                {TIPO_FACTURA_OPCIONES.map((op) => (
                  <option key={op} value={op}>
                    Factura {op}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={guardando}
              style={{
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
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando ? 'Guardando...' : legajo ? 'Actualizar legajo' : 'Guardar legajo'}
            </button>
          </form>
        )}
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
