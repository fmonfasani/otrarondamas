import { LIMITS, RateLimit } from '../common/rate-limit/rate-limit';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ChatFileDto } from './dto/chat-file.dto';
import { sendChatFile } from './send-chat-file';
import { CHAT_FILE_MAX_BYTES } from './chat-files';
import { toMessageWire } from './message-serializer';
import { ApiTags } from '@nestjs/swagger';
import { AllowCustomer } from '../auth/decorators/allow-customer.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CanonicalPermission,
  CUSTOMER_POLICY,
} from '../authorization/canonical-permission.decorator';
import { BusinessContextService } from '../business-context/business-context.service';
import { CustomerMessageDto } from './dto/customer-message.dto';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { MessagingAlertsService } from './messaging-alerts.service';
import { PushSubscriptionDto, PushUnsubscribeDto } from './dto/push-subscription.dto';

/**
 * STORE-V1-04 — chat of the signed-in store customer with the Business (OR-B4-031).
 *
 * The Customer comes from the session and must belong to the Business of the slug (403
 * otherwise). Staff tokens are refused by resolveForCustomer. Answers carry only what a
 * customer may see of each message: no staff ids, sequences or tenancy fields.
 */
@ApiTags('tienda')
@AllowCustomer()
@Controller(':businessSlug/tienda/chat')
export class CustomerChatController {
  private readonly logger = new Logger(CustomerChatController.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
    private readonly businessContext: BusinessContextService,
    private readonly alerts: MessagingAlertsService,
  ) {}

  private async assertStoreCustomer(user: AuthenticatedUser, businessSlug: string) {
    const store = await this.businessContext.resolveForAnonymous(businessSlug);
    const customer = await this.businessContext.resolveForCustomer(user);
    if (customer.businessId !== store.businessId) {
      throw new ForbiddenException('Tu cuenta es de otra tienda');
    }
  }

  /** Paquete 1 F1 — whether push is on, and the key a customer's browser subscribes with. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('avisos')
  async pushSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ) {
    await this.assertStoreCustomer(user, businessSlug);
    return this.alerts.pushSettings();
  }

  /** Paquete 1 F1 — this browser accepted notifications: the store's answers reach it. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @RateLimit(LIMITS.push)
  @Post('avisos')
  @HttpCode(204)
  async subscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: PushSubscriptionDto,
  ): Promise<void> {
    await this.assertStoreCustomer(user, businessSlug);
    const customer = await this.businessContext.resolveForCustomer(user);
    await this.alerts.subscribe(
      { businessId: customer.businessId, userId: null, customerId: customer.customerId },
      dto,
    );
  }

  @CanonicalPermission(CUSTOMER_POLICY)
  @Delete('avisos')
  @HttpCode(204)
  async unsubscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: PushUnsubscribeDto,
  ): Promise<void> {
    await this.assertStoreCustomer(user, businessSlug);
    const customer = await this.businessContext.resolveForCustomer(user);
    await this.alerts.unsubscribe(
      { businessId: customer.businessId, userId: null, customerId: customer.customerId },
      dto.endpoint,
    );
  }

  /** GET /:slug/tienda/chat — the conversation with the store and its messages. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get()
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Query('antes') before?: string,
  ) {
    await this.assertStoreCustomer(user, businessSlug);
    const chat = await this.messagingService.getCustomerChat(user, before);
    // E2: the store's messages reached the customer's screen (✓✓ for the store).
    try {
      const moved = await this.messagingService.markDelivered(user);
      for (const id of moved) this.messagingGateway.publishInboxChanged(id);
    } catch (error) {
      // Best-effort; the chat itself loaded (see below for the store's presence).
      this.logger.warn(
        JSON.stringify({
          event: 'messaging.delivered.failed',
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    // E2b: whether someone of the store's team in this conversation has a screen open.
    // Before the first message there is no conversation and nobody of the team in it.
    if (!chat.conversationId) return chat;
    const audience = await this.messagingService.realtimeAudience(chat.conversationId);
    const tiendaEnLinea = Boolean(
      audience?.userIds.some((userId) =>
        this.messagingGateway.isOnline(audience.businessId, { userId, customerId: null }),
      ),
    );
    return { ...chat, tiendaEnLinea };
  }

  /**
   * E2 — the customer is looking at the chat: they read up to the store's newest message
   * (blue ✓✓ for the store when both sides have read receipts on).
   */
  @CanonicalPermission(CUSTOMER_POLICY)
  @RateLimit(LIMITS.read)
  @Post('leido')
  @HttpCode(204)
  async read(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ): Promise<void> {
    await this.assertStoreCustomer(user, businessSlug);
    const result = await this.messagingService.markCustomerChatRead(user);
    if (!result) return;
    try {
      if (result.read && result.firstRead && result.readAt) {
        this.messagingGateway.publishMessageRead({
          messageId: result.messageId,
          conversationId: result.conversationId,
          readAt: result.readAt,
        });
      } else if (result.positionMoved) {
        this.messagingGateway.publishInboxChanged(result.conversationId);
      }
    } catch {
      // Best-effort; the read is saved.
    }
  }

  /** POST /:slug/tienda/chat/mensajes — write to the store (opens the chat if needed). */
  @CanonicalPermission(CUSTOMER_POLICY)
  @RateLimit(LIMITS.send)
  @Post('mensajes')
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: CustomerMessageDto,
  ) {
    await this.assertStoreCustomer(user, businessSlug);
    const message = await this.messagingService.sendCustomerMessage(
      user,
      dto.clientMessageId,
      dto.content,
    );
    // Realtime is best-effort: the message is committed; HTTP stays the recovery path.
    try {
      this.messagingGateway.publishMessageCreated(message);
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'messaging.realtime.publish_failed',
          conversationId: message.conversationId,
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    return {
      conversationId: message.conversationId,
      message: {
        id: message.id,
        clientMessageId: message.clientMessageId,
        content: message.content,
        createdAt: message.createdAt,
        mine: true,
      },
    };
  }

  /**
   * E1 — the customer is writing: the store's screens show «escribiendo…». Without a
   * conversation yet there is nobody to tell.
   */
  @CanonicalPermission(CUSTOMER_POLICY)
  @RateLimit(LIMITS.typing)
  @Post('escribiendo')
  @HttpCode(204)
  async typing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ): Promise<void> {
    await this.assertStoreCustomer(user, businessSlug);
    const found = await this.messagingService.customerTypingActor(user);
    if (found) await this.messagingGateway.publishTyping(found.conversationId, found.context);
  }

  /** OR-B4-037 — the customer sends a photo or PDF (opens the chat if needed). */
  @CanonicalPermission(CUSTOMER_POLICY)
  @RateLimit(LIMITS.files)
  @Post('adjuntos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: CHAT_FILE_MAX_BYTES } }))
  async sendFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: ChatFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.assertStoreCustomer(user, businessSlug);
    const message = await this.messagingService.sendAttachment(
      user,
      null,
      dto.clientMessageId,
      file,
      dto.caption,
    );
    try {
      this.messagingGateway.publishMessageCreated(message);
    } catch {
      // Realtime is best-effort; HTTP stays the recovery path.
    }
    return {
      conversationId: message.conversationId,
      adjuntos: toMessageWire(message).adjuntos ?? [],
    };
  }

  /** OR-B4-037 — a photo or PDF of the customer's own conversation. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('adjuntos/:attachmentId')
  async file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    await this.assertStoreCustomer(user, businessSlug);
    sendChatFile(res, await this.messagingService.getAttachmentFile(user, attachmentId));
  }
}
