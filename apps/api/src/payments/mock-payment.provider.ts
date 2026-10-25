import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * MockPaymentProvider: Test implementation of IPaymentProvider.
 *
 * Supports 3 modes (via MOCK_PAYMENT_MODE env var):
 * - SUCCESS: Always returns { success: true, provider_refund_id: 'mock-...' }
 * - FAIL_RETRY: First 2 calls fail, 3rd succeeds (tests retry logic)
 * - FAIL_PERMANENT: Always fails (tests max-retry and FALLIDO state)
 */
@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private attempts: Record<string, number> = {};

  isConfigured(): boolean {
    return true;
  }

  async createRefund(request: {
    monto: Prisma.Decimal;
    metodo_pago: string;
    devolucionId: string;
    ventaId: string;
    clienteId: string;
    providerTransactionId?: string;
  }): Promise<{
    success: boolean;
    provider_refund_id?: string;
    error?: string;
    retriable?: boolean;
  }> {
    const mode = process.env.MOCK_PAYMENT_MODE || 'SUCCESS';
    const key = `${request.ventaId}_${request.devolucionId}`;

    // Track number of attempts per devolucionId
    this.attempts[key] = (this.attempts[key] || 0) + 1;
    const attemptNumber = this.attempts[key];

    this.logger.debug(
      `[MockPaymentProvider] createRefund mode=${mode}, devolucionId=${request.devolucionId}, attempt=${attemptNumber}`,
    );

    if (mode === 'SUCCESS') {
      const refundId = `mock_ref_${uuidv4()}`;
      this.logger.log(`[MockPaymentProvider] SUCCESS: ${request.devolucionId} → ${refundId}`);
      return {
        success: true,
        provider_refund_id: refundId,
      };
    }

    if (mode === 'FAIL_RETRY') {
      // First 2 attempts fail, 3rd succeeds
      if (attemptNumber < 3) {
        this.logger.warn(
          `[MockPaymentProvider] FAIL_RETRY: ${request.devolucionId} attempt ${attemptNumber}/3 (simulated timeout)`,
        );
        return {
          success: false,
          error: `Simulated transient timeout (attempt ${attemptNumber})`,
          retriable: true,
        };
      }

      // On 3rd attempt, succeed
      const refundId = `mock_ref_${uuidv4()}`;
      this.logger.log(
        `[MockPaymentProvider] FAIL_RETRY success on 3rd attempt: ${request.devolucionId} → ${refundId}`,
      );
      return {
        success: true,
        provider_refund_id: refundId,
      };
    }

    if (mode === 'FAIL_PERMANENT') {
      this.logger.error(
        `[MockPaymentProvider] FAIL_PERMANENT: ${request.devolucionId} (account suspended)`,
      );
      return {
        success: false,
        error: 'Account suspended or insufficient funds',
        retriable: false,
      };
    }

    // Default fallback: success
    const refundId = `mock_ref_${uuidv4()}`;
    return {
      success: true,
      provider_refund_id: refundId,
    };
  }

  /**
   * Reset attempt counters (useful in testing)
   */
  resetAttempts(): void {
    this.attempts = {};
  }
}
