import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/* eslint-disable indent -- known false positive of the base `indent` rule with decorators */
export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña puede tener hasta 72 caracteres.' })
  password: string;
}
