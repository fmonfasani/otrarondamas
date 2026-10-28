/**
 * Order event types for Kafka messaging.
 * Events must include businessId for multi-tenant isolation.
 */

export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'order.created';
  timestamp: string;
  businessId: string;
  customerId: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface OrderUpdatedEvent {
  eventId: string;
  eventType: 'order.updated';
  timestamp: string;
  businessId: string;
  orderId: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  changes: Record<string, unknown>;
}

export interface OrderCancelledEvent {
  eventId: string;
  eventType: 'order.cancelled';
  timestamp: string;
  businessId: string;
  orderId: string;
  reason: string;
  cancelledBy: string;
  reversedItems: Array<{
    productId: string;
    quantity: number;
  }>;
}

export type OrderEvent = OrderCreatedEvent | OrderUpdatedEvent | OrderCancelledEvent;

/**
 * Validates if an order event has a valid businessId.
 * Required for multi-tenant isolation enforcement.
 */
export function validateOrderEventBusinessId(event: OrderEvent): boolean {
  if (!event.businessId || typeof event.businessId !== 'string') {
    return false;
  }
  if (event.businessId.trim().length === 0) {
    return false;
  }
  return true;
}

/**
 * Extracts businessId from any order event.
 * Returns null if event is invalid or businessId missing.
 */
export function extractOrderEventBusinessId(event: OrderEvent): string | null {
  if (!validateOrderEventBusinessId(event)) {
    return null;
  }
  return event.businessId.trim();
}
