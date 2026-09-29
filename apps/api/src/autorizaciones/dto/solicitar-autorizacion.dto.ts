import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Operaciones restringidas que hoy consultan D-06 (ver
// OPERACION_PERMISO_REQUERIDO en autorizaciones.service.ts para el
// permiso exacto que cada una exige de quien autoriza). Lista cerrada
// a propósito: agregar una operación acá es una decisión explícita,
// no un string libre que cualquier endpoint pueda inventar.
export const OPERACIONES_AUTORIZABLES = ['caja.cierreConDiferencia'] as const;

/* eslint-disable indent -- falso positivo conocido de la regla
   `indent` base con decorators en propiedades de clase, ver el resto
   de los DTOs del proyecto */
export class SolicitarAutorizacionDto {
  @IsIn(OPERACIONES_AUTORIZABLES)
  operacion: (typeof OPERACIONES_AUTORIZABLES)[number];

  // Credenciales de quien autoriza — D-06: "ningún agente o proceso
  // automático puede autorizarse a sí mismo". Se piden acá, no se
  // reutiliza el JWT de la sesión actual: la sesión activa es de quien
  // está PIDIENDO la autorización (ej. el vendedor cerrando caja), no
  // de quien la concede.
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
