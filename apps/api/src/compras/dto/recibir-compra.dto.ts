import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { RecibirCompraItemDto } from './recibir-compra-item.dto';

/* eslint-disable indent */
export class RecibirCompraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecibirCompraItemDto)
  items: RecibirCompraItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
