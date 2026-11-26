import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';

/* eslint-disable indent */

/** E6b — one automatic message: on or off, and its text. */
export class AutoMessageDto {
  @IsBoolean()
  activo: boolean;

  @IsString()
  @MaxLength(1000)
  texto: string;
}

/**
 * E6b — the greeting, the away message and the hours: for each weekday (0 is Sunday) up to 2
 * turns «HH:MM»–«HH:MM». The service checks the turns (auto-replies.ts).
 */
export class AutoRepliesDto {
  @ValidateNested()
  @Type(() => AutoMessageDto)
  bienvenida: AutoMessageDto;

  @ValidateNested()
  @Type(() => AutoMessageDto)
  ausencia: AutoMessageDto;

  @IsObject()
  horario: Record<string, unknown>;
}
