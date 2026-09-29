import { IsOptional, IsString } from 'class-validator';

/**
 * Todos los campos opcionales a nivel DTO — lo que es obligatorio
 * varía según el rol de quien completa el legajo (ver
 * docs/spec-login-roles.md, sección 3): Owner solo pide datos
 * fiscales, Asistente/Repartidor solo datos personales, Proveedor
 * datos fiscales + tipo de factura, etc. LegajoService.
 * verificarCompleto() es el único lugar que decide qué campos exige
 * cada rol antes de dejar aprobar el legajo — nunca se infiere ni se
 * calcula acá.
 */
/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class ActualizarLegajoDto {
  // Datos fiscales — Owner, Proveedor, Cliente mayorista.
  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  condicionIva?: string;

  // Solo Proveedor.
  @IsOptional()
  @IsString()
  tipoFactura?: string;

  // Datos personales — Asistente de local, Repartidor.
  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  // Solo Repartidor.
  @IsOptional()
  @IsString()
  vehiculoDatos?: string;

  @IsOptional()
  @IsString()
  licenciaConducir?: string;
}
