import { describe, it, expect } from 'vitest';
import {
  ShippingAddressSchema,
  ShippingMethodSchema,
  PaymentMethodSchema,
  CheckoutSchema,
  validateCheckoutStep,
} from '../checkout.schema';

describe('Checkout Validation Schemas', () => {
  describe('ShippingAddressSchema', () => {
    it('validates a complete shipping address', () => {
      const validAddress = {
        street: '123 Main Street',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: '+54 9 11 2345 6789',
        country: 'AR',
      };

      const result = ShippingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('rejects invalid street (too short)', () => {
      const invalidAddress = {
        street: '123',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: '+54 9 11 2345 6789',
        country: 'AR',
      };

      const result = ShippingAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('rejects invalid phone number', () => {
      const invalidAddress = {
        street: '123 Main Street',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: '123',
        country: 'AR',
      };

      const result = ShippingAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const addressWithOptionals = {
        street: '123 Main Street',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: '+54 9 11 2345 6789',
        country: 'AR',
        state: 'Buenos Aires',
        apartment: 'Apt 4B',
      };

      const result = ShippingAddressSchema.safeParse(addressWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('ShippingMethodSchema', () => {
    it('validates standard shipping', () => {
      const result = ShippingMethodSchema.safeParse('standard');
      expect(result.success).toBe(true);
    });

    it('validates express shipping', () => {
      const result = ShippingMethodSchema.safeParse('express');
      expect(result.success).toBe(true);
    });

    it('validates pickup option', () => {
      const result = ShippingMethodSchema.safeParse('pickup');
      expect(result.success).toBe(true);
    });

    it('rejects invalid shipping method', () => {
      const result = ShippingMethodSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentMethodSchema', () => {
    it('validates card payment', () => {
      const cardPayment = {
        type: 'card',
        cardNumber: '4532015112830366',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      const result = PaymentMethodSchema.safeParse(cardPayment);
      expect(result.success).toBe(true);
    });

    it('validates paypal payment', () => {
      const paypalPayment = {
        type: 'paypal',
        email: 'user@example.com',
      };

      const result = PaymentMethodSchema.safeParse(paypalPayment);
      expect(result.success).toBe(true);
    });

    it('validates mercadopago payment', () => {
      const mpPayment = {
        type: 'mercadopago',
      };

      const result = PaymentMethodSchema.safeParse(mpPayment);
      expect(result.success).toBe(true);
    });

    it('validates bank transfer payment', () => {
      const bankPayment = {
        type: 'bank_transfer',
        bankName: 'Banco Argentina',
        accountNumber: '12345678',
      };

      const result = PaymentMethodSchema.safeParse(bankPayment);
      expect(result.success).toBe(true);
    });

    it('rejects invalid card number', () => {
      const invalidCard = {
        type: 'card',
        cardNumber: '1234',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      const result = PaymentMethodSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });

    it('rejects invalid CVV', () => {
      const invalidCard = {
        type: 'card',
        cardNumber: '4532015112830366',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '12',
      };

      const result = PaymentMethodSchema.safeParse(invalidCard);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCheckoutStep', () => {
    it('validates shipping address step', () => {
      const validAddress = {
        street: '123 Main Street',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: '+54 9 11 2345 6789',
        country: 'AR',
      };

      const result = validateCheckoutStep('shipping', validAddress);
      expect(result.valid).toBe(true);
    });

    it('validates shipping method step', () => {
      const result = validateCheckoutStep('shippingMethod', 'standard');
      expect(result.valid).toBe(true);
    });

    it('validates payment step', () => {
      const payment = {
        type: 'card',
        cardNumber: '4532015112830366',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2025,
        cvv: '123',
      };

      const result = validateCheckoutStep('payment', payment);
      expect(result.valid).toBe(true);
    });

    it('returns error details for invalid step', () => {
      const invalidAddress = {
        street: '123',
        city: 'Buenos Aires',
        postalCode: '1425',
        phone: 'invalid',
        country: 'AR',
      };

      const result = validateCheckoutStep('shipping', invalidAddress);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Complete Checkout Schema', () => {
    it('validates complete checkout data', () => {
      const completeCheckout = {
        shippingAddress: {
          street: '123 Main Street',
          city: 'Buenos Aires',
          postalCode: '1425',
          phone: '+54 9 11 2345 6789',
          country: 'AR',
        },
        shippingMethod: 'standard',
        paymentMethod: {
          type: 'card',
          cardNumber: '4532015112830366',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123',
        },
      };

      const result = CheckoutSchema.safeParse(completeCheckout);
      expect(result.success).toBe(true);
    });
  });
});
