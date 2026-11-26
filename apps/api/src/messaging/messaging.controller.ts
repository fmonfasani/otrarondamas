import { LIMITS, RateLimit } from '../common/rate-limit/rate-limit';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Patch,
  Put,
  Logger,
  Optional,
  Res,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { EditMessageDto, ForwardMessageDto, ReactionDto } from './dto/message-operations.dto';
import { ReadReceiptPreferenceDto } from './dto/read-receipt.dto';
import {
  CreateConversationAssociationDto,
  DeactivateConversationAssociationDto,
} from './dto/conversation-association.dto';
import { CreateConversationOrderDto } from './dto/create-conversation-order.dto';
import { ConversationCartItemDto, ShareProductDto } from './dto/chat-commerce.dto';
import { ChatFileDto } from './dto/chat-file.dto';
import { sendChatFile } from './send-chat-file';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CHAT_UPLOAD_MAX_BYTES } from './chat-files';

import { QuickRepliesDto } from './dto/quick-replies.dto';
import { PushSubscriptionDto, PushUnsubscribeDto } from './dto/push-subscription.dto';
import { MessagingAlertsService } from './messaging-alerts.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { toMessageWire } from './message-serializer';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { MessagingInboxService } from './inbox.service';

// The public message representation lives in `message-serializer.ts` so HTTP
// and Socket.IO emit the same shape from one definition. Serializing here with
// a local spread used to leak every Prisma column (including tenancy ids) and
// made it possible for a path to forget the BigInt conversion, which is what
// turned a committed message into an HTTP error.
const serializeMessageSequence = toMessageWire;

@Controller('messaging/conversations')
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
    private readonly alerts: MessagingAlertsService,
    private readonly businessContext: BusinessContextService,
    // E6a: pinned, archived, muted, who is in charge, the customer's labels.
    @Optional() private readonly inbox?: MessagingInboxService,
  ) {}

  // Realtime is best-effort: the mutation is already committed when an event
  // is published, so a notification failure must never turn it into an HTTP
  // error. HTTP stays the recovery path. Only metadata is logged, never content.
  private publishSafely(eventName: string, conversationId: string, publish: () => void): void {
    try {
      publish();
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'messaging.realtime.publish_failed',
          eventName,
          conversationId,
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * E2 — the screen loaded: messages from others reached it (✓✓). Tells their senders.
   * Best-effort, like every realtime step: never turns a read into an error.
   */
  private async deliveredTo(user: AuthenticatedUser, conversationId?: string): Promise<void> {
    try {
      const moved = await this.messagingService.markDelivered(user, conversationId);
      for (const id of moved) this.messagingGateway.publishInboxChanged(id);
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'messaging.delivered.failed',
          conversationId,
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /** E2b — «en línea» for each participant, from the open realtime connections. */
  private withPresence<
    T extends {
      businessId: string;
      participants: Array<{ userId: string | null; customerId: string | null }>;
    },
  >(row: T): T {
    return {
      ...row,
      participants: row.participants.map((p) => ({
        ...p,
        online: this.messagingGateway.isOnline(row.businessId, p),
      })),
    };
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const conversations = await this.messagingService.listConversations(user);
    await this.deliveredTo(user);
    const rows = conversations.map((row) => this.withPresence(row));
    return this.inbox ? this.inbox.decorate(user, rows) : rows;
  }

  /** E3 — whether push is on, and the public key a browser subscribes with. */
  @CanonicalPermission('MESSAGING_USE')
  @Get('push')
  pushSettings() {
    return this.alerts.pushSettings();
  }

  /** E3 — this browser accepted notifications: new messages reach it with Wapsell closed. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.push)
  @Post('push/subscriptions')
  @HttpCode(204)
  async subscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscriptionDto,
  ): Promise<void> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    await this.alerts.subscribe(context, dto);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Delete('push/subscriptions')
  @HttpCode(204)
  async unsubscribePush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushUnsubscribeDto,
  ): Promise<void> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    await this.alerts.unsubscribe(context, dto.endpoint);
  }

  /** E2 — unread messages for the panel menu, the tab title and the notification. */
  @CanonicalPermission('MESSAGING_USE')
  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.unreadSummary(user);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.conversations)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.messagingService.createConversation(user, dto);
  }

  /** OR-B4-037 — a photo or PDF of a conversation, for whoever may read it. */
  @CanonicalPermission('MESSAGING_USE')
  @Get('attachments/:attachmentId')
  async attachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    sendChatFile(res, await this.messagingService.getAttachmentFile(user, attachmentId));
  }

  /** OR-B4-037 — the Business's quick replies (everyone reads; Owner/Admin replace). */
  @CanonicalPermission('MESSAGING_USE')
  @Get('quick-replies')
  quickReplies(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getQuickReplies(user);
  }

  @CanonicalPermission('MESSAGING_MANAGE')
  @Put('quick-replies')
  setQuickReplies(@CurrentUser() user: AuthenticatedUser, @Body() dto: QuickRepliesDto) {
    return this.messagingService.setQuickReplies(user, dto.items);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get('contacts')
  contacts(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listContacts(user);
  }

  /** E4 — the team member's ⭐ messages. */
  @CanonicalPermission('MESSAGING_USE')
  @Get('starred')
  starred(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listStarred(user);
  }

  /** E4 — finds messages by their text in the chats the team member reads. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.search)
  @Get('search')
  search(@CurrentUser() user: AuthenticatedUser, @Query('q') query?: string) {
    return this.messagingService.searchMessages(user, query ?? '');
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const row = this.withPresence(await this.messagingService.getConversation(user, id));
    return this.inbox ? (await this.inbox.decorate(user, [row]))[0] : row;
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get(':id/associations')
  listAssociations(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.listConversationAssociations(user, id);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get(':id/associations/history')
  listAssociationHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.listConversationAssociationHistory(user, id);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Post(':id/associations')
  createAssociation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateConversationAssociationDto,
  ) {
    return this.messagingService.createConversationAssociation(
      user,
      id,
      dto.entityType,
      dto.entityId,
      dto.reason,
    );
  }

  /** What "Crear pedido" would order: the associated customer's cart. */
  @CanonicalPermission('MESSAGING_USE')
  @Get(':id/cart')
  getCart(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.getConversationCart(user, id);
  }

  /** OR-B4-037 — the team loads a product into the customer's cart (0 removes it). */
  @CanonicalPermission(['MESSAGING_USE', 'SALES_CREATE'])
  @Put(':id/cart/items')
  setCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConversationCartItemDto,
  ) {
    return this.messagingService.setCustomerCartItem(user, id, dto.productoId, dto.cantidad);
  }

  /**
   * OR-B4-037 — send a photo (JPG, PNG, WebP) or a PDF, up to 10 MB, field `archivo`; E5 adds
   * videos up to 64 MB and voice notes (`voz=1`, `duracion` in seconds).
   */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.files)
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: CHAT_UPLOAD_MAX_BYTES } }))
  async sendAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChatFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const message = await this.messagingService.sendAttachment(
      user,
      id,
      dto.clientMessageId,
      file,
      dto.caption,
      { voice: dto.voz === '1', durationSec: dto.duracion ? Number(dto.duracion) : undefined },
    );
    this.publishSafely('conversation.message.created', message.conversationId, () =>
      this.messagingGateway.publishMessageCreated(message),
    );
    return serializeMessageSequence(message);
  }

  /** OR-B4-037 — share a catalogue product as a card in the conversation. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.products)
  @Post(':id/products')
  shareProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ShareProductDto,
  ) {
    return this.messagingService
      .sendProductCard(user, id, dto.clientMessageId, dto.productoId)
      .then((message) => {
        this.publishSafely('conversation.message.created', message.conversationId, () =>
          this.messagingGateway.publishMessageCreated(message),
        );
        return serializeMessageSequence(message);
      });
  }

  @CanonicalPermission(['MESSAGING_USE', 'ORDERS_MANAGE'])
  @Post(':id/orders')
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() _dto: CreateConversationOrderDto,
  ) {
    // C3: Order items come from the persistent cart, not the request body.
    // _dto is empty; the conversation must have exactly one associated customer with a non-empty cart.
    return this.messagingService.createOrderFromConversation(user, id);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Delete(':id/associations/:associationId')
  deactivateAssociation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('associationId') associationId: string,
    @Body() dto: DeactivateConversationAssociationDto,
  ) {
    return this.messagingService.deactivateConversationAssociation(
      user,
      id,
      associationId,
      dto.reason,
    );
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.send)
  @Post(':id/messages')
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagingService
      .createTextMessage(user, id, dto.clientMessageId, dto.content, dto.replyToMessageId)
      .then((message) => {
        this.logger.log(
          JSON.stringify({
            event: 'messaging.message.persisted',
            conversationId: message.conversationId,
            messageId: message.id,
            clientMessageId: message.clientMessageId,
          }),
        );
        // The service transaction has committed before this event is emitted.
        this.publishSafely('conversation.message.created', message.conversationId, () =>
          // P3/D-01: hand the persisted entity to the gateway, which runs it
          // through the same `toMessageWire` used for the HTTP body. Picking
          // fields here is what let the socket payload drift from HTTP.
          this.messagingGateway.publishMessageCreated(message),
        );
        this.previewLink(user, message.id);
        return serializeMessageSequence(message);
      });
  }

  /** E5 — after answering: the link's preview, then the open screens reload the message. */
  private previewLink(user: AuthenticatedUser, messageId: string) {
    void this.messagingService.addLinkPreview(user, messageId).then((message) => {
      if (!message) return;
      this.publishSafely('conversation.message.changed', message.conversationId, () =>
        this.messagingGateway.publishMessageChanged(message),
      );
    });
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('antes') before?: string,
    @Query('limite') limit?: string,
  ) {
    // Paquete 1 F2: the newest page; `antes` (a sequence) asks for older ones.
    const messages = await this.messagingService.getMessages(user, id, {
      before,
      limit: limit ? Number(limit) : undefined,
    });
    await this.deliveredTo(user, id);
    return messages.map(serializeMessageSequence);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.read)
  @Post(':id/messages/:messageId/read')
  async markMessageRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const result = await this.messagingService.markMessageRead(user, id, messageId);
    const readAt = result.read && result.firstRead ? result.readAt : null;
    if (readAt) {
      this.publishSafely('conversation.message.read', id, () =>
        this.messagingGateway.publishMessageRead({
          messageId,
          conversationId: id,
          readAt,
        }),
      );
    } else if (result.positionMoved) {
      // E2: no receipt (turned off, or already there) but the unread count changed.
      this.publishSafely('inbox.changed', id, () => this.messagingGateway.publishInboxChanged(id));
    }
    const { positionMoved: _internal, ...answer } = result;
    return answer;
  }

  /** E1 — «escribiendo…»: tells the others in the conversation. Sent every few seconds. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.typing)
  @Post(':id/typing')
  @HttpCode(204)
  async typing(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    const writer = await this.messagingService.typingActor(user, id);
    await this.messagingGateway.publishTyping(id, writer);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get(':id/messages/:messageId/read-receipts')
  getMessageReadReceipts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.getMessageReadReceipts(user, id, messageId);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get('read-receipts/preferences')
  getReadReceiptPreference(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getReadReceiptPreference(user);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Patch('read-receipts/preferences')
  setReadReceiptPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReadReceiptPreferenceDto,
  ) {
    return this.messagingService.setReadReceiptPreference(user, dto.enabled);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.send)
  @Patch(':id/messages/:messageId')
  async editMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    const message = await this.messagingService.editMessage(user, id, messageId, dto.content);
    this.publishSafely('conversation.message.updated', message.conversationId, () =>
      this.messagingGateway.publishMessageUpdated({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        editedAt: message.editedAt,
      }),
    );
    this.previewLink(user, message.id);
    return serializeMessageSequence(message);
  }

  /** E4 — reacts to a message (another emoji replaces the previous one). */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put(':id/messages/:messageId/reaction')
  async react(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReactionDto,
  ) {
    const changed = await this.messagingService.reactToMessage(user, id, messageId, dto.emoji);
    this.publishSafely('conversation.message.reaction', id, () =>
      this.messagingGateway.publishMessageReaction(changed),
    );
    return changed;
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete(':id/messages/:messageId/reaction')
  async unreact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const changed = await this.messagingService.reactToMessage(user, id, messageId, null);
    this.publishSafely('conversation.message.reaction', id, () =>
      this.messagingGateway.publishMessageReaction(changed),
    );
    return changed;
  }

  /** E4 — ⭐ (personal: nobody else is told). */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put(':id/messages/:messageId/star')
  star(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.setStar(user, id, messageId, true);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete(':id/messages/:messageId/star')
  unstar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.setStar(user, id, messageId, false);
  }

  /** E4 — «Reenviar» to up to five chats the team member takes part in. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.send)
  @Post(':id/messages/:messageId/forward')
  async forward(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: ForwardMessageDto,
  ) {
    const sent = await this.messagingService.forwardMessage(
      user,
      id,
      messageId,
      dto.clientMessageId,
      dto.conversationIds,
    );
    for (const message of sent) {
      this.publishSafely('conversation.message.created', message.conversationId, () =>
        this.messagingGateway.publishMessageCreated(message),
      );
    }
    return sent.map(serializeMessageSequence);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Delete(':id/messages/:messageId')
  async deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const message = await this.messagingService.deleteMessage(user, id, messageId);
    this.publishSafely('conversation.message.deleted', message.conversationId, () =>
      this.messagingGateway.publishMessageDeleted({
        id: message.id,
        conversationId: message.conversationId,
        deletedAt: message.deletedAt,
      }),
    );
    return serializeMessageSequence(message);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.deleteConversation(user, id);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Post(':id/participants')
  addParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.messagingService.addParticipant(user, id, dto.userId, dto.customerId);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Delete(':id/participants/:participantId')
  removeParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.messagingService.removeParticipant(user, id, participantId).then((participant) => {
      this.publishSafely('conversation.participant.removed', id, () =>
        this.messagingGateway.publishParticipantRemoved({
          conversationId: id,
          participantId: participant.id,
          userId: participant.userId,
          customerId: participant.customerId,
          removedAt: participant.removedAt,
          leftAt: participant.leftAt,
        }),
      );
      return participant;
    });
  }

  @CanonicalPermission('MESSAGING_USE')
  @Post(':id/admin/:participantId')
  transferAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.messagingService.transferAdmin(user, id, participantId);
  }
}
