import { IsEmail, IsString, MinLength } from 'class-validator';

// La regla `indent` base de ESLint no reconoce correctamente propiedades
// de clase precedidas por un decorador (falso positivo conocido); se
// desactiva puntualmente en este archivo, no en la config global.
/* eslint-disable indent */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
