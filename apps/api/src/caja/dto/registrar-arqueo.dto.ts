import { IsNumber, IsUUID, Min } from 'class-validator';

// RF-09: "arqueo confirmado por vendedor saliente y entrante" — el
// usuario que registra la request (usuarioSaliente, ver auth) más
// usuarioEntranteId explícito en el body. El schema actual (ArqueoCaja)
// NO tiene un campo separado para "entrante" — ver la limitación
// documentada en caja.service.ts sobre esta brecha real del modelo.
/* eslint-disable indent */
export class RegistrarArqueoDto {
  @IsUUID()
  usuarioEntranteId: string;

  @IsNumber()
  @Min(0)
  efectivoContado: number;
}
