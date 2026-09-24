import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useCarritoContext } from '../carrito/CarritoContext';
import { HeaderSimple } from '../../components/Header';

/**
 * Carrito + datos de contacto + confirmar pedido (RF-06, Fase 3). Sin
 * pago todavía — eso es la Fase 5 (bloqueada por D-03, modalidad de
 * Mercado Pago sin definir, ver roadmap). El pedido queda RECIBIDO y el
 * dueño lo gestiona desde la bandeja de pedidos del panel (Fase 4).
 */
export function CheckoutPage() {
  const carrito = useCarritoContext();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmarPedido() {
    setError(null);
    if (!nombre.trim() || !email.trim()) {
      setError('Completá nombre y email para continuar');
      return;
    }
    setEnviando(true);
    try {
      const pedido = await api.crearPedido({
        nombre,
        email,
        telefono: telefono || undefined,
        items: carrito.items.map((i) => ({
          productoId: i.producto.productoId,
          cantidad: i.cantidad,
        })),
      });
      carrito.vaciar();
      navigate(`/pedido/${pedido.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar el pedido');
    } finally {
      setEnviando(false);
    }
  }

  const pageStyle = {
    maxWidth: 480,
    margin: '0 auto',
    height: '100dvh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'var(--surface-bg)',
    position: 'relative' as const,
  };

  if (carrito.items.length === 0) {
    return (
      <div style={pageStyle}>
        <HeaderSimple volverA="/" titulo="Tu carrito" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
          }}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
            Tu carrito está vacío.
          </p>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-yellow)',
              color: 'var(--brand-black)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <HeaderSimple volverA="/" titulo="Confirmar pedido" />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Datos de contacto */}
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}
          >
            Tus datos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Campo id="nombre" label="Nombre y apellido" value={nombre} onChange={setNombre} />
            <Campo id="email" label="Email" value={email} onChange={setEmail} type="email" />
            <Campo
              id="telefono"
              label="Teléfono / WhatsApp (opcional)"
              value={telefono}
              onChange={setTelefono}
            />
          </div>
        </div>

        {/* Zona de entrega — dato operativo */}
        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            padding: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand-black)"
            strokeWidth="1.8"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 2,
              }}
            >
              Entregamos en Río Cuarto, Córdoba
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Horario de atención: 8:00 a 24:00 hs. El pedido se confirma por WhatsApp antes de
              despachar.
            </div>
          </div>
        </div>

        {/* Resumen del pedido */}
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}
          >
            Resumen del pedido
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {carrito.items.map((item) => (
              <div
                key={item.producto.productoId}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, gap: 8 }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.producto.nombre} ×{item.cantidad}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    ${(Number(item.producto.precio) * item.cantidad).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar ${item.producto.nombre}`}
                    onClick={() => carrito.quitar(item.producto.productoId)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--state-danger)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: 0,
                    }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 0' }} />
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Total
              </span>
              <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>
                ${carrito.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Contacto / canales */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="tel:3586081000"
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--state-success)"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              358 6081000
            </span>
          </a>
          <a
            href="https://www.instagram.com/otrarondamas.ok/"
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111111"
              strokeWidth="1.8"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              @otrarondamas.ok
            </span>
          </a>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--state-danger)', fontSize: 13 }}>
            {error}
          </p>
        )}
      </div>

      {/* Barra inferior fija */}
      <div
        style={{
          flexShrink: 0,
          background: '#fff',
          borderTop: '1px solid var(--border-default)',
          padding: '12px 16px 16px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
        }}
      >
        <button
          type="button"
          disabled={enviando}
          onClick={confirmarPedido}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--brand-yellow)',
            color: 'var(--brand-black)',
            fontSize: 14.5,
            fontWeight: 700,
            opacity: enviando ? 0.7 : 1,
          }}
        >
          {enviando ? 'Confirmando…' : `Confirmar pedido — $${carrito.total.toFixed(2)}`}
        </button>
        <div
          style={{
            textAlign: 'center',
            fontSize: 10.5,
            color: 'var(--text-secondary)',
            marginTop: 8,
          }}
        >
          El pago se coordina al confirmar tu pedido. Te vamos a contactar por email.
        </div>
      </div>
    </div>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          display: 'block',
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: 40,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          background: '#fff',
          padding: '0 12px',
          fontSize: 13,
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
    </div>
  );
}
