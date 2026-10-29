/**
 * POS Client Utilities
 * Client-side helpers for optimistic updates, error handling, and UI state management.
 *
 * Patterns:
 * - Optimistic deduction of inventory
 * - Rollback on API error
 * - User-friendly error messages
 * - Retry logic for transient failures
 */

import type { Sale, SaleItem, InventoryItem } from '~/services/pos.server';

/**
 * Error types returned from POS actions
 */
export type POSErrorType = 'conflict' | 'validation' | 'timeout' | 'server_error' | 'unknown';

export interface POSError {
  type: POSErrorType;
  message: string;
  details?: string;
  statusCode?: number;
  retryable: boolean;
}

/**
 * Parse error response from POS actions
 *
 * Returns standardized error info suitable for UI display.
 * Distinguishes between:
 * - Validation errors (user input issue, not retryable)
 * - Conflict errors (stock oversold, needs user action)
 * - Timeout errors (retryable, may have succeeded)
 * - Server errors (retryable, likely to fail again soon)
 */
export function parsePOSError(response: Response, body: any): POSError {
  const statusCode = response.status;

  // 409 Conflict: Stock oversold
  if (statusCode === 409) {
    return {
      type: 'conflict',
      message: 'Stock is insufficient. Please adjust quantities.',
      details: body.details,
      statusCode,
      retryable: false,
    };
  }

  // 422 Unprocessable: Validation error
  if (statusCode === 422) {
    return {
      type: 'validation',
      message: body.message || 'Invalid data. Please check and try again.',
      details: body.details,
      statusCode,
      retryable: false,
    };
  }

  // 504 Gateway Timeout: Request timed out
  if (statusCode === 504) {
    return {
      type: 'timeout',
      message: 'Request timed out. The sale may or may not have been created. Check your sales log.',
      details: body.details,
      statusCode,
      retryable: true,
    };
  }

  // 503 Service Unavailable: API is down
  if (statusCode === 503) {
    return {
      type: 'timeout',
      message: 'API service is temporarily unavailable. Queuing for offline sync.',
      details: body.details,
      statusCode,
      retryable: true,
    };
  }

  // 5xx Server Error
  if (statusCode >= 500) {
    return {
      type: 'server_error',
      message: 'Server error. Please try again.',
      details: body.details,
      statusCode,
      retryable: true,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: body.message || 'An unexpected error occurred.',
    details: body.details,
    statusCode,
    retryable: false,
  };
}

/**
 * Get user-friendly message for POS operation
 *
 * Returns localized message suitable for toast/modal display.
 */
export function getPOSErrorMessage(error: POSError, lang: 'en' | 'es' = 'en'): string {
  const messages = {
    en: {
      conflict: 'Stock is insufficient. Please adjust quantities.',
      validation: 'Invalid data. Please check and try again.',
      timeout: 'Request timed out. Check your sales log to confirm.',
      server_error: 'Server error. Please try again.',
      unknown: 'An unexpected error occurred.',
    },
    es: {
      conflict: 'Stock insuficiente. Por favor ajusta las cantidades.',
      validation: 'Datos inválidos. Por favor verifica e intenta de nuevo.',
      timeout: 'Tiempo de espera agotado. Verifica tu historial de ventas.',
      server_error: 'Error del servidor. Por favor intenta de nuevo.',
      unknown: 'Ocurrió un error inesperado.',
    },
  };

  return messages[lang][error.type] || error.message;
}

/**
 * Optimistic inventory deduction
 *
 * Immediately removes items from inventory after user clicks "Create Sale".
 * Call this BEFORE submitting the form to update the UI optimistically.
 *
 * Returns a rollback function to restore inventory if the request fails.
 */
export function optimisticallyDeductInventory(
  inventory: InventoryItem[],
  items: SaleItem[]
): {
  updated: InventoryItem[];
  rollback: (current: InventoryItem[]) => InventoryItem[];
} {
  const backup = JSON.parse(JSON.stringify(inventory));

  const updated = inventory.map((inventoryItem) => {
    const saleItem = items.find((si) => si.productoId === inventoryItem.productoId);
    if (!saleItem) return inventoryItem;

    return {
      ...inventoryItem,
      stockActual: Math.max(0, inventoryItem.stockActual - saleItem.cantidad),
    };
  });

  const rollback = (current: InventoryItem[]) => backup;

  return { updated, rollback };
}

/**
 * Check if inventory has sufficient stock for items
 *
 * Returns true if all items can be sold with current inventory.
 * Used before submitting sale to give immediate feedback.
 */
export function checkInventoryAvailable(inventory: InventoryItem[], items: SaleItem[]): boolean {
  return items.every((saleItem) => {
    const inventoryItem = inventory.find((inv) => inv.productoId === saleItem.productoId);
    return inventoryItem && inventoryItem.stockActual >= saleItem.cantidad;
  });
}

/**
 * Format price as currency string
 */
export function formatPrice(amount: string | number, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Queue sale for offline sync
 *
 * When the API is unreachable, save the sale locally and retry when online.
 * This is a placeholder for localStorage-based queue; replace with actual implementation.
 */
export function queueSaleOffline(saleData: any): void {
  try {
    const queue = JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
    queue.push({
      sale: saleData,
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem('pos_offline_queue', JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue sale offline:', error);
  }
}

/**
 * Get queued sales for offline sync
 */
export function getOfflineQueue(): any[] {
  try {
    return JSON.parse(localStorage.getItem('pos_offline_queue') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear queued sales after successful sync
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem('pos_offline_queue');
  } catch (error) {
    console.error('Failed to clear offline queue:', error);
  }
}

/**
 * Calculate sale summary from items
 *
 * Returns totals without calling API (for optimistic display).
 * Note: This is a simple calculation; the server will compute exact totals
 * after applying discounts and rules.
 */
export function calculateSaleSummary(items: SaleItem[]) {
  return items.reduce(
    (acc, item) => {
      const price = parseFloat(item.precioUnitario);
      const discount = parseFloat(item.descuentoUnitario || '0');
      const subtotal = price * item.cantidad;
      const itemDiscount = discount * item.cantidad;

      return {
        itemCount: acc.itemCount + item.cantidad,
        subtotal: acc.subtotal + subtotal,
        discount: acc.discount + itemDiscount,
        total: acc.total + subtotal - itemDiscount,
      };
    },
    { itemCount: 0, subtotal: 0, discount: 0, total: 0 }
  );
}

/**
 * Determine if error is retryable
 *
 * Use with exponential backoff retry logic.
 */
export function isRetryableError(error: POSError): boolean {
  // Timeout errors should be retried
  if (error.type === 'timeout') return true;

  // Server errors (500+) should be retried with backoff
  if (error.type === 'server_error') return true;

  // Validation and conflict errors are not retryable
  return error.retryable;
}

/**
 * Exponential backoff delay in milliseconds
 *
 * Use: delay(attemptNumber) => wait before retrying
 */
export function exponentialBackoff(attemptNumber: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = baseDelay * Math.pow(2, attemptNumber);
  return Math.min(delay, maxDelay);
}

/**
 * Debounce function for quote calculations
 *
 * Calls the quote API 300ms after the last change, reducing API load.
 */
export function debounceQuote(callback: () => void, delayMs = 300) {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback();
    }, delayMs);
  };
}
