import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { LABEL_COLORS } from '../labels';

/* eslint-disable indent */

/** E6a — mute for 8 hours, a week, or always. */
export class MuteDto {
  @IsIn(['8h', '1w', 'siempre'])
  por: '8h' | '1w' | 'siempre';
}

/** E6a — give a customer chat to a team member. */
export class AssignDto {
  @IsUUID()
  userId: string;
}

/** E6a — a customer label: a name and one of the colours. */
export class LabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  nombre: string;

  @IsOptional()
  @IsIn(LABEL_COLORS as unknown as string[])
  color: string = 'gris';
}
