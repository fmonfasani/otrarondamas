import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const ESTADOS_COBRO = ['PENDIENTE', 'PARCIAL', 'COBRADA'] as const;

export class ListarVentasDto {
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @IsIn(ESTADOS_COBRO) estadoCobro?: (typeof ESTADOS_COBRO)[number];
  @IsOptional() @IsUUID() usuarioId?: string;
  @IsOptional() @IsUUID() clienteId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() @Max(50) pageSize?: number;
}
