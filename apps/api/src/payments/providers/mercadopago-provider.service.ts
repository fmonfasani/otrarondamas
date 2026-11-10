import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import * as crypto from 'crypto';

// Constant-time comparison of two hex digests; false on any length mismatch.
function digestsMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Mock MercadoPago implementation for testing
 * In production, replace with official MercadoPago SDK
 */
@Injectable()
export class MercadoPagoProviderService implements IPaymentProvider {
  private accessToken: string;
  private publicKey: string;
  private webhookToken: string;

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR_test_mock';
    this.publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || 'APP_USR_test_public';
    // No default: without MERCADOPAGO_WEBHOOK_TOKEN every webhook fails verification.
    this.webhookToken = process.env.MERCADOPAGO_WEBHOOK_TOKEN ?? '';
  }

  async createPaymentIntent(monto: number, moneda: string, metadata: any) {
    // Mock: Generate client secret and payment preference ID
    const clientSecret = `mp_test_${crypto.randomBytes(16).toString('hex')}_secret`;
    const preferenceId = `mp_pref_${crypto.randomBytes(16).toString('hex')}`;

    console.log(
      `[MercadoPago] Creating payment preference: ${preferenceId} for ${monto} ${moneda}`,
    );

    return {
      id: preferenceId,
      clientSecret,
      providerIntentId: preferenceId,
      monto,
      moneda,
      estado: 'pending',
    };
  }

  async confirmPayment(intentId: string, paymentMethod?: string) {
    // Mock: Confirm payment in MercadoPago
    console.log(`[MercadoPago] Confirming payment: ${intentId}`);

    return {
      paymentId: intentId,
      providerPaymentId: `mp_pay_${crypto.randomBytes(16).toString('hex')}`,
      estado: 'approved',
      monto: 100,
      ultimos4Digitos: '1111',
    };
  }

  async getPaymentStatus(paymentId: string) {
    // Mock: Get payment status
    console.log(`[MercadoPago] Getting payment status: ${paymentId}`);

    return {
      estado: 'approved',
      monto: 100,
      moneda: 'ARS',
      metodo: 'credit_card',
      ultimos4Digitos: '1111',
      providerPaymentId: paymentId,
    };
  }

  async refundPayment(paymentId: string, monto: number, razon: string) {
    // Mock: Process refund in MercadoPago
    console.log(`[MercadoPago] Refunding ${monto} from ${paymentId} (reason: ${razon})`);

    return {
      refundId: paymentId,
      providerRefundId: `mp_refund_${crypto.randomBytes(16).toString('hex')}`,
      monto,
      estado: 'refunded',
    };
  }

  /**
   * Verify MercadoPago webhook signature
   * Uses X-Signature header with timestamp and HMAC-SHA256
   */
  async verifyWebhookSignature(signature: string, payload: any) {
    if (!this.webhookToken || !signature) {
      return { valid: false };
    }
    try {
      // MercadoPago format: "ts=<timestamp>,v1=<signature>" (simplified: the
      // v1 value is an HMAC of the payload). A bare digest is also accepted.
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computedSignature = crypto
        .createHmac('sha256', this.webhookToken)
        .update(payloadString)
        .digest('hex');

      const v1 = /(?:^|,)\s*v1=([^,]+)/.exec(signature)?.[1] ?? signature;
      const isValid = digestsMatch(computedSignature, v1.trim());
      return {
        valid: isValid,
        payload: isValid ? payload : null,
      };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return {
        valid: false,
      };
    }
  }
}
