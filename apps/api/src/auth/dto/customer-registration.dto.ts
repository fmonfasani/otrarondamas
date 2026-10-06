import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * RF-17 (docs/spec-login-roles.md): public self-registration — only for
 * retail Cliente (online store). The wholesale Cliente does not
 * register on their own; the Owner invites them and the person
 * activates the account as in the Usuario flow (InvitationsService,
 * with esMayorista=true in the payload).
 *
 * It does not receive `esMayorista` nor fiscal fields — the customer
 * fills those in after registration if the owner categorizes them as
 * wholesale.
 */
/* eslint-disable indent */
export class CustomerRegistrationDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
