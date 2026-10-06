import { IsNumber, IsUUID, Min } from 'class-validator';

// RF-09: 'cash count confirmed by outgoing and incoming seller' — the user
// who makes the request (usuarioSaliente, see auth) plus an explicit
// usuarioEntranteId in the body. The current schema (ArqueoCaja) has NO
// separate field for 'incoming' — see the limitation documented in
// cash-register.service.ts about this real gap in the model.
/* eslint-disable indent */
export class RegisterCashCountDto {
  @IsUUID()
  usuarioEntranteId: string;

  @IsNumber()
  @Min(0)
  efectivoContado: number;
}
