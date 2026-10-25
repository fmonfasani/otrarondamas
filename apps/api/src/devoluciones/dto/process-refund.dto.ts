import { IsOptional, IsString, MaxLength } from 'class-validator';

/* eslint-disable indent */

export class ProcessRefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
