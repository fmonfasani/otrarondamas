import { IsDateString, IsEnum } from 'class-validator';

// TipoDocumentoLegajo from the schema, repeated here as an array of values
// for @IsEnum — class-validator needs the enum at runtime, not just the
// type.
export const DOSSIER_DOCUMENT_TYPES = ['ANTECEDENTES_PENALES', 'CONSTANCIA_CUIL'] as const;

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties, see the rest of the project DTOs
   (cash-register/dto, catalog/dto, purchases/dto, etc.) */
export class UploadDocumentDto {
  @IsEnum(DOSSIER_DOCUMENT_TYPES)
  tipo: (typeof DOSSIER_DOCUMENT_TYPES)[number];

  // The person uploading the document enters the real expiration date shown
  // on it (D-20, docs/SDD-especificacion-funcional-v0.1.md) — the system
  // never computes or assumes a default validity.
  @IsDateString()
  vencimiento: string;
}
