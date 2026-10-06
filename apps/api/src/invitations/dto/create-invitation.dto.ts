import { IsEmail, IsIn } from 'class-validator';

// UserRole, without OWNER — the owner does not invite themselves, and it
// makes no sense to invite a second Owner through this flow (creating a
// second owner, if it is ever needed, is a separate decision).
const INVITABLE_ROLES = ['ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR'] as const;

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsIn(INVITABLE_ROLES)
  rol: (typeof INVITABLE_ROLES)[number];
}
