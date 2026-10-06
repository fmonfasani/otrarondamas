import { IsOptional, IsString } from 'class-validator';

/**
 * All fields optional at DTO level — what is mandatory varies according to
 * the role of whoever completes the dossier (see docs/spec-login-roles.md,
 * section 3): Owner only asks for fiscal data, Assistant/Delivery only
 * personal data, Supplier fiscal data + invoice type, etc.
 * DossierService.verifyRoleComplete() is the only place that decides which
 * fields each role requires before allowing the dossier to be approved —
 * nothing is inferred or computed here.
 */
/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class UpdateDossierDto {
  // Datos fiscales — Owner, Proveedor, Cliente mayorista.
  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  condicionIva?: string;

  // Supplier only.
  @IsOptional()
  @IsString()
  tipoFactura?: string;

  // Personal data — Local assistant, Delivery person.
  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  // Delivery person only.
  @IsOptional()
  @IsString()
  vehiculoDatos?: string;

  @IsOptional()
  @IsString()
  licenciaConducir?: string;
}
