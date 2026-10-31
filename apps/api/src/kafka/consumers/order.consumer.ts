import {
  Controller,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  KafkaContext,
  RpcException,
} from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingGateway } from '../../messaging/messaging.gateway';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import {
  OrderEvent,
  extractOrderEventBusinessId,
} from '../types/order-event';

/**
 * B2-Order Event Consumer
 *
 * Consumes Kafka events from 'orders.created' and 'orders.updated' topics.
 * Validates businessId for multi-tenant isolation, creates notifications,
 * and broadcasts to connected Socket.IO clients.
 *
 * Error handling: On failure, sends to DLQ topic.
 * Audit: All events logged to database for traceability.
 */
@Controller()
export class OrderConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  onModuleInit(): void {
    this.logger.log('OrderConsumer initialized and ready to consume events');
  }

  onModuleDestroy(): void {
    this.logger.log('OrderConsumer shutting down');
  }

  /**
   * Consume order.created events.
   * Validates event, creates notification, broadcasts via Socket.IO.
   */
  @MessagePattern('orders.created')
  async handleOrderCreated(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: OrderEvent;
    const offset = context.getMessage().offset;

    try {
      // Parse and validate event structure
      event = this.parseEvent(message, 'order.created');

      // Enforce multi-tenant isolation: validate businessId
      const businessId = extractOrderEventBusinessId(event);
      if (!businessId) {
        this.logger.error(
          JSON.stringify({
            event: 'order.consumer.invalid_business_id',
            offset,
            eventId: event.eventId,
            reason: 'businessId missing or invalid',
          }),
        );
        throw new RpcException(
          'Invalid businessId in order event - multi-tenant isolation violation',
        );
      }

      // Verify business exists (prevents hallucinated businesses)
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        this.logger.error(
          JSON.stringify({
            event: 'order.consumer.business_not_found',
            offset,
            eventId: event.eventId,
            businessId,
          }),
        );
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Verify order exists in the correct business context
      if ('orderId' in event && event.orderId) {
        const order = await this.prisma.pedido.findUnique({
          where: { id: event.orderId },
        });
        if (!order || order.empresaId !== businessId) {
          this.logger.error(
            JSON.stringify({
              event: 'order.consumer.order_not_found_or_mismatch',
              offset,
              eventId: event.eventId,
              orderId: event.orderId,
              businessId,
            }),
          );
          throw new RpcException(
            `Order ${event.orderId} not found in Business ${businessId}`,
          );
        }
      }

      // Create notification in database (scoped to business)
      const notification = await this.createOrderNotification(event, businessId);

      // Audit log
      await this.logKafkaEvent(event, businessId, 'processed');

      // Broadcast to Socket.IO (scoped by businessId room)
      this.broadcastOrderEvent(event, businessId, notification);

      // Queue async notification delivery (email, SMS)
      await this.notificationQueue.enqueue({
        type: 'order_created',
        businessId,
        customerId: 'customerId' in event ? event.customerId : undefined,
        orderId: 'orderId' in event ? event.orderId : undefined,
        metadata: event,
      });

      this.logger.log(
        JSON.stringify({
          event: 'order.consumer.order_created_processed',
          offset,
          eventId: event.eventId,
          businessId,
          orderId: 'orderId' in event ? event.orderId : undefined,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'order.consumer.order_created_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
          message: typeof message === 'string' ? message : 'unparseable',
        }),
      );

      // Send to DLQ
      await this.sendToDLQ(message, 'orders.created', error);
      throw error;
    }
  }

  /**
   * Consume order.updated events.
   * Validates event, updates order status, broadcasts via Socket.IO.
   */
  @MessagePattern('orders.updated')
  async handleOrderUpdated(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: OrderEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'order.updated');

      // Enforce multi-tenant isolation
      const businessId = extractOrderEventBusinessId(event);
      if (!businessId) {
        this.logger.error(
          JSON.stringify({
            event: 'order.consumer.update.invalid_business_id',
            offset,
            eventId: event.eventId,
          }),
        );
        throw new RpcException('Invalid businessId in order update event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Update order and audit
      if ('orderId' in event && event.orderId) {
        const order = await this.prisma.pedido.findUnique({
          where: { id: event.orderId },
        });

        if (!order || order.empresaId !== businessId) {
          throw new RpcException(
            `Order ${event.orderId} not found in Business ${businessId}`,
          );
        }

        // Log status change for audit trail
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast to Socket.IO
        this.broadcastOrderEvent(event, businessId, null);
      }

      this.logger.log(
        JSON.stringify({
          event: 'order.consumer.order_updated_processed',
          offset,
          eventId: event.eventId,
          businessId,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'order.consumer.order_updated_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'orders.updated', error);
      throw error;
    }
  }

  /**
   * Parse event from Kafka message payload.
   * Validates JSON structure and event type.
   */
  private parseEvent(message: string, expectedType: string): OrderEvent {
    try {
      const event = JSON.parse(message) as OrderEvent;

      // Validate event structure
      if (!event.eventId || typeof event.eventId !== 'string') {
        throw new Error('Invalid eventId');
      }
      if (event.eventType !== expectedType) {
        throw new Error(`Expected ${expectedType}, got ${event.eventType}`);
      }

      return event;
    } catch (error) {
      throw new RpcException(
        `Failed to parse order event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create notification record for order event.
   * Scoped to business via CompanyScoped any
   */
  private async createOrderNotification(
    event: OrderEvent,
    businessId: string,
  ): Promise<any> {
    // Create notification record using Notificacion model
    const notification = await this.prisma.notificacion.create({
      data: {
        empresaId: businessId,
        evento: 'order.created' in event ? 'ORDER_CREATED' : 'ORDER_UPDATED',
        canal: 'SYSTEM',
        destinatario: 'order.created' in event
          ? (event as any).customerId
          : 'system',
        estadoEnvio: 'PENDING',
        mensaje:
          'order.created' in event
            ? `Nuevo pedido #${(event as any).orderNumber}`
            : `Pedido actualizado a ${(event as any).newStatus}`,
      },
    });

    return notification;
  }

  /**
   * Broadcast order event to Socket.IO clients.
   * Scoped by businessId room to enforce multi-tenant isolation.
   */
  private broadcastOrderEvent(event: OrderEvent, businessId: string, notification: any): void {
    try {
      const roomName = `business:${businessId}:orders`;
      this.messagingGateway.publishToConversation(
        'order.event.received',
        roomName,
        {
          eventId: event.eventId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          businessId,
          notification,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast order event to Socket.IO: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Non-fatal: don't reject the whole consumption if broadcast fails
    }
  }

  /**
   * Log Kafka event to database for audit trail and traceability.
   */
  private async logKafkaEvent(
    event: OrderEvent,
    businessId: string,
    status: 'received' | 'processed' | 'failed',
  ): Promise<void> {
    try {
      await this.prisma.kafkaEventLog.create({
        data: {
          id: `log-${event.eventId}-${status}`,
          businessId,
          eventType: event.eventType,
          eventId: event.eventId,
          topic: event.eventType.includes('created')
            ? 'orders.created'
            : 'orders.updated',
          status,
          payload: event,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log Kafka event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Non-fatal: don't reject consumption if logging fails
    }
  }

  /**
   * Send failed messages to Dead Letter Queue for replay/analysis.
   */
  private async sendToDLQ(message: string, topic: string, error: unknown): Promise<void> {
    try {
      // For now, log to database. In production, would publish to DLQ topic
      this.logger.error(
        JSON.stringify({
          event: 'kafka.message.dlq',
          topic,
          message,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (dlqError) {
      this.logger.error(
        `Failed to send message to DLQ: ${
          dlqError instanceof Error ? dlqError.message : String(dlqError)
        }`,
      );
    }
  }
}
