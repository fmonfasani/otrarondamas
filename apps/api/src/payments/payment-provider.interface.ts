import { Prisma } from '@prisma/client';

/**
 * IPaymentProvider: Contract for payment provider implementations.
 *
 * Each provider (Stripe, PayPal, MercadoPago, etc.) implements this interface.
 * The RefundQueueService calls isConfigured() + createRefund() without knowing
 * which provider is active.
 */
export interface IPaymentProvider {
  /**
   * Verify provider configuration is valid (API key set, endpoint reachable, etc.)
   *
   * Returns true if ready to process refunds; false if misconfigured.
   * RefundQueueService skips refunds if isConfigured() == false and logs a warning.
   */
  isConfigured(): boolean;

  /**
   * Create refund on provider.
   *
   * @param request - Refund request details
   * @returns Promise with success flag + provider_refund_id (on success) or error
   *
   * IDEMPOTENCY: Provider must handle duplicate requests gracefully.
   * If same devolucionId is submitted twice, provider should return the same refund_id.
   * This prevents double-refunding due to retries.
   */
  createRefund(request: {
    // Amount to refund (e.g. USD 150.00)
    monto: Prisma.Decimal;

    // Original payment method (credit_card, debit_card, cash, bank_transfer, etc.)
    // Provider uses this to determine refund routing (e.g. credit card → card issuer)
    metodo_pago: string;

    // Wapsell internal devolución ID — provider uses as idempotency key
    devolucionId: string; // UUID v4 for uniqueness + traceability

    // Original sale ID (for audit/compliance)
    ventaId: string;

    // Customer ID (for notifications)
    clienteId: string;

    // Original payment transaction ID (if available from Venta record)
    // Allows provider to trace refund to original charge
    providerTransactionId?: string;
  }): Promise<{
    // true = refund accepted; false = refund rejected
    success: boolean;

    // Refund ID assigned by provider (e.g. "ch_1AB12C3D4E5F6G7H8I9")
    // Stored in Reembolso.referenceId for audit trail
    provider_refund_id?: string;

    // Error description if success == false
    // Stored in Reembolso.motivoFalla for retry/debug
    error?: string;

    // Retry-eligible indicator (optional; default: true)
    // If false, max-retries skipped and refund marked FALLIDO immediately
    // Use for non-recoverable errors (invalid account, insufficient funds, etc.)
    retriable?: boolean;
  }>;
}
