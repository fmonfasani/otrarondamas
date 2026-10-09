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
  markMessageRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markMessageRead(user, id, messageId);
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
  editMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messagingService.editMessage(user, id, messageId, dto.content);
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.deleteMessage(user, id, messageId);
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
