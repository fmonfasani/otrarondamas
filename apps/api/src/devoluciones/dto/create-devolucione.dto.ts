import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsNumber,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */

/** OR-B4-035 rule 6 — the fixed list of reasons Wapsell offers; OTRO needs a comment. */
export const RETURN_REASONS = {
  ROTO: 'Roto o dañado',
  VENCIDO: 'Vencido',
  PRODUCTO_EQUIVOCADO: 'Producto equivocado',
  NO_LE_GUSTO: 'No le gustó',
  OTRO: 'Otro',
} as const;
export type ReturnReason = keyof typeof RETURN_REASONS;

export class CreateDevolucionItemDto {
  @IsUUID()
  @IsNotEmpty()
  ventaItemId: string;

  @IsNumber()
  @Min(1)
  @IsInt()
  cantidad: number;

  @IsIn(Object.keys(RETURN_REASONS))
  motivoCodigo: ReturnReason;

  /** Free comment on the reason; required when the reason is OTRO. */
  @ValidateIf((o: CreateDevolucionItemDto) => o.motivoCodigo === 'OTRO' || o.motivo !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo?: string;
}

export class CreateDevolucionDto {
  @IsUUID()
  @IsNotEmpty()
  ventaId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevolucionItemDto)
  @ArrayMinSize(1)
  items: CreateDevolucionItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo_general?: string;

  /**
   * OR-B4-034: the customer the return belongs to, only when the sale has none
   * (a counter sale to "Consumidor final"). Ignored when the sale has a customer.
   */
  @IsOptional()
  @IsUUID()
  clienteId?: string;
}

/** OR-B4-035 rule 1 — a return asked for by the store customer; the sale comes from the URL. */
export class CustomerReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevolucionItemDto)
  @ArrayMinSize(1)
  items: CreateDevolucionItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo_general?: string;
}
