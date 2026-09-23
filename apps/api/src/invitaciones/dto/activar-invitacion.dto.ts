import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Activación de una invitación (RF-17). `password` opcional — si la
 * persona va a entrar con Google, no define contraseña local acá
 * (mismo patrón que Usuario.passwordHash nullable, ver
 * auth.google.service.ts). Se valida en el service que al menos exista
 * UNA forma de entrar (password ahora, o Google después).
 */
/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class ActivarInvitacionDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
