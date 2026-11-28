import { IsIn, IsOptional } from 'class-validator';

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
/** Fase 3: when accepting, how long the store says it takes. */
export const PREPARATION_MINUTES = [10, 20, 30] as const;

export class UpdateOrderStatusDto {
  @IsIn(ORDER_TRANSITIONS)
  estado: (typeof ORDER_TRANSITIONS)[number];

  @IsOptional()
  @IsIn(PREPARATION_MINUTES)
  minutosPreparacion?: (typeof PREPARATION_MINUTES)[number];
}

/** Fase 3: stop taking orders for 30 minutes, or take them again (0). */
export class PauseOrdersDto {
  @IsIn([0, 30])
  minutos: 0 | 30;
}
