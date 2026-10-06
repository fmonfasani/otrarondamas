import { UnidadBase } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/* eslint-disable indent */
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  codigoInterno: string;

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  // The 4 catalog hierarchy levels are always required (see schema.prisma
  // model Producto) — the "GEN" node of Tipo/Subtipo is used when the
  // category needs no more detail than Family/Subfamily. There is no
  // "partial" hierarchy: a product without an explicit Tipo/Subtipo still
  // points to a real Tipo/Subtipo (the GEN of its Subfamily), never to null.
  @IsUUID()
  familiaId: string;

  @IsUUID()
  subfamiliaId: string;

  @IsUUID()
  tipoId: string;

  @IsUUID()
  subtipoId: string;

  @IsEnum(UnidadBase)
  unidadBase: UnidadBase;

  @IsNumber()
  @IsPositive()
  costo: number;

  @IsNumber()
  @IsPositive()
  precioMinorista: number;

  // D-01: nullable until the wholesale pricing rule is defined — it is
  // accepted if sent, but never computed by assumption.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precioMayorista?: number;

  // Online Store Phase 6 (RF-06/RF-04): single, global discount as a
  // percentage over precioMinorista. 0-100, no business cap of its own —
  // see the comment in schema.prisma.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
