import { IsDateString, IsNumber, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

/* eslint-disable indent */
export class ReceivePurchaseItemDto {
  // References CompraItem.id (not productoId): a Compra can have at most one
  // CompraItem per product (see create-purchase.dto.ts, no duplicate
  // validation yet — explicit TODO there), so referencing by id avoids
  // ambiguity if that changes later.
  @IsUUID()
  compraItemId: string;

  // Quantity received IN THIS receipt (not the accumulated total). With
  // partial receipt, there can be more than one RecepcionCompra per Compra —
  // each one adds to CompraItem.cantidadRecibida, never replaces it.
  @IsNumber()
  @IsPositive()
  cantidadRecibida: number;

  // D-09: required field in Lote.vencimiento (not nullable in the schema) —
  // every receipt must declare an expiry, even a distant one for
  // non-perishable products (same criterion already used in the seed for the
  // demo catalog).
  @IsDateString()
  vencimiento: string;

  // Free-text identifier of the physical batch entering with this receipt
  // (e.g. the one on the supplier's delivery note). No default value is
  // invented — D-07/D-08 of the SDD: 'equivalences are not computed by
  // assumption'.
  @IsString()
  @MinLength(1)
  numeroLote: string;
}
