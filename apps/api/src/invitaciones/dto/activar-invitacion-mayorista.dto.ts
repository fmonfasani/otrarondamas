import { IsString, MinLength } from 'class-validator';

/**
 * Activación de la invitación de un Cliente mayorista — crea el Cliente
 * real con esMayorista=true y estadoLegajo=PENDIENTE. A diferencia de
 * ActivarInvitacionDto (para Usuario), no necesita `rol` porque el tipo
 * de cuenta ya está determinado por el flujo (es siempre Cliente mayorista).
 */
/* eslint-disable indent */
export class ActivarInvitacionMayoristaDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(8)
  password: string;
}
