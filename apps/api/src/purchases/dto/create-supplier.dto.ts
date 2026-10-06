import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, etc.) */
export class CreateSupplierDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
