import { IsDateString, IsNumber, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

/* eslint-disable indent */
export class RecibirCompraItemDto {
  // References CompraItem.id (no productoId): una Compra puede tener
  // como máximo un CompraItem por producto (ver create-compra.dto.ts,
  // sin validación de duplicados todavía — TODO explícito ahí), así que
  // referenciar por id evita ambigüedad si eso cambia más adelante.
  @IsUUID()
  compraItemId: string;

  // Cantidad recibida EN ESTA recepción (no el acumulado). Con recepción
  // parcial, puede haber más de una RecepcionCompra por Compra — cada
  // una suma a CompraItem.cantidadRecibida, nunca la reemplaza.
  @IsNumber()
  @IsPositive()
  cantidadRecibida: number;

  // D-09: campo requerido en Lote.vencimiento (no nullable en el
  // schema) — toda recepción tiene que declarar un vencimiento, aunque
  // sea uno lejano para productos no perecederos (mismo criterio ya
  // usado en el seed para el catálogo demo).
  @IsDateString()
  vencimiento: string;

  // Identificador de texto libre del lote físico que entra con esta
  // recepción (ej. el que trae el remito del proveedor). No se inventa
  // un valor por defecto — D-07/D-08 del SDD: "no se calculan
  // equivalencias por suposición".
  @IsString()
  @MinLength(1)
  numeroLote: string;
}
