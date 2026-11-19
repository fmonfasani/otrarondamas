import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/* eslint-disable indent */
/**
 * OR-B4-046 — publish or unpublish many products at once: the ones picked in the list, or a whole
 * category. Exactly one of `ids` and `familiaId`.
 */
export class PublishProductsDto {
  @IsBoolean()
  publicado: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  ids?: string[];

  @IsOptional()
  @IsUUID()
  familiaId?: string;
}
/* eslint-enable indent */
