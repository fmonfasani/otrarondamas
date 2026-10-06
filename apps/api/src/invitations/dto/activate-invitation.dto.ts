import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Activation of an invitation (RF-17). `password` optional — if the person
 * will log in with Google, they do not define a local password here (same
 * pattern as nullable Usuario.passwordHash, see auth.google.service.ts).
 * The service validates that at least ONE way to log in exists (password
 * now, or Google later).
 */
/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class ActivateInvitationDto {
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
