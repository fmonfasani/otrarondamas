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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
