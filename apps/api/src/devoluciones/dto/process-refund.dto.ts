import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/* eslint-disable indent */

/** OR-B4-035 rule 7 — how much goes back by one of the methods the sale was paid with. */
export class RefundSplitDto {
  @IsIn(['efectivo', 'transferencia', 'QR', 'MERCADOPAGO'])
  metodo: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;
}

export class ProcessRefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /**
   * OR-B4-035 rule 3 — a partial refund: the amount decided after inspection. It can never
   * exceed what the return is worth nor what is left to refund of the sale.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  /**
   * OR-B4-035 rule 7 — a sale paid with several methods: the amount for each. Their sum is the
   * refund; each one no more than what was paid by that method.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundSplitDto)
  splits?: RefundSplitDto[];
}
