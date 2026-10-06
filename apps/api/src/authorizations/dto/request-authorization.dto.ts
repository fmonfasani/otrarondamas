import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Restricted operations that currently consult D-06 (see
// REQUIRED_PERMISSION_BY_OPERATION in authorizations.service.ts for the
// exact permission each one demands from whoever authorizes). Closed list
// on purpose: adding an operation here is an explicit decision, not a free
// string that any endpoint can invent.
export const AUTHORIZABLE_OPERATIONS = ['caja.cierreConDiferencia'] as const;

/* eslint-disable indent -- known false positive of the base `indent`
   rule with decorators on class properties, see the rest of the
   project DTOs */
export class RequestAuthorizationDto {
  @IsIn(AUTHORIZABLE_OPERATIONS)
  operacion: (typeof AUTHORIZABLE_OPERATIONS)[number];

  // Credentials of whoever authorizes — D-06: 'no agent or automatic process
  // can authorize itself'. They are requested here, the current session JWT
  // is not reused: the active session belongs to whoever is ASKING for the
  // authorization (e.g. the seller closing the cash register), not to whoever
  // grants it.
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsString()
  entidadAfectada?: string;

  @IsOptional()
  @IsUUID()
  entidadId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
