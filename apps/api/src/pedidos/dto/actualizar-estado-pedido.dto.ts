import { IsIn } from 'class-validator';

// Solo las dos transiciones que la bandeja de pedidos gestiona hoy —
// ver pedidos.service.ts. El resto de EstadoPedido (EN_PREPARACION,
// LISTO, ASIGNADO, EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO,
// ENTREGA_FALLIDA) queda para cuando se implemente RF-13 (Entregas) —
// no se expone un valor que ningún flujo real produce todavía.
export const TRANSICIONES_PEDIDO = ['CONFIRMADO', 'CANCELADO'] as const;

/* eslint-disable indent */
export class ActualizarEstadoPedidoDto {
  @IsIn(TRANSICIONES_PEDIDO)
  estado: (typeof TRANSICIONES_PEDIDO)[number];
}
