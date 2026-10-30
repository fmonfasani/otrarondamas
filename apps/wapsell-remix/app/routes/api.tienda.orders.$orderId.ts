/**
 * Get Order Details
 * GET /api/tienda/orders/:orderId
 *
 * Retrieves a single order with all details
 * Only allows users to see their own orders
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { getOrder, TiendaError } from '~/services/tienda.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { orderId } = params;

  if (!orderId) {
    return json({ error: 'Order ID required' }, { status: 400 });
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

    const userId = session.get('userId');
    const order = await getOrder(orderId, userId, tenantContext.empresaId);

    if (!order) {
      return json({ error: 'Order not found' }, { status: 404 });
    }

    return json(
      {
        success: true,
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          taxAmount: order.taxAmount,
          items: order.items,
          payments: order.payments.map((p) => ({
            id: p.id,
            paymentId: p.paymentId,
            method: p.method,
            amount: p.amount,
            status: p.status,
            verifiedAt: p.verifiedAt,
          })),
          shippingAddress: order.shippingAddress,
          shippingCity: order.shippingCity,
          shippingPostalCode: order.shippingPostalCode,
          shippingCountry: order.shippingCountry,
          trackingNumber: order.trackingNumber,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get Order Error:', error);

    if (error instanceof TiendaError) {
      return json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.statusCode }
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
