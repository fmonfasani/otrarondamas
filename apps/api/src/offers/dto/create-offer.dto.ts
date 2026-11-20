import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/* eslint-disable indent */
/**
 * OR-B4-046 §4.4 (D4), stage C3 — a percent off or an offer price, between two days (both
 * included, Argentina time), for some products or (percent only) a whole category.
 */
export class CreateOfferDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @IsIn(['PORCENTAJE', 'PRECIO'])
  tipo: 'PORCENTAJE' | 'PRECIO';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(99)
  descuentoPorcentaje?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precioOferta?: number;

  @Matches(DAY, { message: 'desde tiene que ser una fecha AAAA-MM-DD' })
  desde: string;

  @Matches(DAY, { message: 'hasta tiene que ser una fecha AAAA-MM-DD' })
  hasta: string;

  @IsOptional()
  @IsBoolean()
  soloTienda?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  productoIds?: string[];

  @IsOptional()
  @IsUUID()
  familiaId?: string;
}
