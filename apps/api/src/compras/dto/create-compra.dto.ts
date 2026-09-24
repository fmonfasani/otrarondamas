import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateCompraItemDto } from './create-compra-item.dto';

/* eslint-disable indent */
export class CreateCompraDto {
  @IsUUID()
  proveedorId: string;

  @IsOptional()
  @IsDateString()
  fechaRecepcionEsperada?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCompraItemDto)
  items: CreateCompraItemDto[];
}
