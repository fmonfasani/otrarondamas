import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Most products one bulk update may change at once. */
export const BULK_PRICE_MAX = 2000;

/* eslint-disable indent */
/**
 * OR-B4-046 §4.3, stage C2 — which products (by category, brand or supplier; none of them means
 * every active product) and the rule: a percent over the current price, or the cost plus a markup.
 */
export class BulkPriceDto {
  @IsOptional()
  @IsUUID()
  familiaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  marca?: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsIn(['porcentaje', 'margen'])
  modo: 'porcentaje' | 'margen';

  /** Percent: -90 to 1000 over the price; margin: 0 to 1000 over the cost. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-90)
  @Max(1000)
  valor: number;

  @IsIn([1, 10, 100])
  redondeo: 1 | 10 | 100;
}

export class BulkPriceItemDto {
  @IsUUID()
  productoId: string;

  /** The price the person saw in the preview: if it changed since, nothing is applied. */
  @IsNumber({ maxDecimalPlaces: 2 })
  precioActual: number;
}

/** The rule again, and the products of the preview the person confirms. */
export class ApplyBulkPriceDto extends BulkPriceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_PRICE_MAX)
  @ValidateNested({ each: true })
  @Type(() => BulkPriceItemDto)
  items: BulkPriceItemDto[];
}
