import { IsIn, IsNumber, IsPositive } from 'class-validator';

// RF-08 lists cash/transfer/QR/Mercado Pago as the planned payment
// methods. Mercado Pago is explicitly left out of this DTO: D-03 does not
// yet have the integration modality defined (Checkout Pro, Checkout API or
// other), and the scaffolding prompt itself forbade implementing any real
// payment gateway integration without that decision.
const MANUAL_METHODS = ['efectivo', 'transferencia', 'QR'] as const;

/* eslint-disable indent */
export class CreatePaymentDto {
  @IsIn(MANUAL_METHODS)
  medio: (typeof MANUAL_METHODS)[number];

  @IsNumber()
  @IsPositive()
  monto: number;
}
