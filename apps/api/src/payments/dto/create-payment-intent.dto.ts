import { IsString, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CurrencyEnum {
  ARS = 'ARS',
  USD = 'USD',
  BRL = 'BRL',
}

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Venta ID' })
  @IsString()
  ventaId: string;

  @ApiProperty({ description: 'Amount in cents (100 = $1.00)' })
  @IsNumber()
  monto: number;

  @ApiProperty({ enum: CurrencyEnum, default: CurrencyEnum.ARS })
  @IsEnum(CurrencyEnum)
  @IsOptional()
  moneda: CurrencyEnum = CurrencyEnum.ARS;

  @ApiProperty({ required: false, description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
