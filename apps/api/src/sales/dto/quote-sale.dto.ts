import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateSaleItemDto } from './create-sale-item.dto';

const VALID_CHANNELS = ['presencial', 'mayorista', 'online'] as const;

/* eslint-disable indent */
export class QuoteSaleDto {
  @IsIn(VALID_CHANNELS)
  canal: (typeof VALID_CHANNELS)[number];

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  /** OR-B4-051 rule 1: the method the whole sale is paid with, which may carry a discount. */
  @IsOptional()
  @IsIn(['efectivo', 'transferencia', 'QR'])
  medioPago?: 'efectivo' | 'transferencia' | 'QR';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
