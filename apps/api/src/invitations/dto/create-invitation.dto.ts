import { IsEmail, IsIn } from 'class-validator';

// Staff Membership Roles, without OWNER — the owner does not invite themselves, and it
// makes no sense to invite a second Owner through this flow (creating a
// second owner, if it is ever needed, is a separate decision).
// OR-B4-027: ASISTENTE_LOCAL is replaced by VENDEDOR; PROVEEDOR and REPARTIDOR are not
// Membership Roles (OR-B4-006) and are no longer offered.
export const INVITABLE_ROLES = ['ADMIN', 'VENDEDOR', 'GESTOR_DE_STOCK'] as const;

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsIn(INVITABLE_ROLES)
  rol: (typeof INVITABLE_ROLES)[number];
}
