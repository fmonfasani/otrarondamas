import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PersonaDetector } from './persona-detector';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;
  let personaDetector: PersonaDetector;

  const mockUserId = uuidv4();
  const mockBusinessId = uuidv4();
  const mockSessionId = uuidv4();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        PersonaDetector,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            message: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
            conversationParticipant: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
    personaDetector = module.get<PersonaDetector>(PersonaDetector);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    it('should throw BadRequestException for empty message', async () => {
      await expect(
        service.processMessage('', mockUserId, mockBusinessId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for message exceeding max length', async () => {
      const longMessage = 'a'.repeat(2001);
      await expect(
        service.processMessage(longMessage, mockUserId, mockBusinessId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new conversation if session_id not provided', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
        type: 'BUYER_SUPPORT',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.create as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.create as jest.Mock).mockResolvedValue({});
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: uuidv4(),
        conversationId: mockSessionId,
      });

      const result = await service.processMessage(
        'Hello',
        mockUserId,
        mockBusinessId,
      );

      expect(result).toBeDefined();
      expect(result.session_id).toBe(mockSessionId);
      expect(result.response).toBeDefined();
      expect(prisma.conversation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent session', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processMessage(
          'Hello',
          mockUserId,
          mockBusinessId,
          mockSessionId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not in conversation', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processMessage(
          'Hello',
          mockUserId,
          mockBusinessId,
          mockSessionId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return message response with persona and metadata', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({
        id: uuidv4(),
      });
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: uuidv4(),
        conversationId: mockSessionId,
      });

      const result = await service.processMessage(
        'How does this work?',
        mockUserId,
        mockBusinessId,
        mockSessionId,
      );

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.session_id).toBe(mockSessionId);
      expect(result.persona).toBeDefined();
      expect(result.persona.persona_type).toBeDefined();
      expect(result.persona.confidence).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.model).toBeDefined();
      expect(result.metadata.response_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getHistory', () => {
    it('should throw NotFoundException for non-existent session', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getHistory(mockSessionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not in conversation', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getHistory(mockSessionId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return message history with count', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
      };

      const mockMessages = [
        {
          id: uuidv4(),
          type: 'USER',
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          type: 'SYSTEM',
          content: 'Hi there',
          createdAt: new Date(),
        },
      ];

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({
        id: uuidv4(),
      });
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getHistory(mockSessionId, mockUserId);

      expect(result).toBeDefined();
      expect(result.session_id).toBe(mockSessionId);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.total_count).toBe(2);
    });
  });

  describe('deleteSession', () => {
    it('should throw NotFoundException for non-existent session', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSession(mockSessionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not in conversation', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteSession(mockSessionId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft-delete conversation and messages', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
        deletedAt: null,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({
        id: uuidv4(),
      });
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.conversation.update as jest.Mock).mockResolvedValue({
        ...mockConversation,
        deletedAt: new Date(),
      });

      const result = await service.deleteSession(mockSessionId, mockUserId);

      expect(result).toBeDefined();
      expect(result.message).toBe('Session deleted successfully');
      expect(result.session_id).toBe(mockSessionId);
      expect(prisma.message.updateMany).toHaveBeenCalled();
      expect(prisma.conversation.update).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session metadata', async () => {
      const mockConversation = {
        id: mockSessionId,
        businessId: mockBusinessId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({
        id: uuidv4(),
      });
      (prisma.message.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getSession(mockSessionId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSessionId);
      expect(result.message_count).toBe(10);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });
  });
});
