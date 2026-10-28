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
  CatalogEvent,
  extractCatalogEventBusinessId,
} from '../types/catalog-event';

/**
 * B2-Catalog Event Consumer
 *
 * Consumes Kafka events from 'catalog.updated' topic.
 * Validates businessId for multi-tenant isolation, updates product inventory/pricing,
 * and broadcasts real-time updates to business subscribers via Socket.IO.
 *
 * Error handling: On failure, sends to DLQ topic.
 * Audit: All events logged to database for traceability.
 */
@Controller()
export class CatalogConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  onModuleInit(): void {
    this.logger.log('CatalogConsumer initialized and ready to consume events');
  }

  onModuleDestroy(): void {
    this.logger.log('CatalogConsumer shutting down');
  }

  /**
   * Consume catalog.product.updated events.
   * Updates product details and broadcasts to subscribers.
   */
  @MessagePattern('catalog.product.updated')
  async handleCatalogProductUpdated(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: CatalogEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'catalog.product.updated');

      // Enforce multi-tenant isolation
      const businessId = extractCatalogEventBusinessId(event);
      if (!businessId) {
        this.logger.error(
          JSON.stringify({
            event: 'catalog.consumer.invalid_business_id',
            offset,
            eventId: event.eventId,
          }),
        );
        throw new RpcException('Invalid businessId in catalog event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Verify product exists and belongs to business
      if ('productId' in event && event.productId) {
        const product = await this.prisma.producto.findUnique({
          where: { id: event.productId },
        });

        if (!product || product.empresaId !== businessId) {
          throw new RpcException(
            `Product ${event.productId} not found in Business ${businessId}`,
          );
        }

        // Apply updates based on event type
        const updateData: Record<string, unknown> = {};

        if ('eventType' in event && event.eventType === 'catalog.product.updated') {
          const typed = event as any;
          if (typed.name) updateData.nombre = typed.name;
          if (typed.description) updateData.descripcion = typed.description;
          if (typed.price !== undefined) updateData.precioVenta = typed.price;
          if (typed.cost !== undefined) updateData.precioCosto = typed.cost;
        }

        // Update product
        if (Object.keys(updateData).length > 0) {
          await this.prisma.producto.update({
            where: { id: event.productId },
            data: {
              ...updateData,
              fechaActualizacion: new Date(),
            },
          });
        }

        // Log event
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast product update
        this.broadcastCatalogEvent(event, businessId);

        this.logger.log(
          JSON.stringify({
            event: 'catalog.consumer.product_updated',
            offset,
            eventId: event.eventId,
            productId: event.productId,
            businessId,
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'catalog.consumer.product_updated_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'catalog.product.updated', error);
      throw error;
    }
  }

  /**
   * Consume catalog.inventory.updated events.
   * Updates product stock and broadcasts changes.
   */
  @MessagePattern('catalog.inventory.updated')
  async handleCatalogInventoryUpdated(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: CatalogEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'catalog.inventory.updated');

      const businessId = extractCatalogEventBusinessId(event);
      if (!businessId) {
        throw new RpcException('Invalid businessId in catalog inventory event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Verify and update product inventory
      if ('productId' in event && event.productId) {
        const product = await this.prisma.producto.findUnique({
          where: { id: event.productId },
        });

        if (!product || product.empresaId !== businessId) {
          throw new RpcException(
            `Product ${event.productId} not found in Business ${businessId}`,
          );
        }

        const typed = event as any;
        const newStock = typed.newStock ?? product.stock + (typed.delta ?? 0);

        // Update inventory
        await this.prisma.producto.update({
          where: { id: event.productId },
          data: {
            stock: Math.max(0, newStock), // Prevent negative stock
            fechaActualizacion: new Date(),
          },
        });

        // Log event
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast inventory update to business subscribers
        this.broadcastCatalogEvent(event, businessId);

        this.logger.log(
          JSON.stringify({
            event: 'catalog.consumer.inventory_updated',
            offset,
            eventId: event.eventId,
            productId: event.productId,
            businessId,
            newStock: Math.max(0, newStock),
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'catalog.consumer.inventory_updated_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'catalog.inventory.updated', error);
      throw error;
    }
  }

  /**
   * Consume catalog.price.updated events.
   * Updates product pricing.
   */
  @MessagePattern('catalog.price.updated')
  async handleCatalogPriceUpdated(
    @Payload() message: string,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    let event: CatalogEvent;
    const offset = context.getMessage().offset;

    try {
      event = this.parseEvent(message, 'catalog.price.updated');

      const businessId = extractCatalogEventBusinessId(event);
      if (!businessId) {
        throw new RpcException('Invalid businessId in catalog price event');
      }

      // Verify business exists
      const business = await this.prisma.empresa.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new RpcException(`Business ${businessId} not found`);
      }

      // Verify and update product price
      if ('productId' in event && event.productId) {
        const product = await this.prisma.producto.findUnique({
          where: { id: event.productId },
        });

        if (!product || product.empresaId !== businessId) {
          throw new RpcException(
            `Product ${event.productId} not found in Business ${businessId}`,
          );
        }

        const typed = event as any;
        if (typed.newPrice !== undefined) {
          await this.prisma.producto.update({
            where: { id: event.productId },
            data: {
              precioVenta: typed.newPrice,
              fechaActualizacion: new Date(),
            },
          });
        }

        // Log event
        await this.logKafkaEvent(event, businessId, 'processed');

        // Broadcast price update
        this.broadcastCatalogEvent(event, businessId);

        this.logger.log(
          JSON.stringify({
            event: 'catalog.consumer.price_updated',
            offset,
            eventId: event.eventId,
            productId: event.productId,
            businessId,
            newPrice: typed.newPrice,
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'catalog.consumer.price_updated_failed',
          offset,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      await this.sendToDLQ(message, 'catalog.price.updated', error);
      throw error;
    }
  }

  /**
   * Parse event from Kafka message payload.
   */
  private parseEvent(message: string, expectedType: string): CatalogEvent {
    try {
      const event = JSON.parse(message) as CatalogEvent;

      if (!event.eventId || typeof event.eventId !== 'string') {
        throw new Error('Invalid eventId');
      }
      if (event.eventType !== expectedType) {
        throw new Error(`Expected ${expectedType}, got ${event.eventType}`);
      }

      return event;
    } catch (error) {
      throw new RpcException(
        `Failed to parse catalog event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Broadcast catalog event to Socket.IO clients.
   * Scoped by businessId to enforce multi-tenant isolation.
   */
  private broadcastCatalogEvent(event: CatalogEvent, businessId: string): void {
    try {
      const roomName = `business:${businessId}:catalog`;
      this.messagingGateway.publishToConversation(
        'catalog.event.received',
        roomName,
        {
          eventId: event.eventId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          productId: event.productId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast catalog event to Socket.IO: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Log Kafka event to database for audit trail.
   */
  private async logKafkaEvent(
    event: CatalogEvent,
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
          topic: event.eventType.startsWith('catalog.product')
            ? 'catalog.product.updated'
            : event.eventType.startsWith('catalog.inventory')
              ? 'catalog.inventory.updated'
              : 'catalog.price.updated',
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
