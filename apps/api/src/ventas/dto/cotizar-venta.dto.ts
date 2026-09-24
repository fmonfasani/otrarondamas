import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateVentaItemDto } from './create-venta-item.dto';

const CANALES_VALIDOS = ['presencial', 'mayorista', 'online'] as const;

/* eslint-disable indent */
export class CotizarVentaDto {
  @IsIn(CANALES_VALIDOS)
  canal: (typeof CANALES_VALIDOS)[number];

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];
}
