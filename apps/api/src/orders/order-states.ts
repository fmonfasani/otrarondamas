import { EstadoPedido } from '@prisma/client';

/**
 * #168 (R8-ORD-002 A1, B1, D1, F1) and OR-B4-049: where an order can go from each state.
 * - RECIBIDO is the customer's intent; CONFIRMADO (ORDER_CONFIRM) reserves the stock.
 * - Fulfillment (ORDERS_MANAGE): EN_PREPARACION and LISTO are optional steps; the stock leaves at
 *   the first of EN_CAMINO (delivered orders) and ENTREGADO (picked up in the business).
 * - A failed delivery (ENTREGA_FALLIDA) brings the goods back, still reserved: the order is sent
 *   again, picked up, or cancelled.
 * - CANCELADO (ORDER_CANCEL) only before the stock leaves, or after a failed delivery; it is terminal.
 * - ASIGNADO and PARCIALMENTE_ENTREGADO are not reachable yet: they need the delivery person and the
 *   quantities delivered per item (the detailed fulfillment of R8-ORD-002 §14). An order already in
 *   ASIGNADO behaves like LISTO.
 */
export const NEXT_STATES: Readonly<Record<EstadoPedido, readonly EstadoPedido[]>> = {
  RECIBIDO: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREPARACION', 'LISTO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  EN_PREPARACION: ['LISTO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  LISTO: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  ASIGNADO: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  EN_CAMINO: ['ENTREGADO', 'ENTREGA_FALLIDA'],
  ENTREGA_FALLIDA: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  PARCIALMENTE_ENTREGADO: [],
  CANCELADO: [],
};

/** The states an order can be cancelled from: before its stock leaves, or after a failed delivery. */
export const CANCELLABLE_STATES: readonly EstadoPedido[] = (
  Object.keys(NEXT_STATES) as EstadoPedido[]
).filter((state) => NEXT_STATES[state].includes('CANCELADO'));

/** Once here, the order's stock is out of the business. */
const OUT_STATES: readonly EstadoPedido[] = ['EN_CAMINO', 'ENTREGADO', 'PARCIALMENTE_ENTREGADO'];

/** OR-B4-049: the move that takes the order's stock out of the business. */
export function stockLeaves(from: EstadoPedido, to: EstadoPedido): boolean {
  return (to === 'EN_CAMINO' || to === 'ENTREGADO') && !OUT_STATES.includes(from);
}

/** OR-B4-049: a failed delivery brings the goods back into stock (they stay reserved). */
export function stockReturns(from: EstadoPedido, to: EstadoPedido): boolean {
  return from === 'EN_CAMINO' && to === 'ENTREGA_FALLIDA';
}

/** How the team reads each state in a message. */
export const STATE_NAMES: Readonly<Record<EstadoPedido, string>> = {
  RECIBIDO: 'por confirmar',
  CONFIRMADO: 'confirmado',
  EN_PREPARACION: 'en preparación',
  LISTO: 'listo',
  ASIGNADO: 'asignado',
  EN_CAMINO: 'en camino',
  ENTREGADO: 'entregado',
  PARCIALMENTE_ENTREGADO: 'entregado en parte',
  ENTREGA_FALLIDA: 'con la entrega fallida',
  CANCELADO: 'cancelado',
};
