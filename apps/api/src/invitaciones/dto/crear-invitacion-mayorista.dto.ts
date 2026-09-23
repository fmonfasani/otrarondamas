import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * RF-17: invitación a un Cliente mayorista (B2B). A diferencia de
 * CrearInvitacionDto (que invita a un Usuario con rol explícito), acá el
 * resultado de activar es un Cliente con esMayorista=true, no un Usuario.
 *
 * Se puede incluir opcionalmente el nombre comercial/razón social para
 * que ya quede en el registro de la invitación y no sea una caja vacía.
 */
/* eslint-disable indent */
export class CrearInvitacionMayoristaDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nombreComercial?: string;
}
