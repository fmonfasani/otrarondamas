import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/* eslint-disable indent */

export class ReceiveDevolucionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  condition_check: string;
}
