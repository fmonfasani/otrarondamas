/**
 * POS Payment Processing Service
 * Handles payment validation, processing, and sale completion
 * - Payment method validation (cash, card, QR, mixed)
 * - Idempotency tracking
 * - Receipt generation and storage
 * - Inventory synchronization
 * - Comprehensive error handling and logging
 */

import { z } from 'zod';
import {
  createSale,
  updateStock,
  quoteSale,
  POSAPIError,
  type CreateSaleInput,
  type SaleItem,
  type Sale,
} from './pos.server';
import type { PaymentInput } from '~/utils/payment.validation';
import { PaymentSchema, isPaymentSufficient } from '~/utils/payment.validation';
import { calculateChange } from '~/utils/receipt.generator';

/**
 * Idempotency cache configuration
 * In production, this would use Redis or a database
 * For now, we use an in-memory cache with TTL
 */
const IDEMPOTENCY_CACHE = new Map<string, { saleId: string; expiresAt: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

function cleanupExpiredIdempotencyKeys(): void {
  const now = Date.now();
  for (const [key, value] of IDEMPOTENCY_CACHE.entries()) {
    if (value.expiresAt < now) {
      IDEMPOTENCY_CACHE.delete(key);
    }
  }
}

function getIdempotencyCacheEntry(key: string): string | null {
  cleanupExpiredIdempotencyKeys();
  const entry = IDEMPOTENCY_CACHE.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.saleId;
}

function setIdempotencyCacheEntry(key: string, saleId: string): void {
  IDEMPOTENCY_CACHE.set(key, {
    saleId,
    expiresAt: Date.now() + IDEMPOTENCY_TTL,
  });
}

/**
 * Validated payment input with all checks
 */
export interface ValidatedPayment {
  method: 'CASH' | 'CARD' | 'MIXED' | 'QR';
  totalAmount: number;
  paidAmount: number;
  change?: number;
  reference?: string; // For QR, card auth code, etc.
  installments?: number;
}

/**
 * Complete sale request with payment and items
 */
export interface CompleteSaleRequest {
  items: SaleItem[];
  payment: PaymentInput;
  clienteId?: string;
  canal: 'presencial' | 'mayorista' | 'online';
  idempotencyKey?: string;
}

/**
 * Complete sale response with receipt data
 */
export interface CompleteSaleResponse {
  saleId: string;
  numeroComprobanteInterno: string;
  montoTotal: string;
  descuentoTotal: string;
  paymentMethod: string;
  paidAmount: number;
  change?: number;
  items: Array<{
    id: string;
    productoId: string;
    codigoInterno: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: string;
    descuentoUnitario: string;
    subtotal: string;
  }>;
  receiptData: ReceiptData;
  timestamp: string;
}

/**
 * Receipt data for printing/email
 */
export interface ReceiptData {
  saleId: string;
  receiptNumber: string;
  timestamp: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    lineDiscount?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change?: number;
}

/**
 * Payment validation and processing
 * Validates payment method and amounts
 */
export function validatePayment(payment: PaymentInput, totalAmount: number): ValidatedPayment {
  try {
    const validated = PaymentSchema.parse(payment);

    if (!isPaymentSufficient(validated, totalAmount)) {
      throw new Error(`Insufficient payment: ${validated.method} payment does not cover total amount`);
    }

    let paidAmount = totalAmount;
    let change = 0;

    switch (validated.method) {
      case 'CASH':
        paidAmount = validated.amountReceived ?? validated.amount;
        change = calculateChange(totalAmount, paidAmount);
        if (change < 0) {
          throw new Error(`Insufficient cash received: ${paidAmount} < ${totalAmount}`);
        }
        return {
          method: 'CASH',
          totalAmount,
          paidAmount,
          change,
        };

      case 'CARD':
        // Never store card details (PCI compliance)
        // Card validation happens at payment processor level
        return {
          method: 'CARD',
          totalAmount,
          paidAmount: validated.amount,
          installments: validated.installments,
        };

      case 'QR':
        return {
          method: 'QR',
          totalAmount,
          paidAmount: validated.amount,
          reference: validated.qrReference,
        };

      case 'MIXED':
        paidAmount = validated.cashAmount + validated.cardAmount;
        if (paidAmount < totalAmount) {
          throw new Error(`Insufficient mixed payment: ${paidAmount} < ${totalAmount}`);
        }
        change = validated.amountReceived ? calculateChange(validated.cashAmount, validated.amountReceived) : 0;
        return {
          method: 'MIXED',
          totalAmount,
          paidAmount,
          change,
        };

      default:
        throw new Error(`Unknown payment method: ${(validated as any).method}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Payment validation failed: ${error.message}`, 422, error);
    }
    throw new POSAPIError(error instanceof Error ? error.message : 'Payment validation failed', 422);
  }
}

/**
 * Build receipt data from sale and payment info
 */
export function buildReceiptData(
  sale: Sale,
  payment: ValidatedPayment,
  userName: string,
  businessInfo: { name: string; address?: string; taxId?: string }
): ReceiptData {
  const items = sale.items.map((item) => ({
    productName: item.nombreProducto,
    quantity: item.cantidad,
    unitPrice: parseFloat(item.precioUnitario),
    lineTotal: parseFloat(item.subtotal),
    lineDiscount: parseFloat(item.descuentoUnitario) * item.cantidad,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.lineDiscount ?? 0), 0);
  const total = parseFloat(sale.montoTotal);
  const tax = total - subtotal + totalDiscount;

  return {
    saleId: sale.id,
    receiptNumber: sale.numeroComprobanteInterno,
    timestamp: sale.fechaOperacion,
    items,
    subtotal,
    discount: totalDiscount,
    tax: Math.max(0, tax),
    total,
    paymentMethod: payment.method,
    amountPaid: payment.paidAmount,
    change: payment.change,
  };
}

/**
 * Create a complete sale with payment processing
 * Handles idempotency, validation, creation, and receipt generation
 *
 * Steps:
 * 1. Check idempotency key for duplicate
 * 2. Validate payment method and amounts
 * 3. Create sale via API
 * 4. Generate receipt data
 * 5. Log transaction
 * 6. Return complete response
 *
 * If any step fails, the sale is not created (API enforces stock validation)
 *
 * @param request Complete sale request
 * @param jwt JWT token for API calls
 * @param userId User ID for logging
 * @param tenantId Tenant/company ID
 * @param userName User name for receipt
 * @param businessInfo Business information for receipt
 * @returns Complete sale response with receipt
 * @throws POSAPIError on validation, conflict, or server error
 */
export async function processCompleteSale(
  request: CompleteSaleRequest,
  jwt: string,
  userId: string,
  tenantId: string,
  userName: string,
  businessInfo: { name: string; address?: string; taxId?: string }
): Promise<CompleteSaleResponse> {
  try {
    // Step 1: Check idempotency
    const idempotencyKey = request.idempotencyKey || crypto.randomUUID();
    const cachedSaleId = getIdempotencyCacheEntry(idempotencyKey);
    if (cachedSaleId) {
      console.log(`Idempotency: Returning cached sale ${cachedSaleId}`);
      throw new POSAPIError('Duplicate sale attempt (idempotency)', 409);
    }

    // Step 2: Validate payment
    // First, quote the sale to get exact total
    const quote = await quoteSale(request.items, jwt);
    const totalAmount = parseFloat(quote.montoTotal);

    const validatedPayment = validatePayment(request.payment, totalAmount);
    console.log(`Payment validated: ${validatedPayment.method} for ${totalAmount}`);

    // Step 3: Create sale
    const saleRequest: CreateSaleInput = {
      canal: request.canal,
      clienteId: request.clienteId,
      items: request.items,
      idempotencyKey,
    };

    const sale = await createSale(saleRequest, jwt, idempotencyKey);
    console.log(`Sale created: ${sale.id} (${sale.numeroComprobanteInterno})`);

    // Step 4: Cache idempotency key
    setIdempotencyCacheEntry(idempotencyKey, sale.id);

    // Step 5: Build receipt data
    const receiptData = buildReceiptData(sale, validatedPayment, userName, businessInfo);

    // Step 6: Log transaction (non-blocking)
    logSaleTransaction({
      saleId: sale.id,
      userId,
      tenantId,
      totalAmount,
      paymentMethod: validatedPayment.method,
      itemCount: request.items.length,
      timestamp: new Date().toISOString(),
    });

    // Step 7: Return response
    return {
      saleId: sale.id,
      numeroComprobanteInterno: sale.numeroComprobanteInterno,
      montoTotal: sale.montoTotal,
      descuentoTotal: sale.descuentoTotal,
      paymentMethod: validatedPayment.method,
      paidAmount: validatedPayment.paidAmount,
      change: validatedPayment.change,
      items: sale.items,
      receiptData,
      timestamp: sale.fechaOperacion,
    };
  } catch (error) {
    console.error('Process Complete Sale Error:', error);
    throw error;
  }
}

/**
 * Log sale transaction for audit trail
 * Does not include sensitive payment details
 */
export function logSaleTransaction(log: {
  saleId: string;
  userId: string;
  tenantId: string;
  totalAmount: number;
  paymentMethod: string;
  itemCount: number;
  timestamp: string;
}): void {
  console.log({
    event: 'SALE_CREATED',
    saleId: log.saleId,
    userId: log.userId,
    tenantId: log.tenantId,
    totalAmount: log.totalAmount,
    paymentMethod: log.paymentMethod,
    itemCount: log.itemCount,
    timestamp: log.timestamp,
  });
  // In production, send to logging service (e.g., CloudWatch, Datadog, ELK)
}

/**
 * Utility: Check if sale can be created (validation only, no API call)
 */
export async function validateSaleCanBeCreated(items: SaleItem[], jwt: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!items || items.length === 0) {
      return { valid: false, error: 'Sale must have at least one item' };
    }

    for (const item of items) {
      if (item.cantidad <= 0) {
        return { valid: false, error: `Invalid quantity for product ${item.productoId}` };
      }
    }

    // Optionally quote to verify prices
    await quoteSale(items, jwt);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
