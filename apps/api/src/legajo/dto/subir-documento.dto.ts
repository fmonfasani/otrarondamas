import { IsDateString, IsEnum } from 'class-validator';

// TipoDocumentoLegajo del schema, repetido acá como array de valores
// para @IsEnum — class-validator necesita el enum en tiempo de
// ejecución, no solo el tipo.
export const TIPOS_DOCUMENTO_LEGAJO = ['ANTECEDENTES_PENALES', 'CONSTANCIA_CUIL'] as const;

/* eslint-disable indent -- falso positivo conocido de la regla `indent`
   base con decorators en propiedades de clase, ver el resto de los DTOs
   del proyecto (caja/dto, catalogo/dto, compras/dto, etc.) */
export class SubirDocumentoDto {
  @IsEnum(TIPOS_DOCUMENTO_LEGAJO)
  tipo: (typeof TIPOS_DOCUMENTO_LEGAJO)[number];

  // La persona que sube el documento carga la fecha de vencimiento real
  // que figura en él (D-20, docs/SDD-especificacion-funcional-v0.1.md)
  // — el sistema nunca calcula ni asume una vigencia por defecto.
  @IsDateString()
  vencimiento: string;
}
