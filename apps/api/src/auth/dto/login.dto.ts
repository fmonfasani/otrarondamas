import { IsEmail, IsString, MinLength } from 'class-validator';

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
}
