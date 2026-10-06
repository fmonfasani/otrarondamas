import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ReceivePurchaseItemDto } from './receive-purchase-item.dto';

/* eslint-disable indent */
export class ReceivePurchaseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items: ReceivePurchaseItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
