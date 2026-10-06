import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  // Optional in the model (Cliente.email: String?) — unlike Proveedor, a
  // counter customer may have no email. When it IS sent, it must be a valid
  // email (same criterion as StoreService.createOrder(), which always
  // requires an email because there it is the only contact identifier of an
  // anonymous buyer).
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
