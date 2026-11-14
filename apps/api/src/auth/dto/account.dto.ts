import { IsString, MaxLength, MinLength } from 'class-validator';

/* eslint-disable indent */

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  actual: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  nueva: string;
}
