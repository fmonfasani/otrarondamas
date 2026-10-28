/**
 * Payment event types for Kafka messaging.
 * Events must include businessId for multi-tenant isolation.
 */

export interface PaymentCompletedEvent {
  eventId: string;
  eventType: 'payment.completed';
  timestamp: string;
  businessId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
  transactionId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFailedEvent {
  eventId: string;
  eventType: 'payment.failed';
  timestamp: string;
  businessId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  failureReason: string;
  retryable: boolean;
  transactionId?: string;
}

export interface PaymentRefundedEvent {
  eventId: string;
  eventType: 'payment.refunded';
  timestamp: string;
  businessId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  refundReason: string;
  refundedBy: string;
}

export type PaymentEvent = PaymentCompletedEvent | PaymentFailedEvent | PaymentRefundedEvent;

/**
 * Validates if a payment event has a valid businessId.
 * Required for multi-tenant isolation enforcement.
 */
export function validatePaymentEventBusinessId(event: PaymentEvent): boolean {
  if (!event.businessId || typeof event.businessId !== 'string') {
    return false;
  }
  if (event.businessId.trim().length === 0) {
    return false;
  }
  return true;
}

/**
 * Extracts businessId from any payment event.
 * Returns null if event is invalid or businessId missing.
 */
export function extractPaymentEventBusinessId(event: PaymentEvent): string | null {
  if (!validatePaymentEventBusinessId(event)) {
    return null;
  }
  return event.businessId.trim();
}
