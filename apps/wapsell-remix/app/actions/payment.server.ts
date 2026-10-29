'use server';

import { redirect } from '@remix-run/node';
import { type Request } from '@remix-run/node';
import { v4 as uuidv4 } from 'crypto';
import { PaymentSchema } from '../utils/payment.validation';
import {
  Payment,
  Receipt,
  PaymentResponse,
  CreatePagoVentaRequest,
  MedioPago
} from '@otrarondamas/shared-types';

/**
 * Server action: Process payment for a sale
 *
 * This action:
 * 1. Validates the payment data using Zod schema
 * 2. Checks idempotency key to prevent duplicate payments
 * 3. Calls the backend API to create the payment record
 * 4. Generates a receipt
 * 5. Returns receipt data for display/print/email
 */
export async function processPayment(
  saleId: string,
  payment: Payment,
  totalAmount: number,
  idempotencyKey?: string
): Promise<PaymentResponse> {
  try {
    // Validate payment data
    const validatedPayment = PaymentSchema.parse(payment);

    // Generate idempotency key if not provided
    const idempotency = idempotencyKey || uuidv4();

    // Prepare API request
    const paymentRequest: CreatePagoVentaRequest = {
      medio: convertPaymentMethodToMedio(validatedPayment.method),
      monto: totalAmount,
      ...(validatedPayment.method === 'CASH' && {
        montoRecibido: (validatedPayment as any).amountReceived || totalAmount,
      }),
      ...(validatedPayment.method === 'QR' && {
        referencia: (validatedPayment as any).qrReference,
      }),
    };

    // Call backend API with idempotency header
    const apiResponse = await fetch(
      `${process.env.API_URL}/ventas/${saleId}/pagos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN}`,
          'Idempotency-Key': idempotency,
        },
        body: JSON.stringify(paymentRequest),
      }
    );

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    const pago = await apiResponse.json();

    // Generate receipt
    const receipt: Receipt = {
      id: uuidv4(),
      saleId,
      receiptNumber: `REC-${Date.now()}`,
      businessName: process.env.BUSINESS_NAME || 'Otra Ronda Más',
      businessAddress: process.env.BUSINESS_ADDRESS,
      businessTaxId: process.env.BUSINESS_TAX_ID,
      items: [], // Would be populated from sale items
      subtotal: totalAmount,
      total: totalAmount,
      paymentMethod: validatedPayment.method,
      paymentAmount: totalAmount,
      change: getChange(validatedPayment),
      issuedAt: new Date(),
      userName: 'System', // Would come from authenticated user
    };

    return {
      success: true,
      saleId,
      receiptId: receipt.id,
      receipt,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      saleId,
      receiptId: '',
      receipt: {} as Receipt,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert internal payment method to API medio
 */
function convertPaymentMethodToMedio(method: string): MedioPago {
  const methodMap: Record<string, MedioPago> = {
    CASH: 'efectivo',
    CARD: 'transferencia',
    MIXED: 'efectivo',
    QR: 'QR',
  };
  return methodMap[method] || 'efectivo';
}

/**
 * Get change amount for payment
 */
function getChange(payment: Payment): number {
  switch (payment.method) {
    case 'CASH':
      const cashPayment = payment as any;
      return (cashPayment.change || 0);
    case 'MIXED':
      const mixedPayment = payment as any;
      return (mixedPayment.change || 0);
    default:
      return 0;
  }
}

/**
 * Generate idempotency key (v4 UUID)
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * Encrypt card number for storage (never store full number)
 * This is a placeholder - use proper encryption in production
 */
export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length <= 4) return cardNumber;
  const last4 = cardNumber.slice(-4);
  return `****-****-****-${last4}`;
}
