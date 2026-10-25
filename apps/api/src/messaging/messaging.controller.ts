import { Body, Controller, Delete, Get, Param, Post, Patch, Logger } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { EditMessageDto } from './dto/message-operations.dto';
import { ReadReceiptPreferenceDto } from './dto/read-receipt.dto';
import {
  CreateConversationAssociationDto,
  DeactivateConversationAssociationDto,
} from './dto/conversation-association.dto';
import { CreateConversationOrderDto } from './dto/create-conversation-order.dto';
import { toMessageWire } from './message-serializer';

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

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listConversations(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.messagingService.createConversation(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.getConversation(user, id);
  }

  @Get(':id/associations')
  listAssociations(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.listConversationAssociations(user, id);
  }

  @Get(':id/associations/history')
  listAssociationHistory(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.listConversationAssociationHistory(user, id);
  }

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
        return serializeMessageSequence(message);
      });
  }

  @Get(':id/messages')
  getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService
      .getMessages(user, id)
      .then((messages) => messages.map(serializeMessageSequence));
  }

  @Post(':id/messages/:messageId/read')
  async markMessageRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const result = await this.messagingService.markMessageRead(user, id, messageId);
    const readAt = result.read ? result.readAt : null;
    if (readAt) {
      this.publishSafely('conversation.message.read', id, () =>
        this.messagingGateway.publishMessageRead({
          messageId,
          conversationId: id,
          readAt,
        }),
      );
    }
    return result;
  }

  @Get(':id/messages/:messageId/read-receipts')
  getMessageReadReceipts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.getMessageReadReceipts(user, id, messageId);
  }

  @Get('read-receipts/preferences')
  getReadReceiptPreference(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getReadReceiptPreference(user);
  }

  @Patch('read-receipts/preferences')
  setReadReceiptPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReadReceiptPreferenceDto,
  ) {
    return this.messagingService.setReadReceiptPreference(user, dto.enabled);
  }

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
    return serializeMessageSequence(message);
  }

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

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagingService.deleteConversation(user, id);
  }

  @Post(':id/participants')
  addParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.messagingService.addParticipant(user, id, dto.userId, dto.customerId);
  }

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

  @Post(':id/admin/:participantId')
  transferAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.messagingService.transferAdmin(user, id, participantId);
  }
}
