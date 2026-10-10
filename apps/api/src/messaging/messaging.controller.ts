import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { EditMessageDto } from './dto/message-operations.dto';
import { ReadReceiptPreferenceDto } from './dto/read-receipt.dto';
import { CreateConversationAssociationDto, DeactivateConversationAssociationDto } from './dto/conversation-association.dto';
import { CreateConversationOrderDto } from './dto/create-conversation-order.dto';

// Prisma BigInt values are not JSON-serializable by Nest's default response adapter.
// Keep the public HTTP contract JSON-safe and aligned with the Socket.IO payload.
function serializeMessageSequence<T extends { sequence: bigint | number | string }>(message: T) {
  return { ...message, sequence: String(message.sequence) };
}

@Controller('messaging/conversations')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listConversations(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(user, dto);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.messagingService.getConversation(user, id);
  }

  @Get(':id/associations')
  listAssociations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.messagingService.listConversationAssociations(user, id);
  }

  @Get(':id/associations/history')
  listAssociationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
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
    @Body() dto: CreateConversationOrderDto,
  ) {
    return this.messagingService.createOrderFromConversation(user, id, dto.items);
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
      .createTextMessage(
        user,
        id,
        dto.clientMessageId,
        dto.content,
        dto.replyToMessageId,
      )
      .then((message) => {
        // The service transaction has committed before this event is emitted.
        this.messagingGateway.publishMessageCreated({
          id: message.id,
          conversationId: message.conversationId,
          clientMessageId: message.clientMessageId,
          content: message.content,
          sequence: message.sequence,
          createdAt: message.createdAt,
          authorUserId: message.authorUserId,
          authorCustomerId: message.authorCustomerId,
        });
        return serializeMessageSequence(message);
      });
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
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
    if (result.read && result.readAt) {
      this.messagingGateway.publishMessageRead({
        messageId,
        conversationId: id,
        readAt: result.readAt,
      });
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
  getReadReceiptPreference(
    @CurrentUser() user: AuthenticatedUser,
  ) {
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
    this.messagingGateway.publishMessageUpdated({
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      editedAt: message.editedAt,
    });
    return message;
  }

  @Delete(':id/messages/:messageId')
  async deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const message = await this.messagingService.deleteMessage(user, id, messageId);
    this.messagingGateway.publishMessageDeleted({
      id: message.id,
      conversationId: message.conversationId,
      deletedAt: message.deletedAt,
    });
    return message;
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.messagingService.deleteConversation(user, id);
  }

  @Post(':id/participants')
  addParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.messagingService.addParticipant(
      user,
      id,
      dto.userId,
      dto.customerId,
    );
  }

  @Delete(':id/participants/:participantId')
  removeParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.messagingService.removeParticipant(user, id, participantId);
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
