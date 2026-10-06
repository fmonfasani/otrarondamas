import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// D-06: credentials of whoever AUTHORIZES the exception, not those of the
// active session (which belongs to whoever is blocked trying to close the
// cash register) — see authorizations.service.ts.
/* eslint-disable indent */
export class AuthorizeCashCountDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
