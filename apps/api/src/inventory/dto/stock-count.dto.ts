import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent -- same false positive with property decorators as the other DTOs */

/**
 * One counted row of a physical count (OR-B4-046, D8). A product that controls expiry is counted lot
 * by lot: an existing lot (`loteId`), or a lot the count found and the system did not have
 * (`vencimiento`, with `cantidadSistema` 0). Any other product is counted as a whole.
 */
export class StockCountItemDto {
  @IsUUID()
  productoId: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsDateString()
  vencimiento?: string;

  // Only for a lot found in the count; without it, the count names the lot (CONTEO-<day>-<count>).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  numeroLote?: string;

  // What the screen showed when the person counted. If the stock changed since, the count is refused
  // instead of overwriting a sale or a reception that happened in between.
  @IsNumber()
  @Min(0)
  cantidadSistema: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  cantidadContada: number;
}

export class StockCountDto {
  // Optional note: where or why the count was made («depósito», «cierre de mes»).
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nota?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StockCountItemDto)
  items: StockCountItemDto[];
}
