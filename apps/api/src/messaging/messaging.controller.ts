import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('messaging/conversations')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

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
