import { UnidadBase } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/* eslint-disable indent */
export class CreateProductoDto {
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

  @IsUUID()
  categoriaId: string;

  @IsEnum(UnidadBase)
  unidadBase: UnidadBase;

  @IsNumber()
  @IsPositive()
  costo: number;

  @IsNumber()
  @IsPositive()
  precioMinorista: number;

  // D-01: nullable hasta que se defina la regla de precios mayoristas —
  // se acepta si se manda, pero nunca se calcula por suposición.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precioMayorista?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
