import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
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
  ) {}

  private async assertStoreCustomer(user: AuthenticatedUser, businessSlug: string) {
    const store = await this.businessContext.resolveForAnonymous(businessSlug);
    const customer = await this.businessContext.resolveForCustomer(user);
    if (customer.businessId !== store.businessId) {
      throw new ForbiddenException('Tu cuenta es de otra tienda');
    }
  }

  /** GET /:slug/tienda/chat — the conversation with the store and its messages. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get()
  async chat(@CurrentUser() user: AuthenticatedUser, @Param('businessSlug') businessSlug: string) {
    await this.assertStoreCustomer(user, businessSlug);
    return this.messagingService.getCustomerChat(user);
  }

  /** POST /:slug/tienda/chat/mensajes — write to the store (opens the chat if needed). */
  @CanonicalPermission(CUSTOMER_POLICY)
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
