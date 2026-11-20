/**
 * Orders in the panel (#168, OR-B4-049): what each role can do, the moves offered from each state,
 * and how the order's stock stands. Pure helpers; the API checks every move again.
 */
import type { OrderState } from './format';

/** Mirrors the canonical matrix: confirm (ORDER_CONFIRM), cancel (ORDER_CANCEL), fulfill (ORDERS_MANAGE). */
export function orderAbilities(role: string) {
  return {
    confirm: ['OWNER', 'ADMIN', 'VENDEDOR'].includes(role),
    cancel: ['OWNER', 'ADMIN'].includes(role),
    fulfill: ['OWNER', 'ADMIN', 'VENDEDOR', 'GESTOR_DE_STOCK'].includes(role),
  };
}

export type OrderMove = { to: OrderState; label: string; primary?: boolean };

const PICKED_UP: OrderMove = { to: 'ENTREGADO', label: 'Lo retiró el cliente' };
const ON_THE_WAY: OrderMove = { to: 'EN_CAMINO', label: 'Salió a entregar' };

/**
 * The fulfillment moves from each state (confirming and cancelling have their own buttons). The
 * stock leaves at the first of «Salió a entregar» and «Lo retiró el cliente» / «Entregado».
 */
export const ORDER_MOVES: Partial<Record<OrderState, OrderMove[]>> = {
  CONFIRMADO: [
    { to: 'EN_PREPARACION', label: 'Empezar a preparar', primary: true },
    { to: 'LISTO', label: 'Marcar listo' },
    ON_THE_WAY,
    PICKED_UP,
  ],
  EN_PREPARACION: [{ to: 'LISTO', label: 'Marcar listo', primary: true }, ON_THE_WAY, PICKED_UP],
  LISTO: [{ ...ON_THE_WAY, primary: true }, PICKED_UP],
  ASIGNADO: [{ ...ON_THE_WAY, primary: true }, PICKED_UP],
  EN_CAMINO: [
    { to: 'ENTREGADO', label: 'Entregado', primary: true },
    { to: 'ENTREGA_FALLIDA', label: 'No se pudo entregar' },
  ],
  ENTREGA_FALLIDA: [{ to: 'EN_CAMINO', label: 'Volver a enviar', primary: true }, PICKED_UP],
};

/** The moves the panel sends (anything else is refused before calling the API). */
export const MOVABLE_STATES = new Set<string>(
  Object.values(ORDER_MOVES).flatMap((moves) => (moves ?? []).map((move) => move.to)),
);

/** Cancelled before the stock leaves, or after a failed delivery (the API rule). */
export const CANCELLABLE_ORDER_STATES = new Set<string>([
  'RECIBIDO',
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'ASIGNADO',
  'ENTREGA_FALLIDA',
]);

/** What the team reads after a move. */
export function moveMessage(to: string): string {
  switch (to) {
    case 'EN_PREPARACION':
      return 'El pedido está en preparación.';
    case 'LISTO':
      return 'El pedido está listo.';
    case 'EN_CAMINO':
      return 'El pedido salió a entregar: descontamos su stock.';
    case 'ENTREGADO':
      return 'Pedido entregado.';
    case 'ENTREGA_FALLIDA':
      return 'Entrega fallida: la mercadería volvió al stock y sigue reservada para este pedido.';
    default:
      return 'Pedido actualizado.';
  }
}

/** Where the order's stock stands (OR-B4-049), or null when it has none. */
export function stockNote(state: string): string | null {
  switch (state) {
    case 'RECIBIDO':
      return 'Al confirmarlo, su stock queda reservado: nadie más lo puede comprar.';
    case 'CONFIRMADO':
    case 'EN_PREPARACION':
    case 'LISTO':
    case 'ASIGNADO':
      return 'Su stock está reservado. Se descuenta cuando el pedido sale del local: al salir a entregar o cuando lo retira el cliente.';
    case 'EN_CAMINO':
    case 'ENTREGADO':
    case 'PARCIALMENTE_ENTREGADO':
      return 'Su stock ya salió del local.';
    case 'ENTREGA_FALLIDA':
      return 'La mercadería volvió al stock y sigue reservada para este pedido.';
    default:
      return null;
  }
}
