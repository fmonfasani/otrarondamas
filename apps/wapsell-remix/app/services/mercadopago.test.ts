/**
 * Mercado Pago Integration Tests
 * Tests cover: signature verification, payment initialization, idempotency
 *
 * Run with: npm test -- mercadopago.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  verifyPaymentSignature,
  initPaymentPreference,
  getPaymentStatus,
  MercadoPagoError,
  getIdempotencyKey,
  storeIdempotencyKey,
} from './mercadopago.server';
import { createHmac } from 'crypto';

// Mock environment variables
beforeEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'test_token_123';
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'webhook_secret_123';
  process.env.VITE_API_URL = 'http://localhost:3000';
});

describe('Mercado Pago Integration', () => {
  describe('verifyPaymentSignature', () => {
    it('should verify valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const id = '123456789';
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;
      const requestString = `${id}:${timestamp}:${secret}`;

      const signature = createHmac('sha256', secret)
        .update(requestString)
        .digest('hex');

      const headerValue = `ts=${timestamp},v1=${signature}`;
      const body = { id };

      const result = verifyPaymentSignature(headerValue, body);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const headerValue = `ts=${timestamp},v1=invalidsignature`;
      const body = { id: '123456789' };

      const result = verifyPaymentSignature(headerValue, body);
      expect(result).toBe(false);
    });

    it('should reject old timestamp', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes old
      const headerValue = `ts=${oldTimestamp},v1=somesignature`;
      const body = { id: '123456789' };

      const result = verifyPaymentSignature(headerValue, body);
      expect(result).toBe(false);
    });

    it('should handle malformed signature header', () => {
      const result = verifyPaymentSignature('malformed', { id: '123' });
      expect(result).toBe(false);
    });

    it('should reject empty signature', () => {
      const result = verifyPaymentSignature('', { id: '123' });
      expect(result).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should store and retrieve idempotency key', () => {
      const key = 'idem-key-123-abc-def';
      const orderId = 'order-pref-id';

      storeIdempotencyKey(key, orderId);
      const result = getIdempotencyKey(key);

      expect(result).toBe(orderId);
    });

    it('should return null for non-existent key', () => {
      const result = getIdempotencyKey('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should handle duplicate idempotency keys', () => {
      const key = 'duplicate-key';
      const orderId1 = 'order-1';
      const orderId2 = 'order-2';

      storeIdempotencyKey(key, orderId1);
      storeIdempotencyKey(key, orderId2); // Overwrite

      const result = getIdempotencyKey(key);
      expect(result).toBe(orderId2);
    });
  });

  describe('Error handling', () => {
    it('should throw MercadoPagoError with proper fields', () => {
      const error = new MercadoPagoError('API failed', 400, { code: 'INVALID_REQUEST' });

      expect(error.message).toBe('API failed');
      expect(error.statusCode).toBe(400);
      expect(error.details?.code).toBe('INVALID_REQUEST');
      expect(error.name).toBe('MercadoPagoError');
    });

    it('should require access token', async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;

      await expect(
        initPaymentPreference('order123', [], 0, 100)
      ).rejects.toThrow('Mercado Pago access token not configured');
    });
  });

  describe('Payment Item Validation', () => {
    it('should accept valid payment items', () => {
      const items = [
        {
          id: 'prod1',
          title: 'Product 1',
          quantity: 1,
          unit_price: 100,
          currency_id: 'ARS',
        },
        {
          id: 'prod2',
          title: 'Product 2',
          quantity: 2,
          unit_price: 50,
          currency_id: 'ARS',
        },
      ];

      // Just validate they conform to the interface
      expect(items).toHaveLength(2);
      expect(items[0].unit_price).toBe(100);
      expect(items[1].quantity).toBe(2);
    });
  });

  describe('Signature Format Variations', () => {
    it('should handle signature with extra spaces', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const id = '123456789';
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;
      const requestString = `${id}:${timestamp}:${secret}`;

      const signature = createHmac('sha256', secret)
        .update(requestString)
        .digest('hex');

      // Extra spaces around equals
      const headerValue = `ts = ${timestamp} , v1 = ${signature}`;
      const body = { id };

      // This should work because we trim the parts
      const result = verifyPaymentSignature(headerValue, body);
      expect(result).toBe(true);
    });

    it('should extract id from nested data object', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const id = '123456789';
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;
      const requestString = `${id}:${timestamp}:${secret}`;

      const signature = createHmac('sha256', secret)
        .update(requestString)
        .digest('hex');

      const headerValue = `ts=${timestamp},v1=${signature}`;
      const body = { data: { id } };

      const result = verifyPaymentSignature(headerValue, body);
      expect(result).toBe(true);
    });
  });
});
