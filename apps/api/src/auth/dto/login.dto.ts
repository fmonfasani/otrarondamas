import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// ESLint's base `indent` rule does not correctly recognise class properties
// preceded by a decorator (known false positive); it is disabled locally in
// this file, not in the global config.
/* eslint-disable indent */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  // OR-B4-044: the «remember this device» token from a previous second-factor check.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dispositivo?: string;
}
