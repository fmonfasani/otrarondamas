import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CrearDevolucionItemDto {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsString()
  @IsOptional()
  loteId?: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  costoUnitario: number;
}

export class CrearDevolucionProveedorDto {
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearDevolucionItemDto)
  items: CrearDevolucionItemDto[];
}
