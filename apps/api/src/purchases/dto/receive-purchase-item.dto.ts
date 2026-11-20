import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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

  // OR-B4-046 rule 9 (D9): only a product that controls expiry needs the lot's date (the
  // service checks it); the rest enter without one and leave in arrival order.
  @IsOptional()
  @IsDateString()
  vencimiento?: string;

  // Identifier of the physical batch (e.g. the one on the supplier's delivery note). Optional:
  // without it, the reception names the lot (REC-<day>-<reception>).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  numeroLote?: string;
}
