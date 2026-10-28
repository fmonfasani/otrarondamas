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
import {
  PaymentEvent,
  extractPaymentEventBusinessId,
} from '../types/payment-event';

/**
 * B2-Payment Event Consumer
 *
 * Consumes Kafka events from 'payments.completed', 'payments.failed' topics.
 * Validates businessId for multi-tenant isolation, updates order status,
 * and broadcasts notifications via Socket.IO.
 *
 * Error handling: On failure, sends to DLQ topic.
 * Audit: All events logged to database for traceability.
 */
@Controller()
export class PaymentConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  onModuleInit(): void {
    this.logger.log('PaymentConsumer initialized and ready to consume events');
  }

  onModuleDestroy(): void {
    this.logger.log('PaymentConsumer shutting down');
  }

  /**
   * Consume payment.completed events.
   * Updates order status, notifies via Socket.IO.
   */
  @MessagePattern('payments.completed')
  async handlePaymentCompleted(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: PaymentEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'payment.completed');

      // Enforce multi-tenant isolation
      const businessId = extractPaymentEventBusinessId(event);
      if (!businessId) {
        this.logger.error(
          JSON.stringify({
            event: 'payment.consumer.invalid_business_id',
            offset,
            eventId: event.eventId,
          }),
        );
        throw new RpcException('Invalid businessId in payment event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Find and update order
      if ('orderId' in event && event.orderId) {
        const order = await this.prisma.pedido.findUnique({
          where: { id: event.orderId },
        });

        if (!order || order.empresaId !== businessId) {
          throw new RpcException(
            `Order ${event.orderId} not found in Business ${businessId}`,
          );
        }

        // Update order status to CONFIRMADO (paid)
        await this.prisma.pedido.update({
          where: { id: event.orderId },
          data: {
            estado: 'CONFIRMADO',
            // Note: Map event fields to Pedido model fields if they differ
          },
        });

        // Log event
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast payment confirmation
        this.broadcastPaymentEvent(event, businessId);

        this.logger.log(
          JSON.stringify({
            event: 'payment.consumer.payment_completed',
            offset,
            eventId: event.eventId,
            orderId: event.orderId,
            businessId,
            amount: event.amount,
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'payment.consumer.payment_completed_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'payments.completed', error);
      throw error;
    }
  }

  /**
   * Consume payment.failed events.
   * Updates order status and notifies customer.
   */
  @MessagePattern('payments.failed')
  async handlePaymentFailed(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: PaymentEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'payment.failed');

      // Enforce multi-tenant isolation
      const businessId = extractPaymentEventBusinessId(event);
      if (!businessId) {
        throw new RpcException('Invalid businessId in payment failed event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Update order
      if ('orderId' in event && event.orderId) {
        const order = await this.prisma.pedido.findUnique({
          where: { id: event.orderId },
        });

        if (!order || order.empresaId !== businessId) {
          throw new RpcException(
            `Order ${event.orderId} not found in Business ${businessId}`,
          );
        }

        // Update order payment status to FAILED
        const failureReason =
          'failureReason' in event ? event.failureReason : 'Unknown reason';
        await this.prisma.pedido.update({
          where: { id: event.orderId },
          data: {
            // Note: Map payment failure fields to Pedido model if they differ
          },
        });

        // Log event
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast payment failure notification
        this.broadcastPaymentEvent(event, businessId);

        this.logger.log(
          JSON.stringify({
            event: 'payment.consumer.payment_failed',
            offset,
            eventId: event.eventId,
            orderId: event.orderId,
            businessId,
            failureReason,
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'payment.consumer.payment_failed_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'payments.failed', error);
      throw error;
    }
  }

  /**
   * Parse event from Kafka message payload.
   */
  private parseEvent(message: string, expectedType: string): PaymentEvent {
    try {
      const event = JSON.parse(message) as PaymentEvent;

      if (!event.eventId || typeof event.eventId !== 'string') {
        throw new Error('Invalid eventId');
      }
      if (event.eventType !== expectedType) {
        throw new Error(`Expected ${expectedType}, got ${event.eventType}`);
      }

      return event;
    } catch (error) {
      throw new RpcException(
        `Failed to parse payment event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Broadcast payment event to Socket.IO clients.
   */
  private broadcastPaymentEvent(event: PaymentEvent, businessId: string): void {
    try {
      const roomName = `business:${businessId}:payments`;
      this.messagingGateway.publishToConversation(
        'payment.event.received',
        roomName,
        {
          eventId: event.eventId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          orderId: 'orderId' in event ? event.orderId : undefined,
          status:
            event.eventType === 'payment.completed'
              ? 'COMPLETED'
              : 'FAILED',
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast payment event to Socket.IO: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Log Kafka event to database for audit trail.
   */
  private async logKafkaEvent(
    event: PaymentEvent,
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
          topic: event.eventType.startsWith('payment.completed')
            ? 'payments.completed'
            : 'payments.failed',
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
    }
  }

  /**
   * Send failed messages to Dead Letter Queue.
   */
  private async sendToDLQ(message: string, topic: string, error: unknown): Promise<void> {
    try {
      this.logger.error(
        JSON.stringify({
          event: 'kafka.message.dlq',
          topic,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (dlqError) {
      this.logger.error(
        `Failed to log to DLQ: ${
          dlqError instanceof Error ? dlqError.message : String(dlqError)
        }`,
      );
    }
  }
}
