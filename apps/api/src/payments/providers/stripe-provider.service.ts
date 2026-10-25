import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import * as crypto from 'crypto';

/**
 * Mock Stripe implementation for testing
 * In production, replace with official Stripe SDK
 */
@Injectable()
export class StripeProviderService implements IPaymentProvider {
  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
  }

  async createPaymentIntent(monto: number, moneda: string, metadata: any) {
    // Mock: Generate client secret and payment intent ID
    const clientSecret = `pi_test_${crypto.randomBytes(16).toString('hex')}_secret_${crypto.randomBytes(8).toString('hex')}`;
    const providerIntentId = `pi_test_${crypto.randomBytes(16).toString('hex')}`;

    console.log(`[Stripe] Creating payment intent: ${providerIntentId} for ${monto} ${moneda}`);

    return {
      id: providerIntentId,
      clientSecret,
      providerIntentId,
      monto,
      moneda,
      estado: 'requires_payment_method',
    };
  }

  async confirmPayment(intentId: string, paymentMethod?: string) {
    // Mock: Confirm payment
    console.log(`[Stripe] Confirming payment: ${intentId}`);

    return {
      paymentId: intentId,
      providerPaymentId: `ch_test_${crypto.randomBytes(16).toString('hex')}`,
      estado: 'succeeded',
      monto: 100,
      ultimos4Digitos: '4242',
    };
  }

  async getPaymentStatus(paymentId: string) {
    // Mock: Get payment status
    console.log(`[Stripe] Getting payment status: ${paymentId}`);

    return {
      estado: 'succeeded',
      monto: 100,
      moneda: 'ARS',
      metodo: 'card',
      ultimos4Digitos: '4242',
      providerPaymentId: paymentId,
    };
  }

  async refundPayment(paymentId: string, monto: number, razon: string) {
    // Mock: Process refund
    console.log(`[Stripe] Refunding ${monto} from ${paymentId} (reason: ${razon})`);

    return {
      refundId: paymentId,
      providerRefundId: `re_test_${crypto.randomBytes(16).toString('hex')}`,
      monto,
      estado: 'succeeded',
    };
  }

  /**
   * Verify Stripe webhook signature using HMAC-SHA256
   */
  async verifyWebhookSignature(signature: string, payload: any) {
    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      const isValid = computedSignature === signature;
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
