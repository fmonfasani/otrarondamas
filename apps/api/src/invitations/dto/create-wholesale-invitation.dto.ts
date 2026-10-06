import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * RF-17: invitation to a wholesale Cliente (B2B). Unlike
 * CreateInvitationDto (which invites a Usuario with an explicit role), here
 * the result of activating is a Cliente with esMayorista=true, not a
 * Usuario.
 *
 * The trade name/legal name can optionally be included so that it is
 * already in the invitation record and it is not an empty shell.
 */
/* eslint-disable indent */
export class CreateWholesaleInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nombreComercial?: string;
}
