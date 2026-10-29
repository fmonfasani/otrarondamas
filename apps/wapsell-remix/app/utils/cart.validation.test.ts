import { describe, it, expect } from 'vitest';
import {
  validateCartItemQuantity,
  validateDiscount,
  validateCartTotals,
  validatePaymentAmount,
} from './cart.validation';

describe('Cart Validation', () => {
  describe('validateCartItemQuantity', () => {
    it('should validate valid quantity', () => {
      const result = validateCartItemQuantity(5, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject quantity less than 1', () => {
      const result = validateCartItemQuantity(0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1');
    });

    it('should reject quantity greater than maxStock', () => {
      const result = validateCartItemQuantity(101, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should reject non-integer quantity', () => {
      const result = validateCartItemQuantity(5.5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('integer');
    });

    it('should accept maxStock as limit', () => {
      const result = validateCartItemQuantity(100, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDiscount', () => {
    it('should validate fixed discount', () => {
      const result = validateDiscount(10, 100, 'fixed');
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(10);
    });

    it('should validate percentage discount', () => {
      const result = validateDiscount(10, 100, 'percentage');
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(10); // 10% of 100
    });

    it('should reject percentage discount > 100', () => {
      const result = validateDiscount(101, 100, 'percentage');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between 0 and 100');
    });

    it('should reject negative discount', () => {
      const result = validateDiscount(-10, 100, 'fixed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject fixed discount > subtotal', () => {
      const result = validateDiscount(150, 100, 'fixed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should handle zero discount', () => {
      const result = validateDiscount(0, 100, 'fixed');
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(0);
    });
  });

  describe('validateCartTotals', () => {
    it('should validate correct totals without discount or tax', () => {
      const result = validateCartTotals(100, 0, 0, 100);
      expect(result.valid).toBe(true);
      expect(result.expectedTotal).toBe(100);
    });

    it('should validate correct totals with fixed discount', () => {
      const result = validateCartTotals(100, 10, 0, 90);
      expect(result.valid).toBe(true);
      expect(result.expectedTotal).toBe(90);
    });

    it('should validate correct totals with tax', () => {
      const result = validateCartTotals(100, 0, 21, 121);
      expect(result.valid).toBe(true);
      expect(result.expectedTotal).toBeCloseTo(121, 2);
    });

    it('should validate correct totals with discount and tax', () => {
      // 100 - 10 = 90, 90 + 21% = 108.9
      const result = validateCartTotals(100, 10, 21, 108.9);
      expect(result.valid).toBe(true);
      expect(result.expectedTotal).toBeCloseTo(108.9, 1);
    });

    it('should reject negative subtotal', () => {
      const result = validateCartTotals(-100, 0, 0, -100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject discount > subtotal', () => {
      const result = validateCartTotals(100, 150, 0, -50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject mismatched total', () => {
      const result = validateCartTotals(100, 0, 0, 95);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should allow small rounding differences', () => {
      const result = validateCartTotals(100, 0, 21, 121.001);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePaymentAmount', () => {
    it('should validate sufficient payment', () => {
      const result = validatePaymentAmount(100, 100);
      expect(result.valid).toBe(true);
      expect(result.change).toBe(0);
    });

    it('should calculate change correctly', () => {
      const result = validatePaymentAmount(150, 100);
      expect(result.valid).toBe(true);
      expect(result.change).toBe(50);
    });

    it('should reject insufficient payment', () => {
      const result = validatePaymentAmount(50, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient');
      expect(result.change).toBe(0);
    });

    it('should reject negative payment', () => {
      const result = validatePaymentAmount(-100, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should handle exact payment with zero change', () => {
      const result = validatePaymentAmount(100, 100);
      expect(result.valid).toBe(true);
      expect(result.change).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const result = validatePaymentAmount(100.25, 100.25);
      expect(result.valid).toBe(true);
      expect(result.change).toBeCloseTo(0, 2);
    });
  });
});
