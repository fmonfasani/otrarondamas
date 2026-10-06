import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

// RF-09: 'expenses and withdrawals only by the owner or authorized users'
// (protected with @RequirePermission('caja.gastos') in the controller, see
// cash-register.controller.ts). This endpoint is for MANUAL movements —
// 'Venta' type movements are generated automatically by the system from
// payments.service.ts, they are not entered by hand here.
const MANUAL_MOVEMENT_TYPES = ['Ingreso', 'Egreso', 'Gasto', 'Retiro'] as const;

/* eslint-disable indent */
export class RegisterMovementDto {
  @IsIn(MANUAL_MOVEMENT_TYPES)
  tipo: (typeof MANUAL_MOVEMENT_TYPES)[number];

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
