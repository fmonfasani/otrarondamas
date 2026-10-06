import { IsInt, IsNotEmpty, IsString, IsUUID, NotEquals } from 'class-validator';

/* eslint-disable indent -- known false positive of the base ESLint
   `indent` rule with TypeScript decorators on class properties (it does
   not understand `@Decorator()` before a property) — same pattern already
   used in the rest of the project DTOs (see cash-register/dto,
   sales/dto/create-sale.dto.ts, auth/dto/login.dto.ts). */

// INV-AJ-01: the adjustment is on a specific batch, chosen by the user
// (not a batch the system resolves automatically, unlike
// SalesService.deductStock(), which does resolve it via FIFO — here the
// use case is 'I physically counted and this specific batch has a
// difference', so the batch is an input, not something to infer).
export class RegisterAdjustmentDto {
  @IsUUID()
  loteId: string;

  // Variation, not resulting total: positive adds stock, negative
  // subtracts it. 0 is explicitly rejected (@NotEquals): an adjustment that
  // changes nothing makes no sense as an operation.
  @IsInt()
  @NotEquals(0)
  cantidad: number;

  // Reason is mandatory and free text, auditable (INV-AJ-01) — not a closed
  // enum as in the cash register (Ingreso/Egreso/Gasto/Retiro), because the
  // real reason for an adjustment ('physical count', 'damaged product',
  // 'initial load error') is not catalogued yet and it is not appropriate to
  // invent a taxonomy without the owner's confirmation.
  @IsString()
  @IsNotEmpty()
  motivo: string;
}
