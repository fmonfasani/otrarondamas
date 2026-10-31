import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonaDetector, PersonaDetectionResult } from './persona-detector';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '@prisma/client'; // TODO: types

export interface LLMResponse {
  text: string;
  tokens?: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // Mock LLM for MVP - in production, replace with OpenAI/Claude SDK
  private readonly mockLLMModel = 'gpt-3.5-turbo';
  private readonly mockSystemPrompt = `You are a helpful assistant for Wapsell, a real estate and property
    management platform. You help buyers understand properties, answer questions about the buying process,
    and guide users through the property search journey. Be concise (max 500 chars), friendly, and professional.`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly personaDetector: PersonaDetector,
  ) {}

  /**
   * Process an incoming message: call LLM, detect persona, store in DB
   */
  async processMessage(
    message: string,
    userId: string,
    businessId: string,
    sessionId?: string,
    userContext?: Record<string, unknown>,
  ): Promise<{
    response: string;
    session_id: string;
    persona: PersonaDetectionResult;
    metadata: { model: string; response_time_ms: number };
  }> {
    // Validate input
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (message.length > 2000) {
      throw new BadRequestException('Message exceeds maximum length of 2000 characters');
    }

    const startTime = Date.now();

    // Get or create conversation (session)
    let conversation: Conversation;
    if (sessionId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: sessionId },
      });

      if (!conversation) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Verify user has access to this conversation
      const participation = await this.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: sessionId,
          userId,
        },
      });

      if (!participation) {
        throw new ForbiddenException('User does not have access to this session');
      }
    } else {
      // Create new conversation (session)
      conversation = await this.prisma.conversation.create({
        data: {
          businessId,
          type: 'BUYER_SUPPORT',
        },
      });

      // Add user as participant
      await this.prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          businessId,
          userId,
          isAdmin: false,
        },
      });
    }

    // Get conversation history for persona detection
    const history = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true },
    });

    // Detect persona from message and history
    const persona = this.personaDetector.detectPersona(
      message,
      history.map((m) => ({ message: m.content || '', response: '' })),
    );

    // Get LLM response (mock for MVP)
    let llmResponse: LLMResponse;
    try {
      llmResponse = await this.getLLMResponse(message, userContext, history);
    } catch (error) {
      this.logger.error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to generate response');
    }

    // Store message and response in database
    const dbMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        businessId,
        authorUserId: userId,
        type: 'USER',
        content: message,
        clientMessageId: `client_${uuidv4()}`,
        sequence: BigInt(0), // Calculated by trigger in DB
      },
    });

    // Store AI response as a system message
    const dbResponse = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        businessId,
        type: 'SYSTEM',
        content: llmResponse.text,
        clientMessageId: `system_${uuidv4()}`,
        sequence: BigInt(1), // Calculated by trigger in DB
      },
    });

    // Store persona info in metadata (could use separate table if needed)
    await this.prisma.message.update({
      where: { id: dbMessage.id },
      data: {
        // Metadata would go here if schema supported it
      },
    });

    const responseTime = Date.now() - startTime;

    return {
      response: llmResponse.text,
      session_id: conversation.id,
      persona,
      metadata: {
        model: this.mockLLMModel,
        response_time_ms: responseTime,
      },
    };
  }

  /**
   * Get chat history for a session
   */
  async getHistory(
    sessionId: string,
    userId: string,
    limit: number = 50,
  ): Promise<{
    messages: Array<{
      id: string;
      message: string;
      response: string;
      persona: PersonaDetectionResult;
      created_at: Date;
    }>;
    session_id: string;
    total_count: number;
  }> {
    // Verify session exists
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!conversation) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Verify user access
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: sessionId,
        userId,
      },
    });

    if (!participation) {
      throw new ForbiddenException('User does not have access to this session');
    }

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: sessionId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    // Pair user messages with their responses
    const messageHistory: Array<{
      id: string;
      message: string;
      response: string;
      persona: PersonaDetectionResult;
      created_at: Date;
    }> = [];

    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const systemMsg = messages[i + 1];

      if (userMsg && userMsg.type === 'USER') {
        const persona = this.personaDetector.detectPersona(userMsg.content || '');
        messageHistory.push({
          id: userMsg.id,
          message: userMsg.content || '',
          response: systemMsg?.content || '',
          persona,
          created_at: userMsg.createdAt,
        });
      }
    }

    return {
      messages: messageHistory,
      session_id: sessionId,
      total_count: await this.prisma.message.count({
        where: {
          conversationId: sessionId,
          deletedAt: null,
        },
      }),
    };
  }

  /**
   * Delete a chat session and all its messages
   */
  async deleteSession(sessionId: string, userId: string): Promise<{
    message: string;
    session_id: string;
    deleted_at: Date;
  }> {
    // Verify session exists
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!conversation) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Verify user owns the session (is a participant)
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: sessionId,
        userId,
      },
    });

    if (!participation) {
      throw new ForbiddenException('User does not have permission to delete this session');
    }

    // Soft-delete all messages in the conversation
    const now = new Date();
    await this.prisma.message.updateMany(
      {
        where: {
          conversationId: sessionId,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
        },
      },
    );

    // Soft-delete the conversation itself
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: sessionId },
      data: {
        deletedAt: now,
      },
    });

    return {
      message: 'Session deleted successfully',
      session_id: sessionId,
      deleted_at: updatedConversation.deletedAt || now,
    };
  }

  /**
   * Mock LLM response - replace with real LLM SDK (OpenAI/Claude)
   */
  private async getLLMResponse(
    userMessage: string,
    userContext?: Record<string, unknown>,
    history?: Array<{ content: string | null }>,
  ): Promise<LLMResponse> {
    // Mock response for MVP
    // In production, call OpenAI API or Claude SDK here
    const mockResponses: Record<string, string> = {
      hi: 'Hello! How can I help you with your property search today?',
      hello: 'Hi there! Welcome to Wapsell. What would you like to know about our properties?',
      price: 'Our property prices vary depending on location, size, and features. Could you tell me more about what you\'re looking for?',
      location: 'We have properties in several prime locations. Are you interested in a specific area?',
      default: `Thank you for your message. I'm here to help you with your property search. Please let me know what specific questions you have about our listings or the buying process.`,
    };

    // Simple keyword matching for demo
    const key = userMessage.toLowerCase().split(' ')[0];
    const response = mockResponses[key] || mockResponses.default;

    // Simulate LLM latency
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      text: response,
      tokens: Math.ceil(response.length / 4), // Rough estimate
    };
  }

  /**
   * Get a single session's metadata
   */
  async getSession(sessionId: string, userId: string): Promise<{
    id: string;
    created_at: Date;
    updated_at: Date;
    message_count: number;
  }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!conversation) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Verify user access
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: sessionId,
        userId,
      },
    });

    if (!participation) {
      throw new ForbiddenException('User does not have access to this session');
    }

    const messageCount = await this.prisma.message.count({
      where: {
        conversationId: sessionId,
        deletedAt: null,
      },
    });

    return {
      id: conversation.id,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
      message_count: messageCount,
    };
  }
}
