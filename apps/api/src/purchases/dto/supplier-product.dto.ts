import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent */
/** OR-B4-052: a product the supplier provides (its code, last cost, usual supplier). */
export class SaveSupplierProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigoProveedor?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costoUnitario?: number | null;

  @IsOptional()
  @IsBoolean()
  habitual?: boolean;
}

export class SuggestedItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  cantidad: number;
}

/** OR-B4-052: the products of the suggestion the person keeps, for one supplier. */
export class DraftFromSuggestionDto {
  @IsUUID()
  proveedorId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SuggestedItemDto)
  items: SuggestedItemDto[];
}
