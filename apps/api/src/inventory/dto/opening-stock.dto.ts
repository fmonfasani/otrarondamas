import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent -- same false positive with property decorators as the other DTOs */

/**
 * One row of the opening stock (OR-B4-046, D8): the stock a business already has when it starts
 * using Wapsell, entered without inventing a purchase.
 */
export class OpeningStockItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidad: number;

  // Rule 9: only for a product that controls expiry, and required there (the service checks it).
  @IsOptional()
  @IsDateString()
  vencimiento?: string;

  // Optional: without it, the load names the lot (INI-<day>-<load>).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  numeroLote?: string;

  // ADR-DAT-009: the unit cost of what enters; without it, the product's current cost.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costoUnitario?: number;
}

export class OpeningStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => OpeningStockItemDto)
  items: OpeningStockItemDto[];
}
