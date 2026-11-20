import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ORDERS, type CatalogOrder } from '../store-catalog';

/* eslint-disable indent */
/**
 * OR-B4-047 — what the customer asks the store listing. Everything is optional and travels in the
 * link, so a search with its filters can be shared («bebidas de menos de $ 2.000»).
 */
export class BrowseCatalogDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** A category (Familia). */
  @IsOptional()
  @IsUUID()
  cat?: string;

  /** A subcategory (Subfamilia). */
  @IsOptional()
  @IsUUID()
  sub?: string;

  /** One or more brands (`marca=A&marca=B`). */
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  marca?: string[];

  /** Price range, in pesos, on the price the customer pays. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max?: number;

  /** «Con stock». */
  @IsOptional()
  @IsIn(['1', 'true'])
  stock?: string;

  /** «En oferta» (OR-B4-047, from stage C3): an offer or the product's discount lowers its price. */
  @IsOptional()
  @IsIn(['1', 'true'])
  oferta?: string;

  @IsOptional()
  @IsIn(ORDERS)
  orden?: CatalogOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pagina?: number;
}
/* eslint-enable indent */
