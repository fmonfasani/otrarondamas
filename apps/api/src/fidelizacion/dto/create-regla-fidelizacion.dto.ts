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

/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class CreateReglaFidelizacionDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEnum(NivelFidelidad)
  nivelRequerido: NivelFidelidad;

  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje: number;

  // Alcance opcional por jerarquía de catálogo — el dueño puede elegir
  // CUALQUIERA de los 4 niveles (ej. solo Familia = toda la Familia;
  // Familia+Subfamilia = solo esa Subfamilia; los 4 = un Subtipo
  // puntual). No se exige que formen una cadena completa como en
  // Producto: acá cada nivel es un filtro independiente, y todos son
  // opcionales — una regla sin ninguno aplica a todo el catálogo.
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
