/**
 * P2-3: Order Cancellation Response DTO
 *
 * Returns the cancelled order with confirmation of all actions taken.
 * Includes audit trail reference and stock reversal status.
 */
export class CancelOrderResponseDto {
  id: string;
  estado: string;
  clienteId: string;
  usuarioId: string | null;
  canalOrigen: string;
  total: string;
  descuento: string;
  createdAt: Date;
  updatedAt: Date;
  stockReversedItems: number;
  auditLogId?: string;
}
