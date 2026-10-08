import { ForbiddenException } from '@nestjs/common';
import { MembershipStatus, MessagingConversationType } from '@prisma/client';
import type { BusinessContext } from '../business-context/business-context.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { ConversationTypeDto } from './dto/create-conversation.dto';

describe('MessagingService — M2/M3 messaging', () => {
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
    messageReadReceipt: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    messagingReadPreference: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: MessagingService;
  const realtimeEventBus = { publish: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingService(prisma as any, businessContext as any, realtimeEventBus as any);
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

  it('rejects access for a non-owner actor who is not an active participant', async () => {
    const nonOwnerContext: BusinessContext = {
      ...context,
      role: 'ASISTENTE_LOCAL',
    };
    const nonOwnerAuth: AuthenticatedUser = {
      ...auth,
      email: 'seller@example.com',
      nombre: 'Seller',
      rol: 'ASISTENTE_LOCAL',
    };

    businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce(nonOwnerContext);
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      participants: [],
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue(null);

    await expect(
      service.getConversation(nonOwnerAuth, 'conversation-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
  it('creates a TEXT message with canonical tenant context and monotonic sequence', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue({ sequence: BigInt(4) });
    prisma.message.create.mockResolvedValue({
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      sequence: BigInt(5),
      type: 'TEXT',
      content: 'Hola',
    });

    const result = await service.createTextMessage(
      auth,
      'conversation-a',
      'client-1',
      'Hola',
    );

    expect(result.sequence).toBe(BigInt(5));
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conversation-a',
          businessId: 'business-a',
          userId: 'user-a',
          membershipBusinessId: 'business-a',
          sequence: BigInt(5),
          clientMessageId: 'client-1',
          type: 'TEXT',
          content: 'Hola',
        }),
      }),
    );
  });

  it('retrieves only messages created after the actor current participation period', async () => {
    const joinedAt = new Date('2026-10-08T10:00:00.000Z');
    const nonOwnerContext: BusinessContext = {
      ...context,
      role: 'ASISTENTE_LOCAL',
    };
    businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce(nonOwnerContext);
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      joinedAt,
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findMany.mockResolvedValue([]);

    await service.getMessages(auth, 'conversation-a');

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business-a',
          conversationId: 'conversation-a',
          deletedAt: null,
          createdAt: { gte: joinedAt },
        }),
      }),
    );
  });

  it('allows only the message author to edit text', async () => {
    prisma.message.findFirst.mockResolvedValue({
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      authorUserId: 'user-a',
      deletedAt: null,
    });
    prisma.message.update.mockResolvedValue({
      id: 'message-a',
      content: 'Editado',
    });

    const result = await service.editMessage(
      auth,
      'conversation-a',
      'message-a',
      'Editado',
    );

    expect(result.content).toBe('Editado');
    expect(prisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'message-a' },
        data: expect.objectContaining({
          content: 'Editado',
          editedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('soft-deletes a message and clears visible content', async () => {
    prisma.message.findFirst.mockResolvedValue({
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      authorUserId: 'user-a',
      deletedAt: null,
    });
    prisma.message.update.mockResolvedValue({
      id: 'message-a',
      content: null,
      deletedAt: new Date(),
    });

    const result = await service.deleteMessage(auth, 'conversation-a', 'message-a');

    expect(result.content).toBeNull();
    expect(prisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'message-a' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedByUserId: 'user-a',
          content: null,
        }),
      }),
    );
  });


  it('creates an idempotent read receipt within the canonical BusinessContext', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue({
      id: 'message-a',
    });
    prisma.messagingReadPreference.findFirst.mockResolvedValue(null);
    prisma.messageReadReceipt.findFirst.mockResolvedValue(null);
    prisma.messageReadReceipt.create.mockResolvedValue({
      id: 'receipt-a',
      messageId: 'message-a',
      businessId: 'business-a',
      userId: 'user-a',
      readAt: new Date('2026-10-08T10:00:00.000Z'),
    });

    const result = await service.markMessageRead(auth, 'conversation-a', 'message-a');

    expect(result.read).toBe(true);
    expect(prisma.messageReadReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageId: 'message-a',
          businessId: 'business-a',
          userId: 'user-a',
          membershipBusinessId: 'business-a',
        }),
      }),
    );
  });

  it('does not publish a read receipt when the actor disabled read receipts', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue({ id: 'message-a' });
    prisma.messagingReadPreference.findFirst.mockResolvedValue({
      id: 'preference-a',
      enabled: false,
    });

    const result = await service.markMessageRead(auth, 'conversation-a', 'message-a');

    expect(result).toEqual({
      messageId: 'message-a',
      read: false,
      receiptsEnabled: false,
    });
    expect(prisma.messageReadReceipt.create).not.toHaveBeenCalled();
  });

  it('hides receipts belonging to actors who disabled read receipts', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue({ id: 'message-a' });
    prisma.messageReadReceipt.findMany.mockResolvedValue([
      {
        id: 'receipt-a',
        messageId: 'message-a',
        businessId: 'business-a',
        userId: 'user-a',
        customerId: null,
        readAt: new Date('2026-10-08T10:00:00.000Z'),
      },
      {
        id: 'receipt-b',
        messageId: 'message-a',
        businessId: 'business-a',
        userId: 'user-b',
        customerId: null,
        readAt: new Date('2026-10-08T10:01:00.000Z'),
      },
    ]);
    prisma.messagingReadPreference.findMany
      .mockResolvedValueOnce([
        { userId: 'user-a', enabled: true },
        { userId: 'user-b', enabled: false },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getMessageReadReceipts(
      auth,
      'conversation-a',
      'message-a',
    );

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user-a');
  });

  it('persists the read receipt preference per Business actor', async () => {
    prisma.messagingReadPreference.findFirst.mockResolvedValue({
      id: 'preference-a',
      enabled: true,
    });
    prisma.messagingReadPreference.update.mockResolvedValue({
      id: 'preference-a',
      enabled: false,
    });

    const result = await service.setReadReceiptPreference(auth, false);

    expect(result.enabled).toBe(false);
    expect(prisma.messagingReadPreference.update).toHaveBeenCalledWith({
      where: { id: 'preference-a' },
      data: { enabled: false },
    });
  });

  it('publishes a created event only after message persistence succeeds', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue({ sequence: BigInt(4) });
    prisma.message.create.mockResolvedValue({
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      sequence: BigInt(5),
      type: 'TEXT',
      content: 'Hola',
    });

    await service.createTextMessage(auth, 'conversation-a', 'client-1', 'Hola');

    expect(realtimeEventBus.publish).toHaveBeenCalledWith({
      type: 'conversation.message.created',
      businessId: 'business-a',
      conversationId: 'conversation-a',
      messageId: 'message-a',
      sequence: '5',
    });
  });

  it('authorizes realtime conversation access with Owner global visibility', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });

    await expect(
      service.authorizeRealtimeConversation(auth, 'conversation-a'),
    ).resolves.toEqual({ businessId: 'business-a', actorType: 'USER' });

    expect(prisma.conversationParticipant.findFirst).not.toHaveBeenCalled();
  });

  it('requires active participation for non-Owner realtime access', async () => {
    const nonOwnerContext = { ...context, role: 'ASISTENTE_LOCAL' };
    businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce(nonOwnerContext);
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue(null);

    await expect(
      service.authorizeRealtimeConversation(
        { ...auth, rol: 'ASISTENTE_LOCAL' },
        'conversation-a',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

});
