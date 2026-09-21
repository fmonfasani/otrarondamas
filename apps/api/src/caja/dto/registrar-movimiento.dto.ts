import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

// RF-09: "gastos y retiros solo por el dueño o usuarios autorizados"
// (protegido con @RequierePermiso('caja.gastos') en el controller, ver
// caja.controller.ts). Este endpoint es para movimientos MANUALES —
// los movimientos tipo 'Venta' los genera el sistema automáticamente
// desde pagos.service.ts, no se cargan a mano acá.
const TIPOS_MOVIMIENTO_MANUAL = ['Ingreso', 'Egreso', 'Gasto', 'Retiro'] as const;

/* eslint-disable indent */
export class RegistrarMovimientoDto {
  @IsIn(TIPOS_MOVIMIENTO_MANUAL)
  tipo: (typeof TIPOS_MOVIMIENTO_MANUAL)[number];

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
