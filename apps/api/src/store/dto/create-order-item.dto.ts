import { IsNumber, IsPositive, IsUUID } from 'class-validator';

/* eslint-disable indent */
export class CreateOrderItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}
