import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { SeguimientoPedido } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';

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

  if (cargando) return <p>Cargando…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!pedido) return null;

  return (
    <div>
      <h1>¡Gracias por tu pedido!</h1>
      <p>
        Pedido <code>{pedido.id}</code>
      </p>
      <p>
        <strong>Estado:</strong> {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
      </p>

      <h2>Detalle</h2>
      <ul>
        {pedido.items.map((item, idx) => (
          <li key={idx}>
            {item.producto} — {item.cantidad} × ${item.precioUnitario}
          </li>
        ))}
      </ul>

      <p>
        <strong>Total: ${pedido.total}</strong>
      </p>

      <p>Guardá este link para consultar el estado de tu pedido más adelante.</p>
      <Link to="/">Volver al catálogo</Link>
    </div>
  );
}
