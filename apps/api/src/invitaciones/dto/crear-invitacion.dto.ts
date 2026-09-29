import { IsEmail, IsIn } from 'class-validator';

// RolUsuario, sin OWNER — el dueño no se auto-invita a sí mismo, y no
// tiene sentido invitar a un segundo Owner por este flujo (el alta de
// un segundo dueño, si algún día hace falta, es una decisión aparte).
const ROLES_INVITABLES = ['ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR'] as const;

/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class CrearInvitacionDto {
  @IsEmail()
  email: string;

  @IsIn(ROLES_INVITABLES)
  rol: (typeof ROLES_INVITABLES)[number];
}
