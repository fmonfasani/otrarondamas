import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/* eslint-disable indent */

export class AuthorizeDevolucionDto {
  @IsEnum(['accepted', 'partial'])
  condition: 'accepted' | 'partial';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
