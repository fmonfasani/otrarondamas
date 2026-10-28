import { publishToKafka } from './kafka.server';

export async function publishOrderCreated(orderData: any) {
  await publishToKafka('orders.created', {
    ...orderData,
    timestamp: new Date().toISOString(),
  });
}

export async function publishOrderUpdated(orderId: string, changes: any) {
  await publishToKafka('orders.updated', {
    orderId,
    changes,
    timestamp: new Date().toISOString(),
  });
}

export async function publishInventoryUpdated(productId: string, stock: number, empresaId: string) {
  await publishToKafka('inventory.updated', {
    productId,
    stock,
    empresaId,
    timestamp: new Date().toISOString(),
  });
}

export async function publishNotification(userId: string, empresaId: string, message: string) {
  await publishToKafka('notifications.sent', {
    userId,
    empresaId,
    message,
    timestamp: new Date().toISOString(),
  });
}
