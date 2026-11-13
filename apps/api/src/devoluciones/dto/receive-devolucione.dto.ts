import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * OR-B4-034 — what happens with each returned product once it is back and inspected:
 * REINGRESO puts it back on sale (stock returns to the lots it left), DESCARTE keeps it
 * out of the available stock.
 */
export const RETURN_DESTINATIONS = ['REINGRESO', 'DESCARTE'] as const;
export type ReturnDestination = (typeof RETURN_DESTINATIONS)[number];

/* eslint-disable indent */
export class ReceiveDevolucionItemDto {
  @IsUUID()
  itemId: string;

  @IsIn(RETURN_DESTINATIONS)
  destino: ReturnDestination;
}

export class ReceiveDevolucionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveDevolucionItemDto)
  items: ReceiveDevolucionItemDto[];

  /** Notes from the inspection (state of the product, who brought it, etc.). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition_check?: string;
}
