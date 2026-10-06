import { IsString, MinLength } from 'class-validator';

/**
 * Activation of a wholesale Cliente's invitation — creates the real
 * Cliente with esMayorista=true and estadoLegajo=PENDIENTE. Unlike
 * ActivateInvitationDto (for Usuario), it needs no `rol` because the
 * account type is already determined by the flow (it is always a wholesale
 * Cliente).
 */
/* eslint-disable indent */
export class ActivateWholesaleInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(8)
  password: string;
}
