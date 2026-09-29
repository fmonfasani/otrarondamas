import { IsNumber, IsPositive } from 'class-validator';

/* eslint-disable indent */
export class AbrirCajaDto {
  @IsNumber()
  @IsPositive()
  montoInicial: number;
}
