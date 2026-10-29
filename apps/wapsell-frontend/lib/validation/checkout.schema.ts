import { z } from 'zod';

/**
 * Zod validation schemas for checkout flow
 * - Shipping address validation
 * - Shipping method validation
 * - Payment method validation (discriminated union)
 * - Order review validation
 */

export const ShippingAddressSchema = z.object({
  street: z.string().min(5, 'Street address is required (min 5 characters)'),
  city: z.string().min(2, 'City is required (min 2 characters)'),
  postalCode: z.string().min(3, 'Postal code is required (min 3 characters)'),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{6,}$/, 'Valid phone number is required'),
  country: z.string().length(2, 'Country code is required (ISO 2-letter)'),
  state?: z.string().optional(),
  apartment?: z.string().optional(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

export const ShippingMethodSchema = z.enum(['standard', 'express', 'pickup']);

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

export const PaymentMethodSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('card'),
    cardNumber: z.string().regex(/^\d{16}$/, 'Valid 16-digit card number required'),
    cardholderName: z.string().min(3, 'Cardholder name is required'),
    expiryMonth: z.number().min(1).max(12),
    expiryYear: z.number().min(2024),
    cvv: z.string().regex(/^\d{3,4}$/, 'Valid CVV required (3-4 digits)'),
  }),
  z.object({
    type: z.literal('paypal'),
    email: z.string().email('Valid PayPal email required'),
  }),
  z.object({
    type: z.literal('mercadopago'),
    // MercadoPago will handle payment details via their hosted form
  }),
  z.object({
    type: z.literal('bank_transfer'),
    bankName: z.string().min(2, 'Bank name is required'),
    accountNumber: z.string().min(8, 'Account number is required'),
  }),
]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CheckoutSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  shippingMethod: ShippingMethodSchema,
  paymentMethod: PaymentMethodSchema,
});

export type CheckoutFormData = z.infer<typeof CheckoutSchema>;

/**
 * Helper function to validate a partial checkout form
 * Used for step-by-step validation
 */
export function validateCheckoutStep(
  step: 'shipping' | 'shippingMethod' | 'payment' | 'review',
  data: any
): { valid: boolean; errors?: Record<string, string> } {
  switch (step) {
    case 'shipping':
      const shippingResult = ShippingAddressSchema.safeParse(data);
      return {
        valid: shippingResult.success,
        errors: shippingResult.success
          ? undefined
          : Object.fromEntries(
              Object.entries(shippingResult.error.flatten().fieldErrors).map(
                ([key, errors]) => [key, errors?.[0] || '']
              )
            ),
      };

    case 'shippingMethod':
      const methodResult = ShippingMethodSchema.safeParse(data);
      return { valid: methodResult.success };

    case 'payment':
      const paymentResult = PaymentMethodSchema.safeParse(data);
      return {
        valid: paymentResult.success,
        errors: paymentResult.success
          ? undefined
          : { payment: 'Invalid payment method' },
      };

    case 'review':
      const reviewResult = CheckoutSchema.safeParse(data);
      return { valid: reviewResult.success };

    default:
      return { valid: false };
  }
}
