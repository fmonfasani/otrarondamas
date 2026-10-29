import { z } from 'zod';

/**
 * Cart item validation schemas
 */

/**
 * Cart item schema
 */
export const CartItemSchema = z.object({
  id: z.string().min(1, 'Item ID required'),
  productId: z.string().min(1, 'Product ID required'),
  quantity: z.number().int('Quantity must be integer').positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  lineTotal: z.number().nonnegative('Line total cannot be negative'),
});

export type CartItemInput = z.infer<typeof CartItemSchema>;

/**
 * Cart summary validation schema
 */
export const CartSummarySchema = z.object({
  items: z.array(CartItemSchema).min(1, 'Cart must contain at least one item'),
  subtotal: z.number().positive('Subtotal must be positive'),
  discount: z.number().nonnegative('Discount cannot be negative').optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  taxRate: z.number().nonnegative('Tax rate cannot be negative').optional(),
  tax: z.number().nonnegative('Tax cannot be negative').optional(),
  total: z.number().positive('Total must be positive'),
});

export type CartSummaryInput = z.infer<typeof CartSummarySchema>;

/**
 * Validation helper: check if cart item quantity is valid
 */
export function validateCartItemQuantity(
  quantity: number,
  maxStock: number = 999
): { valid: boolean; error?: string } {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be an integer' };
  }
  if (quantity < 1) {
    return { valid: false, error: 'Quantity must be at least 1' };
  }
  if (quantity > maxStock) {
    return { valid: false, error: `Quantity cannot exceed available stock (${maxStock})` };
  }
  return { valid: true };
}

/**
 * Validation helper: check if discount is valid
 */
export function validateDiscount(
  discount: number,
  subtotal: number,
  type: 'percentage' | 'fixed' = 'fixed'
): { valid: boolean; error?: string; amount: number } {
  let amount = discount;

  if (type === 'percentage') {
    if (discount < 0 || discount > 100) {
      return {
        valid: false,
        error: 'Discount percentage must be between 0 and 100',
        amount: 0,
      };
    }
    amount = subtotal * (discount / 100);
  } else {
    if (discount < 0) {
      return {
        valid: false,
        error: 'Discount amount cannot be negative',
        amount: 0,
      };
    }
    if (discount > subtotal) {
      return {
        valid: false,
        error: 'Discount cannot exceed subtotal',
        amount: 0,
      };
    }
    amount = discount;
  }

  return { valid: true, amount };
}

/**
 * Validation helper: check if cart totals are consistent
 */
export function validateCartTotals(
  subtotal: number,
  discount: number = 0,
  taxRate: number = 0,
  total: number = 0
): { valid: boolean; error?: string; expectedTotal: number } {
  if (subtotal < 0) {
    return { valid: false, error: 'Subtotal cannot be negative', expectedTotal: 0 };
  }

  if (discount < 0 || discount > subtotal) {
    return {
      valid: false,
      error: 'Discount is invalid',
      expectedTotal: 0,
    };
  }

  if (taxRate < 0) {
    return { valid: false, error: 'Tax rate cannot be negative', expectedTotal: 0 };
  }

  const taxableAmount = subtotal - discount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const expectedTotal = taxableAmount + taxAmount;

  // Allow small floating-point rounding difference (0.01)
  const difference = Math.abs(total - expectedTotal);
  if (difference > 0.01) {
    return {
      valid: false,
      error: `Total calculation mismatch (expected ${expectedTotal.toFixed(2)}, got ${total.toFixed(2)})`,
      expectedTotal,
    };
  }

  return { valid: true, expectedTotal };
}

/**
 * Validation helper: check if payment amount is sufficient
 */
export function validatePaymentAmount(
  paymentAmount: number,
  total: number
): { valid: boolean; error?: string; change: number } {
  if (paymentAmount < 0) {
    return {
      valid: false,
      error: 'Payment amount cannot be negative',
      change: 0,
    };
  }

  if (paymentAmount < total) {
    return {
      valid: false,
      error: `Insufficient payment. Missing: $${(total - paymentAmount).toFixed(2)}`,
      change: 0,
    };
  }

  const change = paymentAmount - total;
  return { valid: true, change };
}
