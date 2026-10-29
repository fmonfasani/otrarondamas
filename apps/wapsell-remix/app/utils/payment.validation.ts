import { z } from 'zod';

/**
 * Zod schemas for payment validation
 * Discriminated union for different payment methods
 */

const baseCashSchema = z.object({
  method: z.literal('CASH'),
  amount: z.number().positive('Amount must be positive'),
  amountReceived: z.number().positive('Amount received must be positive').optional(),
});

const baseCardSchema = z.object({
  method: z.literal('CARD'),
  cardNumber: z.string().regex(/^\d{13,19}$/, 'Valid card number required (13-19 digits)'),
  cardholderName: z.string().min(2, 'Cardholder name required'),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024).max(2099),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3-4 digits'),
  amount: z.number().positive('Amount must be positive'),
  installments: z.number().min(1).max(12).optional(),
});

const baseMixedSchema = z.object({
  method: z.literal('MIXED'),
  cashAmount: z.number().nonnegative('Cash amount cannot be negative'),
  cardAmount: z.number().nonnegative('Card amount cannot be negative'),
  cardNumber: z.string().regex(/^\d{13,19}$/).optional(),
  cardholderName: z.string().min(2).optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2024).max(2099).optional(),
  cvv: z.string().regex(/^\d{3,4}$/).optional(),
  installments: z.number().min(1).max(12).optional(),
  amountReceived: z.number().positive().optional(),
  change: z.number().nonnegative().optional(),
});

const baseQRSchema = z.object({
  method: z.literal('QR'),
  amount: z.number().positive('Amount must be positive'),
  qrReference: z.string().min(1, 'QR reference required'),
  provider: z.enum(['MERCADO_PAGO', 'OTHER']),
});

/**
 * Cash payment schema with validation
 */
export const CashPaymentSchema = baseCashSchema.refine(
  (data) => {
    if (data.amountReceived === undefined) return true;
    return data.amountReceived >= data.amount;
  },
  {
    message: 'Amount received must be >= amount to pay',
    path: ['amountReceived'],
  }
);

/**
 * Card payment schema with expiry validation
 */
export const CardPaymentSchema = baseCardSchema.refine(
  (data) => {
    const now = new Date();
    const cardExpiry = new Date(data.expiryYear, data.expiryMonth - 1);
    return cardExpiry > now;
  },
  {
    message: 'Card has expired',
    path: ['expiryMonth'],
  }
);

/**
 * Mixed payment schema: ensure card fields are present if cardAmount > 0
 */
export const MixedPaymentSchema = baseMixedSchema.refine(
  (data) => {
    if (data.cardAmount === 0) return true;
    return (
      !!data.cardNumber &&
      !!data.cardholderName &&
      data.expiryMonth !== undefined &&
      data.expiryYear !== undefined &&
      !!data.cvv
    );
  },
  {
    message: 'Card details required when paying with card',
    path: ['cardNumber'],
  }
).refine(
  (data) => {
    if (!data.expiryMonth || !data.expiryYear) return true;
    const now = new Date();
    const cardExpiry = new Date(data.expiryYear, data.expiryMonth - 1);
    return cardExpiry > now;
  },
  {
    message: 'Card has expired',
    path: ['expiryMonth'],
  }
).refine(
  (data) => {
    if (data.amountReceived === undefined) return true;
    return data.amountReceived >= data.cashAmount;
  },
  {
    message: 'Amount received must be >= cash amount',
    path: ['amountReceived'],
  }
);

/**
 * QR payment schema
 */
export const QRPaymentSchema = baseQRSchema;

/**
 * Discriminated union of all payment methods
 */
export const PaymentSchema = z.discriminatedUnion('method', [
  CashPaymentSchema,
  CardPaymentSchema,
  MixedPaymentSchema,
  QRPaymentSchema,
]);

/**
 * Complete payment form schema with line items
 */
export const PaymentFormSchema = z.object({
  payment: PaymentSchema,
  idempotencyKey: z.string().uuid('Valid UUID required for idempotency').optional(),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;
export type PaymentFormInput = z.infer<typeof PaymentFormSchema>;
