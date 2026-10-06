import { IsIn } from 'class-validator';

// Only the two transitions that the orders inbox manages today — see
// orders.service.ts. The rest of EstadoPedido (EN_PREPARACION, LISTO,
// ASIGNADO, EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO, ENTREGA_FALLIDA)
// is left for when RF-13 (Deliveries) is implemented — no value is exposed
// that no real flow produces yet.
export const ORDER_TRANSITIONS = ['CONFIRMADO', 'CANCELADO'] as const;

/* eslint-disable indent */
export class UpdateOrderStatusDto {
  @IsIn(ORDER_TRANSITIONS)
  estado: (typeof ORDER_TRANSITIONS)[number];
}
