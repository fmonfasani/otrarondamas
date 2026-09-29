import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * RF-17 (docs/spec-login-roles.md): auto-registro público — solo para
 * Cliente minorista (tienda online). El Cliente mayorista no se registra
 * solo; el Owner lo invita y la persona activa la cuenta como en el flujo
 * de Usuario (InvitacionesService, con esMayorista=true en el payload).
 *
 * No recibe `esMayorista` ni campos fiscales — eso lo completa el cliente
 * después del registro si el dueño lo categoriza como mayorista.
 */
/* eslint-disable indent */
export class RegistroClienteDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
