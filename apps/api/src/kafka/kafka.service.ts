import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaService {
  constructor(@Inject('KAFKA_SERVICE') private kafkaClient: ClientKafka) {}

  async publishOrderCreated(orderData: any) {
    await this.kafkaClient.emit('orders.created', JSON.stringify(orderData));
  }

  async publishOrderUpdated(orderId: string, changes: any) {
    await this.kafkaClient.emit('orders.updated',
      JSON.stringify({ orderId, changes, timestamp: new Date() })
    );
  }

  async publishInventoryUpdated(productId: string, stock: number, empresaId: string) {
    await this.kafkaClient.emit('inventory.updated',
      JSON.stringify({ productId, stock, empresaId, timestamp: new Date() })
    );
  }

  async publishNotification(userId: string, empresaId: string, message: string) {
    await this.kafkaClient.emit('notifications.sent',
      JSON.stringify({ userId, empresaId, message, timestamp: new Date() })
    );
  }
}
