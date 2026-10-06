import { IsNumber, IsPositive } from 'class-validator';

/* eslint-disable indent */
export class OpenCashRegisterDto {
  @IsNumber()
  @IsPositive()
  montoInicial: number;
}
