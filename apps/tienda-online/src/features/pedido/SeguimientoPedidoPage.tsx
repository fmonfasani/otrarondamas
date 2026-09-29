import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { SeguimientoPedido } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { HeaderSimple } from '../../components/Header';

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO: 'Recibido — todavía no confirmado',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ASIGNADO: 'Asignado para entrega',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  PARCIALMENTE_ENTREGADO: 'Entregado parcialmente',
  ENTREGA_FALLIDA: 'Entrega fallida',
  CANCELADO: 'Cancelado',
};

const ESTADO_COLOR: Record<string, string> = {
  RECIBIDO: 'var(--state-warning)',
  CONFIRMADO: 'var(--state-info)',
  EN_PREPARACION: 'var(--state-info)',
  LISTO: 'var(--state-success)',
  ASIGNADO: 'var(--state-info)',
  EN_CAMINO: 'var(--state-info)',
  ENTREGADO: 'var(--state-success)',
  PARCIALMENTE_ENTREGADO: 'var(--state-warning)',
  ENTREGA_FALLIDA: 'var(--state-danger)',
  CANCELADO: 'var(--state-danger)',
};

const pageStyle = {
  maxWidth: 480,
  margin: '0 auto',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'var(--surface-bg)',
};

/**
 * Seguimiento sin login (RF-06, Fase 3): cualquiera con el link puede
 * consultar su pedido — el id (UUID) actúa como el único "código" de
 * acceso, no hay cuenta de cliente que iniciar sesión.
 */
export function SeguimientoPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<SeguimientoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .seguimiento(id)
      .then(setPedido)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el pedido'),
      )
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) {
    return (
      <div style={pageStyle}>
        <HeaderSimple volverA="/" titulo="Tu pedido" />
        <p style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div style={pageStyle}>
        <HeaderSimple volverA="/" titulo="Tu pedido" />
        <p role="alert" style={{ padding: 16, color: 'var(--state-danger)', fontSize: 13 }}>
          {error}
        </p>
      </div>
    );
  }
  if (!pedido) return null;

  return (
    <div style={pageStyle}>
      <HeaderSimple volverA="/" titulo="Tu pedido" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--brand-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-black)"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            ¡Gracias por tu pedido!
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Pedido <code>{pedido.id}</code>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: ESTADO_COLOR[pedido.estado] ?? 'var(--text-secondary)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
          </span>
        </div>

        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}
          >
            Detalle
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
            {pedido.items.map((item, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.producto} ×{item.cantidad}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  ${(Number(item.precioUnitario) * Number(item.cantidad)).toFixed(2)}
                </span>
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
                ${pedido.total}
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Guardá este link para consultar el estado de tu pedido más adelante.
        </p>

        <Link
          to="/"
          style={{
            textAlign: 'center',
            padding: '12px 0',
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
