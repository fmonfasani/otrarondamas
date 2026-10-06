import { IsNumber, IsPositive, IsUUID } from 'class-validator';

/* eslint-disable indent */
export class CreatePurchaseItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidadPedida: number;

  @IsNumber()
  @IsPositive()
  costoUnitario: number;
}
