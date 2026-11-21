import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

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

  /** OR-B4-052: 11 digits, with or without dashes; the check digit is verified. */
  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsIn(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL'])
  condicionIva?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO' | 'CONSUMIDOR_FINAL';

  /** Days to pay: 0 is cash. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  plazoPagoDias?: number;
}
