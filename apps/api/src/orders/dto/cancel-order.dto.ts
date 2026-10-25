import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * P2-3: Order Cancellation Request DTO
 *
 * Accepts optional reason for audit trail. Implementation details:
 * - Only RECIBIDO, CONFIRMADO, ENTREGA_FALLIDA states are cancellable
 * - CONFIRMADO cancellations trigger stock reversal (ENTRADA creation)
 * - All cancellations create audit log entries
 */
export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
