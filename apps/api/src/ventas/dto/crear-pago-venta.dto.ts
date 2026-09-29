import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const MEDIOS_VALIDOS = ['efectivo', 'transferencia', 'QR'] as const;

/* eslint-disable indent */
export class CrearPagoVentaDto {
  @IsIn(MEDIOS_VALIDOS)
  medio: (typeof MEDIOS_VALIDOS)[number];

  @IsNumber()
  @IsPositive()
  monto: number;

  // Solo efectivo: lo que entrega el cliente. Puede ser > monto (se calcula vuelto).
  @IsOptional()
  @IsNumber()
  @IsPositive()
  montoRecibido?: number;

  // Transferencia / QR: número de operación, CBU de origen, etc.
  @IsOptional()
  @IsString()
  referencia?: string;
}
