import { ForbiddenException } from '@nestjs/common';
import { MembershipStatus, MessagingConversationType } from '@prisma/client';
import type { BusinessContext } from '../business-context/business-context.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { ConversationTypeDto } from './dto/create-conversation.dto';

describe('MessagingService — M2 conversations', () => {
  const context: BusinessContext = {
    businessId: 'business-a',
    customerId: null,
    userId: 'user-a',
    membershipId: 'membership-a',
    role: 'OWNER',
    permissions: [],
    actorType: 'USER',
  };

  const auth: AuthenticatedUser = {
    id: 'legacy-user-a',
    email: 'owner@example.com',
    nombre: 'Owner',
    empresaId: 'business-a',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  };

  const businessContext = {
    resolveForAuthenticatedUser: jest.fn().mockResolvedValue(context),
    resolveForCustomer: jest.fn(),
  };

  const prisma = {
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    cliente: {
      findMany: jest.fn(),
    },
  };

  let service: MessagingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingService(prisma as any, businessContext as any);
  });

  it('resolves authenticated operations through canonical BusinessContext', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      participants: [],
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });

    await service.getConversation(auth, 'conversation-a');

    expect(businessContext.resolveForAuthenticatedUser).toHaveBeenCalledWith(auth);
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'conversation-a',
          businessId: 'business-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('creates a DIRECT conversation with the actor and one other participant', async () => {
    prisma.membership.findMany.mockResolvedValue([{ userId: 'user-b' }]);
    prisma.conversation.create.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      type: MessagingConversationType.DIRECT,
    });
    prisma.conversationParticipant.create
      .mockResolvedValueOnce({ id: 'creator-participant' })
      .mockResolvedValueOnce({ id: 'other-participant' });
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      participants: [],
    });

    const result = await service.createConversation(auth, {
      type: ConversationTypeDto.DIRECT,
      participantUserIds: ['user-b'],
    });

    expect(result.id).toBe('conversation-a');
    expect(prisma.conversationParticipant.create).toHaveBeenCalledTimes(2);
    expect(prisma.conversationParticipant.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-a',
          membershipBusinessId: 'business-a',
          isAdmin: true,
        }),
      }),
    );
  });

  it('rejects a GROUP creation that would exceed 50 participants', async () => {
    await expect(
      service.createConversation(auth, {
        type: ConversationTypeDto.GROUP,
        participantUserIds: Array.from({ length: 50 }, (_, index) => 'user-' + index),
      }),
    ).rejects.toThrow('no puede superar 50 participantes');

    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('rejects access for an actor who is not an active participant', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      participants: [],
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue(null);

    await expect(service.getConversation(auth, 'conversation-a')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('removes a participant and promotes the earliest remaining participant when the admin leaves', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst
      .mockResolvedValueOnce({
        id: 'admin-participant',
        userId: 'user-a',
        leftAt: null,
        removedAt: null,
        isAdmin: true,
      })
      .mockResolvedValueOnce({
        id: 'successor-participant',
        userId: 'user-b',
        leftAt: null,
        removedAt: null,
        isAdmin: false,
      });
    prisma.conversationParticipant.update
      .mockResolvedValueOnce({
        id: 'admin-participant',
        leftAt: new Date(),
        isAdmin: false,
      })
      .mockResolvedValueOnce({
        id: 'successor-participant',
        isAdmin: true,
      });

    const result = await service.removeParticipant(
      auth,
      'conversation-a',
      'admin-participant',
    );

    expect(result.id).toBe('admin-participant');
    expect(prisma.conversationParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'successor-participant' },
        data: { isAdmin: true },
      }),
    );
  });

  it('keeps participant history by creating a new participant row on rejoin', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      type: MessagingConversationType.GROUP,
    });
    prisma.conversationParticipant.findFirst
      .mockResolvedValueOnce({
        id: 'actor-participant',
        userId: 'user-a',
        leftAt: null,
        removedAt: null,
      })
      .mockResolvedValueOnce(null);
    prisma.conversationParticipant.count.mockResolvedValue(1);
    prisma.membership.findMany.mockResolvedValue([{ userId: 'user-b' }]);
    prisma.conversationParticipant.create.mockResolvedValue({
      id: 'new-participant',
      userId: 'user-b',
      leftAt: null,
      removedAt: null,
    });

    const result = await service.addParticipant(auth, 'conversation-a', 'user-b');

    expect(result.id).toBe('new-participant');
    expect(prisma.conversationParticipant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-b',
          membershipBusinessId: 'business-a',
        }),
      }),
    );
    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-a',
          status: MembershipStatus.ACTIVE,
        }),
      }),
    );
  });
});
