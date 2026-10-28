/**
 * Catalog event types for Kafka messaging.
 * Events must include businessId for multi-tenant isolation.
 */

export interface CatalogProductUpdatedEvent {
  eventId: string;
  eventType: 'catalog.product.updated';
  timestamp: string;
  businessId: string;
  productId: string;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  inventory?: number;
  changes: {
    [key: string]: {
      oldValue: unknown;
      newValue: unknown;
    };
  };
  updatedBy: string;
}

export interface CatalogInventoryUpdatedEvent {
  eventId: string;
  eventType: 'catalog.inventory.updated';
  timestamp: string;
  businessId: string;
  productId: string;
  previousStock: number;
  newStock: number;
  delta: number;
  reason: 'sale' | 'return' | 'adjustment' | 'receipt' | 'transfer';
  relatedOrderId?: string;
  updatedBy: string;
}

export interface CatalogPriceUpdatedEvent {
  eventId: string;
  eventType: 'catalog.price.updated';
  timestamp: string;
  businessId: string;
  productId: string;
  previousPrice: number;
  newPrice: number;
  currency: string;
  effectiveFrom: string;
  updatedBy: string;
}

export type CatalogEvent =
  | CatalogProductUpdatedEvent
  | CatalogInventoryUpdatedEvent
  | CatalogPriceUpdatedEvent;

/**
 * Validates if a catalog event has a valid businessId.
 * Required for multi-tenant isolation enforcement.
 */
export function validateCatalogEventBusinessId(event: CatalogEvent): boolean {
  if (!event.businessId || typeof event.businessId !== 'string') {
    return false;
  }
  if (event.businessId.trim().length === 0) {
    return false;
  }
  return true;
}

/**
 * Extracts businessId from any catalog event.
 * Returns null if event is invalid or businessId missing.
 */
export function extractCatalogEventBusinessId(event: CatalogEvent): string | null {
  if (!validateCatalogEventBusinessId(event)) {
    return null;
  }
  return event.businessId.trim();
}
