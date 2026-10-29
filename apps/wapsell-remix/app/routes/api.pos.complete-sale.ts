/**
 * Complete Sale Action
 * POST /api/pos/complete-sale
 *
 * Handles the complete sale workflow:
 * 1. Payment validation (cash, card, QR, mixed)
 * 2. Sale creation with idempotency
 * 3. Receipt generation
 * 4. Error handling with proper status codes
 *
 * Request body:
 * {
 *   items: [{ productoId, cantidad, precioUnitario, descuentoUnitario }],
 *   payment: { method, amount, ... },
 *   clienteId?: string,
 *   canal: 'presencial' | 'mayorista' | 'online',
 *   idempotencyKey?: string (UUID)
 * }
 *
 * Success response (201):
 * {
 *   success: true,
 *   sale: { id, numeroComprobanteInterno, montoTotal, ... },
 *   receiptData: { ... },
 *   change?: number
 * }
 *
 * Error responses:
 * - 400 Bad Request: Missing/invalid fields
 * - 409 Conflict: Insufficient stock, duplicate sale
 * - 422 Unprocessable: Validation failed (payment, prices, etc.)
 * - 500 Server Error: Database/API error
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { processCompleteSale, POSAPIError } from '~/services/pos.payment.server';
import { PaymentFormSchema } from '~/utils/payment.validation';
import { SaleItemSchema } from '~/services/pos.server';

/**
 * Request validation schema
 */
const CompleteSaleRequestSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item required'),
  payment: z.any(), // Validated separately with PaymentFormSchema
  clienteId: z.string().uuid().optional(),
  canal: z.enum(['presencial', 'mayorista', 'online']),
  idempotencyKey: z.string().uuid().optional(),
});

type CompleteSaleRequest = z.infer<typeof CompleteSaleRequestSchema>;

export async function action({ request }: ActionFunctionArgs) {
  // Only POST allowed
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get tenant context for authorization and logging
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json({ error: 'No active business context' }, { status: 403 });
    }

    if (!tenantContext.permisos?.includes('ventas.crear')) {
      return json({ error: 'Forbidden: You lack permission to create sales' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();

    const completeRequest = CompleteSaleRequestSchema.parse(body);

    // Validate payment structure
    const paymentValidation = PaymentFormSchema.safeParse({
      payment: completeRequest.payment,
      idempotencyKey: completeRequest.idempotencyKey,
    });

    if (!paymentValidation.success) {
      return json(
        {
          error: 'validation',
          message: 'Invalid payment data',
          details: paymentValidation.error.errors[0]?.message,
        },
        { status: 422 }
      );
    }

    // Get user info from session
    const userId = session.get('userId');
    const userEmail = session.get('userEmail');
    const userName = session.get('userName') || userEmail || 'POS User';

    // Process the complete sale
    const result = await processCompleteSale(
      {
        items: completeRequest.items,
        payment: completeRequest.payment,
        clienteId: completeRequest.clienteId,
        canal: completeRequest.canal,
        idempotencyKey: completeRequest.idempotencyKey,
      },
      jwt,
      userId,
      tenantContext.empresaId,
      userName,
      {
        name: tenantContext.empresaNombre || 'Store',
        address: tenantContext.empresaDireccion,
        taxId: tenantContext.empresaCUIT,
      }
    );

    return json(
      {
        success: true,
        sale: {
          id: result.saleId,
          numeroComprobanteInterno: result.numeroComprobanteInterno,
          montoTotal: result.montoTotal,
          descuentoTotal: result.descuentoTotal,
          items: result.items,
        },
        payment: {
          method: result.paymentMethod,
          amountPaid: result.paidAmount,
          change: result.change,
        },
        receiptData: result.receiptData,
        timestamp: result.timestamp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Complete Sale Action Error:', error);

    // POSAPIError - structured API errors
    if (error instanceof POSAPIError) {
      if (error.isConflict()) {
        return json(
          {
            error: 'conflict',
            message: 'Sale could not be created. Stock may be insufficient or idempotency key is duplicate.',
            details: error.message,
          },
          { status: 409 }
        );
      }

      if (error.isValidationError()) {
        return json(
          {
            error: 'validation',
            message: 'Invalid sale or payment data',
            details: error.message,
          },
          { status: 422 }
        );
      }

      if (error.isServerError()) {
        return json(
          {
            error: 'server_error',
            message: 'API server error. Please try again.',
            details: error.message,
          },
          { status: 500 }
        );
      }

      if (error.isTimeout()) {
        return json(
          {
            error: 'timeout',
            message: 'Request timed out. Sale may or may not have been created.',
          },
          { status: 504 }
        );
      }
    }

    // Zod validation errors
    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'validation',
          message: 'Invalid request body',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
        { status: 422 }
      );
    }

    // Generic error
    return json(
      {
        error: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
