import { Module, Logger } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrderConsumer } from './consumers/order.consumer';
import { PaymentConsumer } from './consumers/payment.consumer';
import { CatalogConsumer } from './consumers/catalog.consumer';

const logger = new Logger('KafkaModule');

/**
 * B2 Kafka Module
 *
 * Configures Kafka client with:
 * - Publisher: KafkaService for emitting events to Kafka
 * - Consumers: Order, Payment, Catalog event consumers
 * - Multi-tenant isolation: All events validated for businessId
 * - Error handling: Dead-letter queue support for failed messages
 * - Audit logging: All events logged to database
 */
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'otrarondamas-api',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(
              ',',
            ),
            ssl: process.env.KAFKA_SSL === 'true',
            connectionTimeout: 10000,
            requestTimeout: 25000,
            ...(process.env.KAFKA_SASL_ENABLED === 'true' && {
              sasl: {
                mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
                username: process.env.KAFKA_SASL_USERNAME,
                password: process.env.KAFKA_SASL_PASSWORD,
              } as any,
            }),
          },
          consumer: {
            groupId: process.env.KAFKA_CONSUMER_GROUP || 'otrarondamas-api-group',
            sessionTimeout: 30000,
            rebalanceTimeout: 60000,
            heartbeatInterval: 3000,
          },
          subscribe: {
            topics: [
              'orders.created',
              'orders.updated',
              'payments.completed',
              'payments.failed',
              'catalog.product.updated',
              'catalog.inventory.updated',
              'catalog.price.updated',
            ],
            fromBeginning: false,
          },
        },
      },
    ]),
    PrismaModule,
    MessagingModule,
    NotificationsModule,
  ],
  providers: [KafkaService, OrderConsumer, PaymentConsumer, CatalogConsumer],
  exports: [KafkaService],
})
export class KafkaModule {
  constructor() {
    const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
    const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    logger.log(
      JSON.stringify({
        event: 'kafka.module.initialized',
        kafkaEnabled,
        brokers,
        consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'otrarondamas-api-group',
        topics: [
          'orders.created',
          'orders.updated',
          'payments.completed',
          'payments.failed',
          'catalog.product.updated',
          'catalog.inventory.updated',
          'catalog.price.updated',
        ],
      }),
    );
  }
}
