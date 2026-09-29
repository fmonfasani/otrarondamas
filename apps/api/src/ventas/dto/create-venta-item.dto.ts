import { IsNumber, IsPositive, IsUUID, IsOptional, Min } from 'class-validator';

/* eslint-disable indent */
export class CreateVentaItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuentoItem?: number;
}
