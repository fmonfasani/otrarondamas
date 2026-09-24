import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateVentaItemDto } from './create-venta-item.dto';

const CANALES_VALIDOS = ['presencial', 'mayorista', 'online'] as const;

/* eslint-disable indent */
export class CreateVentaDto {
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

  // Inc-1 (INV-VTA-07): UUID v4 generado por el frontend antes de confirmar.
  // Reintento con la misma clave devuelve la venta ya creada sin duplicar stock.
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
