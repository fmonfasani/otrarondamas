/**
 * Create Tienda Order
 * POST /api/tienda/create-order
 *
 * Handles:
 * - Order creation with validation
 * - Mercado Pago payment initialization
 * - Idempotency key management
 * - Error handling with proper status codes
 *
 * Request body:
 * {
 *   items: [{ producto_id, product_name, quantity, price, discount? }],
 *   shipping_address: string,
 *   shipping_city?: string,
 *   shipping_postal_code?: string,
 *   shipping_country?: string,
 *   notes?: string,
 *   user_email?: string,
 *   idempotency_key?: string (UUID)
 * }
 *
 * Success response (201):
 * {
 *   success: true,
 *   order: { id, status, total, ... },
 *   payment: { preference_id, payment_url },
 *   timestamp: ISO string
 * }
 *
 * Error responses:
 * - 400 Bad Request: Missing/invalid fields
 * - 401 Unauthorized: Not authenticated or tenant issue
 * - 409 Conflict: Duplicate idempotency key
 * - 422 Unprocessable: Validation failed
 * - 504 Gateway Timeout: MP API slow
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { createOrder, TiendaError, getOrders } from '~/services/tienda.server';
import { initPaymentPreference, getIdempotencyKey, storeIdempotencyKey, MercadoPagoError } from '~/services/mercadopago.server';
import { db } from '~/utils/db.server';

const OrderItemSchema = z.object({
  producto_id: z.string().min(1, 'Product ID required'),
  product_name: z.string().min(1, 'Product name required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().positive('Price must be positive'),
  discount: z.number().nonnegative('Discount must be non-negative').optional(),
});

const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item required'),
  shipping_address: z.string().min(1, 'Shipping address required'),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
  notes: z.string().optional(),
  user_email: z.string().email('Invalid email').optional(),
  idempotency_key: z.string().uuid('Invalid idempotency key format').optional(),
});

type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

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
    // Get tenant context
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json({ error: 'No active business context' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const createRequest = CreateOrderRequestSchema.parse(body);

    // Check idempotency key
    if (createRequest.idempotency_key) {
      const existingOrderId = getIdempotencyKey(createRequest.idempotency_key);
      if (existingOrderId) {
        // Return cached order
        const cachedOrder = await getOrders(
          session.get('userId'),
          tenantContext.empresaId,
          1,
          0
        );

        const order = cachedOrder.orders.find((o) => o.id === existingOrderId);
        if (order) {
          return json(
            {
              success: true,
              order: {
                id: order.id,
                status: order.status,
                total: order.total,
                items: order.items,
              },
              message: 'Order already exists (idempotency key)',
            },
            { status: 200 }
          );
        }
      }
    }

    const userId = session.get('userId');
    const userEmail = createRequest.user_email || session.get('userEmail') || '';

    // Create order
    const newOrder = await createOrder({
      user_id: userId,
      empresa_id: tenantContext.empresaId,
      items: createRequest.items,
      shipping_address: createRequest.shipping_address,
      shipping_city: createRequest.shipping_city,
      shipping_postal_code: createRequest.shipping_postal_code,
      shipping_country: createRequest.shipping_country,
      notes: createRequest.notes,
    });

    // Prepare Mercado Pago items
    const mpItems = createRequest.items.map((item) => ({
      id: item.producto_id,
      title: item.product_name,
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: 'ARS', // Default to ARS, could be configured
    }));

    // Initialize payment preference
    let paymentPreference;
    try {
      paymentPreference = await initPaymentPreference(
        newOrder.id,
        mpItems,
        parseFloat(newOrder.shippingCost.toString()),
        parseFloat(newOrder.total.toString()),
        {
          user_email: userEmail,
          notification_url: `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/webhooks/mercadopago`,
          return_url: `${process.env.VITE_API_URL || 'http://localhost:3000'}/orders/${newOrder.id}`,
          metadata: {
            order_id: newOrder.id,
            user_id: userId,
            empresa_id: tenantContext.empresaId,
          },
          idempotency_key: createRequest.idempotency_key,
        }
      );
    } catch (error) {
      if (error instanceof MercadoPagoError) {
        console.error('Mercado Pago error:', {
          message: error.message,
          statusCode: error.statusCode,
        });

        if (error.statusCode === 408 || error.statusCode === 504) {
          return json(
            {
              error: 'payment_timeout',
              message: 'Payment service timeout. Order created but payment initialization failed.',
              order_id: newOrder.id,
            },
            { status: 504 }
          );
        }

        return json(
          {
            error: 'payment_failed',
            message: 'Failed to initialize payment. Order created but could not generate payment URL.',
            order_id: newOrder.id,
          },
          { status: 500 }
        );
      }

      throw error;
    }

    // Create payment record
    const payment = await db.tiendaPayment.create({
      data: {
        orderId: newOrder.id,
        paymentId: paymentPreference.preference_id,
        method: 'mercadopago',
        amount: newOrder.total,
        status: 'pending',
      },
    });

    // Store idempotency key
    if (createRequest.idempotency_key) {
      storeIdempotencyKey(createRequest.idempotency_key, newOrder.id);
    }

    return json(
      {
        success: true,
        order: {
          id: newOrder.id,
          status: newOrder.status,
          total: newOrder.total,
          subtotal: newOrder.subtotal,
          shippingCost: newOrder.shippingCost,
          taxAmount: newOrder.taxAmount,
          items: newOrder.items,
          shippingAddress: newOrder.shippingAddress,
          createdAt: newOrder.createdAt,
        },
        payment: {
          preference_id: paymentPreference.preference_id,
          payment_url: paymentPreference.payment_url,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Order Action Error:', error);

    // TiendaError - structured errors
    if (error instanceof TiendaError) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return json(
          {
            error: error.code,
            message: error.message,
          },
          { status: error.statusCode }
        );
      }

      if (error.statusCode === 404) {
        return json(
          {
            error: error.code,
            message: error.message,
          },
          { status: 404 }
        );
      }

      if (error.statusCode === 409) {
        return json(
          {
            error: error.code,
            message: error.message,
          },
          { status: 409 }
        );
      }

      if (error.statusCode >= 500) {
        return json(
          {
            error: error.code,
            message: error.message,
          },
          { status: 500 }
        );
      }

      return json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
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
