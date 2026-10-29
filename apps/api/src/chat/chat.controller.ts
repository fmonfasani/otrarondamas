import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  ChatMessageResponse,
  ChatHistoryResponse,
  SessionDeleteResponse,
} from './dto/chat-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * Send a message and get a response from the AI assistant
   * POST /chat/message
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the chat assistant',
    description:
      'Process a user message, generate an AI response, detect buyer persona, and store in conversation',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: ChatMessageResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty message, exceeds max length)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - LLM failure or database error',
  })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessageResponse> {
    this.logger.debug(
      `Message received from user ${user.id}: "${dto.message.substring(0, 50)}..."`,
    );

    const result = await this.chatService.processMessage(
      dto.message,
      user.id,
      user.businessId,
      dto.session_id,
      dto.user_context,
    );

    return {
      id: `msg_${Date.now()}`, // Placeholder
      session_id: result.session_id,
      response: result.response,
      user_message: dto.message,
      persona: result.persona,
      metadata: {
        model: result.metadata.model,
        response_time_ms: result.metadata.response_time_ms,
      },
      created_at: new Date(),
    };
  }

  /**
   * Get chat history for a session
   * GET /chat/history?session_id=uuid&limit=50
   */
  @Get('history')
  @ApiOperation({
    summary: 'Retrieve chat history for a session',
    description:
      'Fetch all messages in a conversation (ordered by created_at DESC, limit 50 by default)',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: ChatHistoryResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    // Query param handling: session_id from query string
  ): Promise<ChatHistoryResponse> {
    // Extract session_id from query - simplified for now
    // In a real implementation, use @Query('session_id') sessionId: string
    // For MVP, we'll require it in the URL path
    throw new Error(
      'Use GET /chat/session/:sessionId/history instead for a cleaner API',
    );
  }

  /**
   * Get chat history for a specific session (alternative endpoint)
   * GET /chat/session/:sessionId/history
   */
  @Get('session/:sessionId/history')
  @ApiOperation({
    summary: 'Retrieve chat history for a session',
    description:
      'Fetch all messages in a conversation (ordered by created_at ASC, limit 50 by default)',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: ChatHistoryResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to this session',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSessionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ChatHistoryResponse> {
    this.logger.debug(`Fetching history for session ${sessionId}`);

    const result = await this.chatService.getHistory(sessionId, user.id, 50);

    return {
      messages: result.messages.map((m) => ({
        id: m.id,
        message: m.message,
        response: m.response,
        persona: m.persona,
        created_at: m.created_at,
      })),
      session_id: result.session_id,
      total_count: result.total_count,
    };
  }

  /**
   * Get session metadata
   * GET /chat/session/:sessionId
   */
  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get session metadata',
    description: 'Retrieve metadata for a chat session',
  })
  @ApiResponse({
    status: 200,
    description: 'Session metadata retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to this session',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getSession(sessionId, user.id);
  }

  /**
   * Delete a chat session
   * DELETE /chat/session/:sessionId
   */
  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a chat session',
    description: 'Delete a chat session and all its messages (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
    type: SessionDeleteResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not own this session',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async deleteSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionDeleteResponse> {
    this.logger.debug(`Deleting session ${sessionId} for user ${user.id}`);

    const result = await this.chatService.deleteSession(sessionId, user.id);

    return {
      message: result.message,
      session_id: result.session_id,
      deleted_at: result.deleted_at,
    };
  }
}
