import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const VALID_METHODS = ['efectivo', 'transferencia', 'QR'] as const;

/* eslint-disable indent */
export class CreateSalePaymentDto {
  @IsIn(VALID_METHODS)
  medio: (typeof VALID_METHODS)[number];

  @IsNumber()
  @IsPositive()
  monto: number;

  // Cash only: what the customer hands over. It may be > amount (change is
  // computed).
  @IsOptional()
  @IsNumber()
  @IsPositive()
  montoRecibido?: number;

  // Transfer / QR: operation number, origin CBU, etc.
  @IsOptional()
  @IsString()
  referencia?: string;
}
