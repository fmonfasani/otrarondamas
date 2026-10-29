/**
 * POS Route Actions
 * Server-side mutation handlers for POS operations:
 * - Creating sales
 * - Updating inventory (adjustments)
 * - Searching products
 *
 * Actions use optimistic updates on the client side with rollback on error.
 */

import { type ActionFunctionArgs, json } from '@remix-run/node';
import { z } from 'zod';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { createSale, updateStock, quoteSale, POSAPIError, CreateSaleSchema, type CreateSaleInput } from '~/services/pos.server';

/**
 * Create Sale Action
 *
 * POST /api/pos/sales
 *
 * Creates a new sale with items.
 * Uses Idempotency-Key for safe retries.
 *
 * Request body:
 * {
 *   canal: 'presencial' | 'mayorista' | 'online'
 *   items: [{ productoId, cantidad, precioUnitario, descuentoUnitario? }]
 *   clienteId?: string (UUID)
 *   idempotencyKey?: string (UUID, auto-generated if not provided)
 * }
 *
 * Success response (200):
 * {
 *   success: true
 *   sale: { id, numeroComprobanteInterno, montoTotal, ... }
 * }
 *
 * Error responses:
 * - 409 Conflict: Stock oversold (validation failed at server)
 * - 422 Unprocessable: Validation error in request
 * - 500 Server Error: Database/API error (can retry)
 */
export async function createSaleAction({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json({ error: 'No active business context' }, { status: 403 });
    }

    // Check permission
    if (!tenantContext.permisos?.includes('ventas.crear')) {
      return json({ error: 'Forbidden: You lack permission to create sales' }, { status: 403 });
    }

    const body = await request.json();
    const saleData: CreateSaleInput = body;

    // Create the sale with optional idempotency key
    const sale = await createSale(saleData, jwt, body.idempotencyKey);

    return json(
      {
        success: true,
        sale: {
          id: sale.id,
          numeroComprobanteInterno: sale.numeroComprobanteInterno,
          montoTotal: sale.montoTotal,
          descuentoTotal: sale.descuentoTotal,
          items: sale.items,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Sale Action Error:', error);

    if (error instanceof POSAPIError) {
      if (error.isConflict()) {
        // 409: Stock oversold — client should show "Stock is insufficient" and ask user to adjust qty
        return json(
          {
            error: 'conflict',
            message: 'Stock is insufficient for one or more items. Please adjust quantities.',
            details: error.message,
          },
          { status: 409 }
        );
      }

      if (error.isValidationError()) {
        // 422: Validation error
        return json(
          {
            error: 'validation',
            message: 'Invalid sale data',
            details: error.message,
          },
          { status: 422 }
        );
      }

      if (error.isServerError()) {
        // 500+: Server error — can retry
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
            message: 'Request timed out. The sale may or may not have been created. Check your sales log.',
          },
          { status: 504 }
        );
      }
    }

    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'validation',
          message: 'Invalid request body',
          details: error.errors[0]?.message,
        },
        { status: 422 }
      );
    }

    return json(
      {
        error: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update Stock Action
 *
 * PATCH /api/pos/inventory/{productoId}
 *
 * Adjusts inventory for a product.
 * Used for manual stock corrections or processing returns.
 *
 * Request body:
 * {
 *   ajuste: number (positive or negative)
 *   razon: string (audit trail reason)
 * }
 *
 * Success response (200):
 * {
 *   success: true
 *   item: { productoId, stockActual, ... }
 * }
 *
 * Error responses:
 * - 409 Conflict: Adjustment would make stock negative
 * - 422 Unprocessable: Validation error
 * - 500 Server Error: Database/API error
 */
export async function updateStockAction({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'PATCH' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json({ error: 'No active business context' }, { status: 403 });
    }

    // Check permission
    if (!tenantContext.permisos?.includes('inventario.ajustar')) {
      return json({ error: 'Forbidden: You lack permission to adjust inventory' }, { status: 403 });
    }

    const { productoId } = params;

    if (!productoId) {
      return json({ error: 'Product ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const schema = z.object({
      ajuste: z.number('Adjustment must be a number'),
      razon: z.string().min(3, 'Reason must be at least 3 characters'),
    });

    const validated = schema.parse(body);

    const item = await updateStock(productoId, validated.ajuste, validated.razon, jwt);

    return json(
      {
        success: true,
        item: {
          productoId: item.productoId,
          codigoInterno: item.codigoInterno,
          nombreProducto: item.nombreProducto,
          stockActual: item.stockActual,
          stockMinimo: item.stockMinimo,
          stockMaximo: item.stockMaximo,
          ultimaActualizacion: item.ultimaActualizacion,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update Stock Action Error:', error);

    if (error instanceof POSAPIError) {
      if (error.isConflict()) {
        return json(
          {
            error: 'conflict',
            message: 'Adjustment would make stock negative',
            details: error.message,
          },
          { status: 409 }
        );
      }

      if (error.isValidationError()) {
        return json(
          {
            error: 'validation',
            message: 'Invalid adjustment data',
            details: error.message,
          },
          { status: 422 }
        );
      }

      if (error.isServerError()) {
        return json(
          {
            error: 'server_error',
            message: 'API server error',
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'validation',
          message: 'Invalid request body',
          details: error.errors[0]?.message,
        },
        { status: 422 }
      );
    }

    return json(
      {
        error: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Quote Sale Action
 *
 * POST /api/pos/quote
 *
 * Calculates sale totals without persisting.
 * Called on every cart change (debounced 300ms) to show exact amounts.
 *
 * Request body:
 * {
 *   items: [{ productoId, cantidad, precioUnitario, descuentoUnitario? }]
 * }
 *
 * Success response (200):
 * {
 *   success: true
 *   quote: { montoTotal, descuentoTotal, items: [...] }
 * }
 *
 * Error responses:
 * - 422 Unprocessable: Validation error
 * - 500 Server Error: Calculation error
 */
export async function quoteSaleAction({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const schema = z.object({
      items: z.array(
        z.object({
          productoId: z.string().uuid(),
          cantidad: z.number().positive(),
          precioUnitario: z.string(),
          descuentoUnitario: z.string().optional(),
        })
      ),
    });

    const validated = schema.parse(body);

    const quote = await quoteSale(validated.items, jwt);

    return json(
      {
        success: true,
        quote: {
          montoTotal: quote.montoTotal,
          descuentoTotal: quote.descuentoTotal,
          items: quote.items,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Quote Sale Action Error:', error);

    if (error instanceof POSAPIError) {
      if (error.isValidationError()) {
        return json(
          {
            error: 'validation',
            message: 'Invalid quote data',
            details: error.message,
          },
          { status: 422 }
        );
      }

      if (error.isTimeout()) {
        return json(
          {
            error: 'timeout',
            message: 'Quote calculation timed out',
          },
          { status: 504 }
        );
      }

      if (error.isServerError()) {
        return json(
          {
            error: 'server_error',
            message: 'API server error',
          },
          { status: 500 }
        );
      }
    }

    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'validation',
          message: 'Invalid request body',
          details: error.errors[0]?.message,
        },
        { status: 422 }
      );
    }

    return json(
      {
        error: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
