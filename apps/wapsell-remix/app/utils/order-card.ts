/**
 * OR-B4-053 — an order in the chat: one card per order that follows its state (like an ERP's sales
 * order with its number), and the system's notices as short centred lines.
 */
export type OrderCardData = {
  tipo: 'pedido';
  id: string;
  pedidoId: string;
  numero: number | null;
  estado: string | null;
  total: string | null;
  items: Array<{ producto: string; cantidad: number }>;
};

/** The order card of a message, if it carries one. */
export const orderCardOf = (m: { adjuntos?: Array<{ tipo: string }> }) =>
  (m.adjuntos ?? []).find((a): a is OrderCardData => a.tipo === 'pedido') ?? null;

export const ORDER_STEPS = ['Recibido', 'Confirmado', 'En camino', 'Entregado'] as const;

const STEP_OF: Record<string, number> = {
  RECIBIDO: 0,
  CONFIRMADO: 1,
  EN_PREPARACION: 1,
  LISTO: 1,
  ASIGNADO: 1,
  EN_CAMINO: 2,
  PARCIALMENTE_ENTREGADO: 3,
  ENTREGADO: 3,
};

const STATE_LABEL: Record<string, string> = {
  RECIBIDO: 'Recibido, falta confirmar',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ASIGNADO: 'Ya tiene quién lo lleve',
  EN_CAMINO: 'En camino',
  PARCIALMENTE_ENTREGADO: 'Entregado en parte',
  ENTREGADO: 'Entregado',
  ENTREGA_FALLIDA: 'No se pudo entregar',
  CANCELADO: 'Cancelado',
};

/** Where the order is on the bar (0–3), or null when it left it (cancelled, failed delivery). */
export function orderStep(estado: string | null): number | null {
  if (!estado) return 0;
  return estado in STEP_OF ? STEP_OF[estado] : null;
}

export const orderStateLabel = (estado: string | null) => (estado ? (STATE_LABEL[estado] ?? estado) : '');

/** «Pedido N° 12», or «Pedido» before it has a number. */
export const orderTitle = (numero: number | null) => (numero ? `Pedido N° ${numero}` : 'Pedido');

/** «2 productos · 3 unidades». */
export function orderSummary(items: OrderCardData['items']) {
  const units = items.reduce((sum, i) => sum + i.cantidad, 0);
  const products = items.length === 1 ? '1 producto' : `${items.length} productos`;
  return units === items.length ? products : `${products} · ${units} unidades`;
}
