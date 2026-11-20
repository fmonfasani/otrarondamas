import { IsIn } from 'class-validator';

// #168 and OR-B4-049: the states an order can be moved to (where it can go from each one is
// NEXT_STATES in order-states.ts). ASIGNADO and PARCIALMENTE_ENTREGADO are not exposed yet: they
// need the delivery person and the quantities delivered per item.
export const ORDER_TRANSITIONS = [
  'CONFIRMADO',
  'CANCELADO',
  'EN_PREPARACION',
  'LISTO',
  'EN_CAMINO',
  'ENTREGADO',
  'ENTREGA_FALLIDA',
] as const;

/* eslint-disable indent */
export class UpdateOrderStatusDto {
  @IsIn(ORDER_TRANSITIONS)
  estado: (typeof ORDER_TRANSITIONS)[number];
}
