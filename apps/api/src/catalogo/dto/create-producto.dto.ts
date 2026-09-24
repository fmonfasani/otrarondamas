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

  // Los 4 niveles de la jerarquía de catálogo son obligatorios siempre
  // (ver schema.prisma model Producto) — se usa el nodo "GEN" de
  // Tipo/Subtipo cuando el rubro no necesita más detalle que
  // Familia/Subfamilia. No hay jerarquía "parcial": un producto sin
  // Tipo/Subtipo explícito igual apunta a un Tipo/Subtipo real (el GEN
  // de su Subfamilia), nunca a null.
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

  // D-01: nullable hasta que se defina la regla de precios mayoristas —
  // se acepta si se manda, pero nunca se calcula por suposición.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precioMayorista?: number;

  // Fase 6 de Tienda Online (RF-06/RF-04): descuento único, global y
  // por porcentaje sobre precioMinorista. 0-100, sin tope de negocio
  // propio — ver comentario en schema.prisma.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
