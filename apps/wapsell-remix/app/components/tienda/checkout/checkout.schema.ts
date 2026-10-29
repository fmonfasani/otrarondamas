/**
 * Checkout validation schema using Zod
 * Validates all checkout form data across multiple steps
 */

import { z } from 'zod';

// Shipping address validation
export const ShippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  saveAsDefault: z.boolean().optional(),
});

export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

// Shipping method validation
export const ShippingMethodSchema = z.object({
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP'], {
    errorMap: () => ({ message: 'Select a valid shipping method' }),
  }),
});

export type ShippingMethodInput = z.infer<typeof ShippingMethodSchema>;

// Payment method validation
export const PaymentMethodSchema = z.object({
  paymentMethod: z.enum(['CARD', 'PAYPAL', 'MERCADOPAGO', 'TRANSFER'], {
    errorMap: () => ({ message: 'Select a valid payment method' }),
  }),
});

export type PaymentMethodInput = z.infer<typeof PaymentMethodSchema>;

// Card details validation (only required when CARD is selected)
export const CardDetailsSchema = z.object({
  cardNumber: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  expiryMonth: z.number().min(1).max(12, 'Invalid month'),
  expiryYear: z.number().min(2024, 'Card expired'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
});

export type CardDetailsInput = z.infer<typeof CardDetailsSchema>;

// Coupon code validation
export const CouponCodeSchema = z.object({
  couponCode: z.string().min(1).optional(),
});

export type CouponCodeInput = z.infer<typeof CouponCodeSchema>;

// Complete checkout form validation
export const CheckoutSchema = z.object({
  // Shipping address
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  saveAsDefault: z.boolean().optional(),

  // Shipping method
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),

  // Payment method
  paymentMethod: z.enum(['CARD', 'PAYPAL', 'MERCADOPAGO', 'TRANSFER']),

  // Card details (conditional - only if paymentMethod is CARD)
  cardNumber: z.string().optional(),
  cardholderName: z.string().optional(),
  expiryMonth: z.number().optional(),
  expiryYear: z.number().optional(),
  cvv: z.string().optional(),

  // Coupon code
  couponCode: z.string().optional(),
}).refine(
  (data) => {
    // If payment method is CARD, validate card details
    if (data.paymentMethod === 'CARD') {
      return (
        data.cardNumber &&
        data.cardholderName &&
        data.expiryMonth &&
        data.expiryYear &&
        data.cvv
      );
    }
    return true;
  },
  {
    message: 'Card details are required when paying by card',
    path: ['cardNumber'],
  }
);

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

// Shipping cost configuration
export const SHIPPING_COSTS = {
  STANDARD: { days: '5-7', cost: 5.99 },
  EXPRESS: { days: '2-3', cost: 14.99 },
  PICKUP: { days: '0', cost: 0 },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_COSTS;

// Shipping method info type
export interface ShippingMethodInfo {
  method: ShippingMethod;
  days: string;
  cost: number;
  label: string;
  description: string;
}
