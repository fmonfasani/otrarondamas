import { describe, it, expect } from 'vitest';
import {
  CashPaymentSchema,
  CardPaymentSchema,
  MixedPaymentSchema,
  QRPaymentSchema,
  PaymentSchema,
} from './payment.validation';

describe('Payment Validation', () => {
  describe('CashPaymentSchema', () => {
    it('should validate valid cash payment', () => {
      const data = {
        method: 'CASH' as const,
        amount: 100,
        amountReceived: 150,
      };
      const result = CashPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate cash payment without amountReceived', () => {
      const data = {
        method: 'CASH' as const,
        amount: 100,
      };
      const result = CashPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const data = {
        method: 'CASH' as const,
        amount: -100,
      };
      const result = CashPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject amountReceived < amount', () => {
      const data = {
        method: 'CASH' as const,
        amount: 100,
        amountReceived: 50,
      };
      const result = CashPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('CardPaymentSchema', () => {
    it('should validate valid card payment', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366', // Valid test card number
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject expired card', () => {
      const pastYear = 2020;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 1,
        expiryYear: pastYear,
        cvv: '123',
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid card number length', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '123', // Too short
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid CVV', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '12', // Too short
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid expiry month', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 13, // Invalid
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short cardholder name', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'J', // Too short
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional installments', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
        installments: 3,
      };
      const result = CardPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('MixedPaymentSchema', () => {
    it('should validate valid mixed payment', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'MIXED' as const,
        cashAmount: 50,
        cardAmount: 50,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
      };
      const result = MixedPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate mixed payment with only cash', () => {
      const data = {
        method: 'MIXED' as const,
        cashAmount: 100,
        cardAmount: 0,
      };
      const result = MixedPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject card amount without card details', () => {
      const data = {
        method: 'MIXED' as const,
        cashAmount: 50,
        cardAmount: 50,
        // Missing card details
      };
      const result = MixedPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject expired card in mixed payment', () => {
      const data = {
        method: 'MIXED' as const,
        cashAmount: 50,
        cardAmount: 50,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 1,
        expiryYear: 2020, // Expired
        cvv: '123',
      };
      const result = MixedPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject amountReceived < cashAmount', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'MIXED' as const,
        cashAmount: 100,
        cardAmount: 50,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amountReceived: 50, // Less than cashAmount
      };
      const result = MixedPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('QRPaymentSchema', () => {
    it('should validate valid QR payment', () => {
      const data = {
        method: 'QR' as const,
        amount: 100,
        qrReference: 'MP_12345678',
        provider: 'MERCADO_PAGO' as const,
      };
      const result = QRPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing qrReference', () => {
      const data = {
        method: 'QR' as const,
        amount: 100,
        qrReference: '',
        provider: 'MERCADO_PAGO' as const,
      };
      const result = QRPaymentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate OTHER as provider', () => {
      const data = {
        method: 'QR' as const,
        amount: 100,
        qrReference: 'OTHER_12345678',
        provider: 'OTHER' as const,
      };
      const result = QRPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('PaymentSchema (Discriminated Union)', () => {
    it('should correctly discriminate cash payment', () => {
      const data = {
        method: 'CASH' as const,
        amount: 100,
      };
      const result = PaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should correctly discriminate card payment', () => {
      const futureYear = new Date().getFullYear() + 1;
      const data = {
        method: 'CARD' as const,
        cardNumber: '4532015112830366',
        cardholderName: 'JUAN PEREZ',
        expiryMonth: 12,
        expiryYear: futureYear,
        cvv: '123',
        amount: 100,
      };
      const result = PaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject unknown payment method', () => {
      const data = {
        method: 'BITCOIN',
        amount: 100,
      };
      const result = PaymentSchema.safeParse(data as any);
      expect(result.success).toBe(false);
    });
  });
});
