import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

/* eslint-disable indent */
/** OR-B4-054, fase 2b — how the customer receives the order. */
export class DeliveryChoiceDto {
  @IsIn(['RETIRO', 'ENVIO'])
  tipo: 'RETIRO' | 'ENVIO';

  @ValidateIf((o: DeliveryChoiceDto) => o.tipo === 'ENVIO')
  @IsString()
  @MinLength(3, { message: 'Escribí la dirección de entrega.' })
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  indicaciones?: string;

  @ValidateIf((o: DeliveryChoiceDto) => o.tipo === 'ENVIO')
  @IsNumber()
  lat?: number;

  @ValidateIf((o: DeliveryChoiceDto) => o.tipo === 'ENVIO')
  @IsNumber()
  lng?: number;
}

/**
 * STORE-V1-03 — order of a signed-in store customer. Only the items and how to receive it: the
 * name, email and phone come from the customer's account, never from the request.
 */
export class CustomerOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryChoiceDto)
  entrega?: DeliveryChoiceDto;
}

/** A buyer's saved address (OR-B4-054, fase 2b). */
export class SaveAddressDto {
  @IsString()
  @MinLength(1, { message: 'Poné un nombre a la dirección, por ejemplo «Casa».' })
  @MaxLength(40)
  etiqueta: string;

  @IsString()
  @MinLength(3, { message: 'Escribí la dirección.' })
  @MaxLength(200)
  direccion: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  indicaciones?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
