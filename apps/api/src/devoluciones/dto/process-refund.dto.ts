import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/* eslint-disable indent */

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
}
