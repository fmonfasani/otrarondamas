import { IsIn, IsNumber, IsPositive } from 'class-validator';

// RF-08 lista efectivo/transferencia/QR/Mercado Pago como medios
// previstos. Mercado Pago queda explícitamente fuera de este DTO: D-03
// no tiene todavía la modalidad de integración definida (Checkout Pro,
// Checkout API u otra), y el propio prompt de scaffolding prohibió
// implementar ninguna integración real de pasarela sin esa decisión.
const MEDIOS_MANUALES = ['efectivo', 'transferencia', 'QR'] as const;

/* eslint-disable indent */
export class CreatePagoDto {
  @IsIn(MEDIOS_MANUALES)
  medio: (typeof MEDIOS_MANUALES)[number];

  @IsNumber()
  @IsPositive()
  monto: number;
}
