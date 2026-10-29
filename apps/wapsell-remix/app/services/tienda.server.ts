/**
 * Tienda Order Service
 *
 * Handles:
 * - Order creation and validation
 * - Order status updates
 * - Order retrieval and listing
 * - Order cancellation
 * - Payment association
 * - Multi-tenant scoping
 */

import { db } from '~/utils/db.server';
import { TiendaOrder, TiendaOrderItem, TiendaPayment } from '@prisma/client';

export interface OrderCreateInput {
  user_id: string;
  empresa_id: string;
  items: Array<{
    producto_id: string;
    product_name: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  shipping_address: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  payment_method?: string;
  notes?: string;
}

export interface OrderUpdatePaymentInput {
  order_id: string;
  payment_id: string;
  payment_method: string;
  amount: number;
}

export interface OrderWithItems extends TiendaOrder {
  items: TiendaOrderItem[];
  payments: TiendaPayment[];
}

export class TiendaError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'TiendaError';
  }
}

export async function createOrder(input: OrderCreateInput): Promise<OrderWithItems> {
  // Validate input
  if (!input.user_id || !input.empresa_id) {
    throw new TiendaError('Missing user_id or empresa_id', 400, 'INVALID_TENANT');
  }

  if (!input.items || input.items.length === 0) {
    throw new TiendaError('Order must have at least one item', 400, 'NO_ITEMS');
  }

  if (!input.shipping_address) {
    throw new TiendaError('Shipping address is required', 400, 'NO_ADDRESS');
  }

  // Validate user belongs to empresa
  const user = await db.usuario.findUnique({
    where: { id: input.user_id },
  });

  if (!user || user.empresaId !== input.empresa_id) {
    throw new TiendaError('User not found or does not belong to this empresa', 401, 'UNAUTHORIZED');
  }

  // Calculate totals
  let subtotal = 0;
  const orderItems: Array<{
    productoId: string;
    productName: string;
    quantity: number;
    price: number;
    discount: number;
  }> = [];

  for (const item of input.items) {
    const discount = item.discount || 0;
    const itemTotal = item.quantity * item.price;
    subtotal += itemTotal - discount;

    orderItems.push({
      productoId: item.producto_id,
      productName: item.product_name,
      quantity: item.quantity,
      price: item.price,
      discount,
    });
  }

  const shippingCost = 0; // Calculate based on address if needed
  const taxAmount = 0; // Calculate based on region if needed
  const total = subtotal + shippingCost + taxAmount;

  try {
    const order = await db.tiendaOrder.create({
      data: {
        empresaId: input.empresa_id,
        usuarioId: input.user_id,
        status: 'pending',
        subtotal: new Decimal(subtotal),
        shippingCost: new Decimal(shippingCost),
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        shippingAddress: input.shipping_address,
        shippingCity: input.shipping_city,
        shippingPostalCode: input.shipping_postal_code,
        shippingCountry: input.shipping_country,
        paymentMethod: input.payment_method,
        notes: input.notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order as OrderWithItems;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new TiendaError(
      'Failed to create order',
      500,
      'CREATE_FAILED'
    );
  }
}

export async function getOrder(
  order_id: string,
  user_id: string,
  empresa_id: string
): Promise<OrderWithItems | null> {
  try {
    const order = await db.tiendaOrder.findFirst({
      where: {
        id: order_id,
        usuarioId: user_id,
        empresaId: empresa_id,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order as OrderWithItems | null;
  } catch (error) {
    console.error('Failed to fetch order:', error);
    throw new TiendaError(
      'Failed to fetch order',
      500,
      'FETCH_FAILED'
    );
  }
}

export async function getOrders(
  user_id: string,
  empresa_id: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  orders: OrderWithItems[];
  total: number;
}> {
  try {
    const [orders, total] = await Promise.all([
      db.tiendaOrder.findMany({
        where: {
          usuarioId: user_id,
          empresaId: empresa_id,
        },
        include: {
          items: true,
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      db.tiendaOrder.count({
        where: {
          usuarioId: user_id,
          empresaId: empresa_id,
        },
      }),
    ]);

    return {
      orders: orders as OrderWithItems[],
      total,
    };
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw new TiendaError(
      'Failed to fetch orders',
      500,
      'FETCH_FAILED'
    );
  }
}

export async function updateOrderStatus(
  order_id: string,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  empresa_id: string
): Promise<OrderWithItems> {
  try {
    const order = await db.tiendaOrder.update({
      where: {
        id: order_id,
        empresaId: empresa_id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order as OrderWithItems;
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new TiendaError(
      'Failed to update order status',
      500,
      'UPDATE_FAILED'
    );
  }
}

export async function cancelOrder(
  order_id: string,
  user_id: string,
  empresa_id: string
): Promise<boolean> {
  try {
    const order = await db.tiendaOrder.findFirst({
      where: {
        id: order_id,
        usuarioId: user_id,
        empresaId: empresa_id,
      },
    });

    if (!order) {
      throw new TiendaError('Order not found', 404, 'NOT_FOUND');
    }

    if (
      order.status === 'shipped' ||
      order.status === 'delivered' ||
      order.status === 'cancelled'
    ) {
      throw new TiendaError(
        `Cannot cancel order in status: ${order.status}`,
        409,
        'INVALID_STATUS'
      );
    }

    await db.tiendaOrder.update({
      where: { id: order_id },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    if (error instanceof TiendaError) {
      throw error;
    }
    console.error('Failed to cancel order:', error);
    throw new TiendaError(
      'Failed to cancel order',
      500,
      'CANCEL_FAILED'
    );
  }
}

export async function updateOrderPayment(
  order_id: string,
  empresa_id: string,
  payment_data: {
    payment_id: string;
    payment_method: string;
    amount: number;
  }
): Promise<OrderWithItems> {
  try {
    // Update order with payment method
    const order = await db.tiendaOrder.update({
      where: {
        id: order_id,
        empresaId: empresa_id,
      },
      data: {
        paymentMethod: payment_data.payment_method,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order as OrderWithItems;
  } catch (error) {
    console.error('Failed to update order payment:', error);
    throw new TiendaError(
      'Failed to update order payment',
      500,
      'UPDATE_FAILED'
    );
  }
}

export async function storeWebhookLog(
  order_id: string | null,
  event_type: string,
  payload: Record<string, any>,
  signature?: string
): Promise<string> {
  try {
    const log = await db.tiendaWebhookLog.create({
      data: {
        orderId: order_id,
        eventType: event_type,
        payload,
        signature,
      },
    });

    return log.id;
  } catch (error) {
    console.error('Failed to store webhook log:', error);
    throw new TiendaError(
      'Failed to store webhook log',
      500,
      'LOG_FAILED'
    );
  }
}

export async function markWebhookProcessed(
  log_id: string,
  order_id?: string
): Promise<void> {
  try {
    await db.tiendaWebhookLog.update({
      where: { id: log_id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to mark webhook as processed:', error);
    throw new TiendaError(
      'Failed to update webhook log',
      500,
      'LOG_UPDATE_FAILED'
    );
  }
}

export async function getWebhookLog(log_id: string) {
  try {
    return await db.tiendaWebhookLog.findUnique({
      where: { id: log_id },
    });
  } catch (error) {
    console.error('Failed to fetch webhook log:', error);
    return null;
  }
}

// Import Decimal for price calculations
import { Decimal } from '@prisma/client/runtime/library';
