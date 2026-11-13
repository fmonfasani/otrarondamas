import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent */

export class ExchangeItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

/**
 * OR-B4-035 rule 2 — exchange instead of refund: the products the customer takes, and how
 * they pay the difference when the new products cost more than the credit.
 */
export class ExchangeDevolucionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExchangeItemDto)
  items: ExchangeItemDto[];

  @IsOptional()
  @IsIn(['efectivo', 'transferencia', 'QR'])
  medio?: 'efectivo' | 'transferencia' | 'QR';

  /** Cash handed over for the difference (change is computed by the sale). */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  montoRecibido?: number;
}
