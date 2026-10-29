/**
 * List User Orders
 * GET /api/tienda/orders?limit=20&offset=0
 *
 * Retrieves paginated list of user's orders
 * Only shows orders belonging to authenticated user
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { getOrders, TiendaError } from '~/services/tienda.server';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function loader({ request }: LoaderFunctionArgs) {
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

    // Parse query parameters
    const url = new URL(request.url);
    const queryData = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    };

    const query = QuerySchema.parse(queryData);

    const userId = session.get('userId');
    const result = await getOrders(userId, tenantContext.empresaId, query.limit, query.offset);

    return json(
      {
        success: true,
        orders: result.orders.map((order) => ({
          id: order.id,
          status: order.status,
          total: order.total,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          taxAmount: order.taxAmount,
          itemCount: order.items.length,
          shippingAddress: order.shippingAddress,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < result.total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('List Orders Error:', error);

    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'validation',
          message: 'Invalid query parameters',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
        { status: 400 }
      );
    }

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
