import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */

export class CreateDevolucionItemDto {
  @IsUUID()
  @IsNotEmpty()
  ventaItemId: string;

  @IsNumber()
  @Min(1)
  @IsInt()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}

export class CreateDevolucionDto {
  @IsUUID()
  @IsNotEmpty()
  ventaId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevolucionItemDto)
  @ArrayMinSize(1)
  items: CreateDevolucionItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo_general?: string;
}
