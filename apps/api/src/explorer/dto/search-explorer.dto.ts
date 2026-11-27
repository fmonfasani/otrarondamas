import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SEARCH_ORDERS, type SearchOrder } from '../explorer-search';

/* eslint-disable indent */
/**
 * Marketplace, step 3 — what the customer asks Wapsell's search. Everything is optional and
 * travels in the link, so a search with its filters can be shared.
 */
export class SearchExplorerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  rubro?: string;

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

  /** «En oferta»: an offer or the product's discount lowers its price today. */
  @IsOptional()
  @IsIn(['1', 'true'])
  oferta?: string;

  /** «Abierto ahora», by the store's opening hours. */
  @IsOptional()
  @IsIn(['1', 'true'])
  abierto?: string;

  @IsOptional()
  @IsIn(SEARCH_ORDERS)
  orden?: SearchOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pagina?: number;
}
