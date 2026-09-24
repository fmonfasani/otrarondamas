import { IsNumber, IsPositive, IsUUID } from 'class-validator';

/* eslint-disable indent */
export class CrearPedidoItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}
