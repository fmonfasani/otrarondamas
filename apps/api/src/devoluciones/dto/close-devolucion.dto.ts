import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/* eslint-disable indent */

/**
 * OR-B4-035 — closing a return without refunding it, always with a reason:
 * cancel (rule 10, before the products are received) or reject after inspection (rule 3).
 */
export class CloseDevolucionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}
