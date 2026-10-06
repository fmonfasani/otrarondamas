import { NivelFidelidad } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class CreateLoyaltyRuleDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEnum(NivelFidelidad)
  nivelRequerido: NivelFidelidad;

  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje: number;

  // Optional scope by catalog hierarchy — the owner can choose ANY of the 4
  // levels (e.g. only Familia = the whole Familia; Familia+Subfamilia = only
  // that Subfamilia; all 4 = one specific Subtipo). They are not required to
  // form a complete chain as in Producto: here each level is an independent
  // filter, and all are optional — a rule with none applies to the whole
  // catalog.
  @IsOptional()
  @IsUUID()
  familiaId?: string;

  @IsOptional()
  @IsUUID()
  subfamiliaId?: string;

  @IsOptional()
  @IsUUID()
  tipoId?: string;

  @IsOptional()
  @IsUUID()
  subtipoId?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidadMinima?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
