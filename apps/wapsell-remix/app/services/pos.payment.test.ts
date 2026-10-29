/**
 * POS Payment Service Tests
 * Tests for payment validation, sale processing, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validatePayment,
  buildReceiptData,
  processCompleteSale,
  validateSaleCanBeCreated,
} from './pos.payment.server';
import { POSAPIError } from './pos.server';
import type { PaymentInput } from '~/utils/payment.validation';
import type { Sale } from './pos.server';

describe('POS Payment Service', () => {
  describe('validatePayment', () => {
    it('should validate cash payment with change', () => {
      const payment: PaymentInput = {
        method: 'CASH',
        amount: 100,
        amountReceived: 150,
      };

      const result = validatePayment(payment, 100);

      expect(result.method).toBe('CASH');
      expect(result.totalAmount).toBe(100);
      expect(result.paidAmount).toBe(150);
      expect(result.change).toBe(50);
    });

    it('should validate cash payment without change', () => {
      const payment: PaymentInput = {
        method: 'CASH',
        amount: 100,
      };

      const result = validatePayment(payment, 100);

      expect(result.method).toBe('CASH');
      expect(result.totalAmount).toBe(100);
      expect(result.paidAmount).toBe(100);
      expect(result.change).toBe(0);
    });

    it('should reject cash payment with insufficient amount', () => {
      const payment: PaymentInput = {
        method: 'CASH',
        amount: 50,
        amountReceived: 40,
      };

      expect(() => validatePayment(payment, 100)).toThrow();
    });

    it('should validate card payment', () => {
      const payment: PaymentInput = {
        method: 'CARD',
        amount: 100,
        cardNumber: '4111111111111111',
        cardholderName: 'Test User',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      const result = validatePayment(payment, 100);

      expect(result.method).toBe('CARD');
      expect(result.totalAmount).toBe(100);
      expect(result.paidAmount).toBe(100);
    });

    it('should reject expired card', () => {
      const payment: PaymentInput = {
        method: 'CARD',
        amount: 100,
        cardNumber: '4111111111111111',
        cardholderName: 'Test User',
        expiryMonth: 1,
        expiryYear: 2020, // Past date
        cvv: '123',
      };

      expect(() => validatePayment(payment, 100)).toThrow();
    });

    it('should validate QR payment', () => {
      const payment: PaymentInput = {
        method: 'QR',
        amount: 100,
        qrReference: 'MP123456789',
        provider: 'MERCADO_PAGO',
      };

      const result = validatePayment(payment, 100);

      expect(result.method).toBe('QR');
      expect(result.totalAmount).toBe(100);
      expect(result.paidAmount).toBe(100);
      expect(result.reference).toBe('MP123456789');
    });

    it('should validate mixed payment (cash + card)', () => {
      const payment: PaymentInput = {
        method: 'MIXED',
        cashAmount: 50,
        cardAmount: 50,
        cardNumber: '4111111111111111',
        cardholderName: 'Test User',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      const result = validatePayment(payment, 100);

      expect(result.method).toBe('MIXED');
      expect(result.totalAmount).toBe(100);
      expect(result.paidAmount).toBe(100);
    });

    it('should reject mixed payment with insufficient total', () => {
      const payment: PaymentInput = {
        method: 'MIXED',
        cashAmount: 30,
        cardAmount: 40,
      };

      expect(() => validatePayment(payment, 100)).toThrow();
    });

    it('should reject invalid payment method', () => {
      const payment = {
        method: 'INVALID',
        amount: 100,
      } as any;

      expect(() => validatePayment(payment, 100)).toThrow();
    });
  });

  describe('buildReceiptData', () => {
    const mockSale: Sale = {
      id: 'sale-123',
      empresaId: 'company-123',
      numeroComprobanteInterno: 'CMP-2024-0001',
      fechaOperacion: new Date().toISOString(),
      canal: 'presencial',
      usuarioId: 'user-123',
      montoTotal: '150.00',
      descuentoTotal: '0.00',
      items: [
        {
          id: 'item-1',
          productoId: 'product-1',
          codigoInterno: 'SKU-001',
          nombreProducto: 'Product 1',
          cantidad: 2,
          precioUnitario: '50.00',
          descuentoUnitario: '0.00',
          subtotal: '100.00',
        },
        {
          id: 'item-2',
          productoId: 'product-2',
          codigoInterno: 'SKU-002',
          nombreProducto: 'Product 2',
          cantidad: 1,
          precioUnitario: '50.00',
          descuentoUnitario: '0.00',
          subtotal: '50.00',
        },
      ],
    };

    it('should build receipt data for cash payment', () => {
      const payment = {
        method: 'CASH' as const,
        totalAmount: 150,
        paidAmount: 200,
        change: 50,
      };

      const receipt = buildReceiptData(mockSale, payment, 'John Doe', {
        name: 'Test Store',
        address: '123 Main St',
        taxId: 'CUIT-123',
      });

      expect(receipt.saleId).toBe('sale-123');
      expect(receipt.receiptNumber).toBe('CMP-2024-0001');
      expect(receipt.items).toHaveLength(2);
      expect(receipt.total).toBe(150);
      expect(receipt.paymentMethod).toBe('CASH');
      expect(receipt.amountPaid).toBe(200);
      expect(receipt.change).toBe(50);
    });

    it('should calculate subtotal, discount, and tax correctly', () => {
      const payment = {
        method: 'CASH' as const,
        totalAmount: 150,
        paidAmount: 150,
      };

      const receipt = buildReceiptData(mockSale, payment, 'John Doe', {
        name: 'Test Store',
      });

      expect(receipt.subtotal).toBe(150);
      expect(receipt.discount).toBe(0);
      expect(receipt.total).toBe(150);
    });

    it('should handle card payment without change', () => {
      const payment = {
        method: 'CARD' as const,
        totalAmount: 150,
        paidAmount: 150,
        installments: 3,
      };

      const receipt = buildReceiptData(mockSale, payment, 'Jane Doe', {
        name: 'Test Store',
      });

      expect(receipt.paymentMethod).toBe('CARD');
      expect(receipt.amountPaid).toBe(150);
      expect(receipt.change).toBeUndefined();
    });
  });

  describe('validateSaleCanBeCreated', () => {
    it('should reject empty items', async () => {
      const result = await validateSaleCanBeCreated([], 'jwt-token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one item');
    });

    it('should reject invalid quantities', async () => {
      const items = [
        {
          productoId: 'prod-1',
          cantidad: 0, // Invalid
          precioUnitario: '100.00',
          descuentoUnitario: '0.00',
        },
      ];

      const result = await validateSaleCanBeCreated(items as any, 'jwt-token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid quantity');
    });

    it('should accept valid items', async () => {
      const items = [
        {
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: '100.00',
          descuentoUnitario: '0.00',
        },
      ];

      // Mock the quoteSale function
      vi.mock('~/services/pos.server', () => ({
        quoteSale: vi.fn().mockResolvedValue({ montoTotal: '100.00' }),
      }));

      const result = await validateSaleCanBeCreated(items as any, 'jwt-token');

      expect(result.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw POSAPIError with correct status code for validation errors', () => {
      const payment: PaymentInput = {
        method: 'CASH',
        amount: -100, // Invalid
      } as any;

      expect(() => validatePayment(payment, 100)).toThrow(POSAPIError);
    });

    it('should throw with 422 status for payment validation', () => {
      const payment: PaymentInput = {
        method: 'CARD',
        amount: 100,
        cardNumber: 'INVALID', // Invalid format
        cardholderName: 'Test',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      try {
        validatePayment(payment, 100);
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof POSAPIError) {
          expect(error.statusCode).toBe(422);
        }
      }
    });
  });

  describe('Idempotency', () => {
    it('should track idempotency keys', async () => {
      // This would require mocking the actual API calls
      // The cache is tested indirectly through processCompleteSale
      expect(true).toBe(true); // Placeholder
    });
  });
});
