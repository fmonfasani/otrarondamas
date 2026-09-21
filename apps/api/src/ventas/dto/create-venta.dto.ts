import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateVentaItemDto } from './create-venta-item.dto';

// Canales del RF-05/RF-06: presencial, mayorista, online. No incluye
// pagos mixtos ni Mercado Pago todavía (RF-08, incremento aparte).
const CANALES_VALIDOS = ['presencial', 'mayorista', 'online'] as const;

/* eslint-disable indent */
export class CreateVentaDto {
  @IsIn(CANALES_VALIDOS)
  canal: (typeof CANALES_VALIDOS)[number];

  @IsOptional()
  @IsUUID()
  clienteId?: string; // RF-05: "permitir ventas sin identificar al cliente"

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];
}
