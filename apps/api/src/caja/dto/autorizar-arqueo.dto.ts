import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// D-06: credenciales de quien AUTORIZA la excepción, no las de la
// sesión activa (que es de quien está bloqueado tratando de cerrar
// caja) — ver autorizaciones.service.ts.
/* eslint-disable indent */
export class AutorizarArqueoDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
