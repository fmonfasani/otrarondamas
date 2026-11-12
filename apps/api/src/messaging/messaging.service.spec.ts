import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MembershipStatus, MessagingConversationType, Prisma } from '@prisma/client';
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
    $transaction: jest.fn(async (callback: unknown) => callback(prisma)),
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Directory lookups (participant names, last message) default to "nothing found".
    prisma.membership.findMany.mockResolvedValue([]);
    prisma.cliente.findMany.mockResolvedValue([]);
    prisma.message.findFirst.mockResolvedValue(null);
    service = new MessagingService(prisma as unknown as any, businessContext as unknown as any);
  });

  describe('contacts', () => {
    it('lists the ACTIVE team of the actor Business with canonical User ids', async () => {
      prisma.membership.findMany.mockResolvedValue([
        { userId: 'user-a', role: 'OWNER', User: { nombre: 'Lucía' } },
        { userId: 'user-b', role: 'VENDEDOR', User: { nombre: 'Diego' } },
      ]);

      const contacts = await service.listContacts(auth);

      expect(prisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'business-a', status: MembershipStatus.ACTIVE },
        }),
      );
      expect(contacts).toEqual([
        { userId: 'user-a', name: 'Lucía', role: 'OWNER', isViewer: true },
        { userId: 'user-b', name: 'Diego', role: 'VENDEDOR', isViewer: false },
      ]);
    });

    it('refuses customers', async () => {
      businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce({
        ...context,
        userId: null,
        customerId: 'customer-a',
        actorType: 'CUSTOMER',
      });

      await expect(service.listContacts(auth)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.membership.findMany).not.toHaveBeenCalled();
    });
  });

  describe('inbox directory (participants and last message)', () => {
    const joinedAt = new Date('2026-11-10T10:00:00Z');
    const conversation = {
      id: 'conversation-a',
      businessId: 'business-a',
      ConversationParticipant: [
        { id: 'p-a', userId: 'user-a', customerId: null, isAdmin: true, joinedAt },
        { id: 'p-c', userId: null, customerId: 'customer-a', isAdmin: false, joinedAt },
      ],
    };

    it('names staff from their Membership and customers from Cliente, both scoped to the Business', async () => {
      prisma.conversation.findMany.mockResolvedValue([conversation]);
      prisma.membership.findMany.mockResolvedValue([
        { userId: 'user-a', role: 'OWNER', User: { nombre: 'Lucía' } },
      ]);
      prisma.cliente.findMany.mockResolvedValue([{ id: 'customer-a', nombre: 'María' }]);

      const [row] = await service.listConversations(auth);

      expect(row.participants).toEqual([
        {
          id: 'p-a',
          userId: 'user-a',
          customerId: null,
          kind: 'STAFF',
          name: 'Lucía',
          role: 'OWNER',
          isAdmin: true,
          isViewer: true,
        },
        {
          id: 'p-c',
          userId: null,
          customerId: 'customer-a',
          kind: 'CUSTOMER',
          name: 'María',
          role: null,
          isAdmin: false,
          isViewer: false,
        },
      ]);
      expect(prisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'business-a', userId: { in: ['user-a'] } },
        }),
      );
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'business-a', id: { in: ['customer-a'] } } }),
      );
      expect(row.ConversationParticipant).toBe(conversation.ConversationParticipant);
    });

    it('previews the latest non-deleted message', async () => {
      prisma.conversation.findMany.mockResolvedValue([conversation]);
      const last = {
        id: 'm-9',
        type: 'TEXT',
        content: 'hola',
        createdAt: new Date('2026-11-11T09:00:00Z'),
      };
      prisma.message.findFirst.mockResolvedValue(last);

      const [row] = await service.listConversations(auth);

      expect(row.lastMessage).toBe(last);
      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conversation-a', deletedAt: null },
          orderBy: { sequence: 'desc' },
        }),
      );
    });

    it('hides a preview older than the join date from a participant without full history', async () => {
      businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce({
        ...context,
        role: 'VENDEDOR',
      });
      prisma.conversation.findMany.mockResolvedValue([conversation]);
      prisma.message.findFirst.mockResolvedValue({
        id: 'm-1',
        content: 'antes de entrar',
        createdAt: new Date('2026-11-09T09:00:00Z'),
      });

      const [row] = await service.listConversations(auth);

      expect(row.lastMessage).toBeNull();
    });

    it('falls back to a generic label when a name cannot be resolved inside the Business', async () => {
      prisma.conversation.findMany.mockResolvedValue([conversation]);

      const [row] = await service.listConversations(auth);

      expect(row.participants.map((p) => p.name)).toEqual(['Equipo', 'Cliente']);
    });
  });

  it('resolves authenticated operations through canonical BusinessContext', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      ConversationParticipant: [],
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

  it('lists every Business conversation for the Owner, scoped to the canonical Business', async () => {
    prisma.conversation.findMany.mockResolvedValue([]);

    await service.listConversations(auth);

    expect(businessContext.resolveForAuthenticatedUser).toHaveBeenCalledWith(auth);
    const args = prisma.conversation.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ businessId: 'business-a', deletedAt: null });
  });

  it('lists only the conversations where a non-owner actor is an active participant', async () => {
    businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce({
      ...context,
      role: 'ASISTENTE_LOCAL',
    });
    prisma.conversation.findMany.mockResolvedValue([]);

    await service.listConversations(auth);

    const args = prisma.conversation.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      businessId: 'business-a',
      deletedAt: null,
      ConversationParticipant: {
        some: {
          businessId: 'business-a',
          leftAt: null,
          removedAt: null,
          userId: 'user-a',
        },
      },
    });
  });

  it('marks each listed conversation with the actor writing access (participant vs Owner read-only)', async () => {
    prisma.conversation.findMany.mockResolvedValue([
      {
        id: 'conversation-mine',
        businessId: 'business-a',
        ConversationParticipant: [{ userId: 'user-a', customerId: null }],
      },
      {
        id: 'conversation-observed',
        businessId: 'business-a',
        ConversationParticipant: [
          { userId: 'user-z', customerId: null },
          { userId: null, customerId: 'customer-a' },
        ],
      },
    ]);

    const result = await service.listConversations(auth);

    expect(result.map((row) => [row.id, row.viewerAccess])).toEqual([
      ['conversation-mine', { canSend: true, mode: 'PARTICIPANT' }],
      ['conversation-observed', { canSend: false, mode: 'OWNER_READ_ONLY' }],
    ]);
  });

  it('reports read-only access when an Owner opens a conversation it does not participate in', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-observed',
      businessId: 'business-a',
      deletedAt: null,
      ConversationParticipant: [{ userId: 'user-z', customerId: null }],
    });

    const result = await service.getConversation(auth, 'conversation-observed');

    expect(result.viewerAccess).toEqual({ canSend: false, mode: 'OWNER_READ_ONLY' });
    expect(prisma.conversationParticipant.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a message from an Owner who is not a participant and persists nothing', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-observed',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue(null);

    await expect(
      service.createTextMessage(auth, 'conversation-observed', 'client-observer', 'hola'),
    ).rejects.toThrow('El actor no participa en la conversación');
    expect(prisma.message.create).not.toHaveBeenCalled();
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
      ConversationParticipant: [],
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
      ConversationParticipant: [],
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue(null);

    await expect(service.getConversation(nonOwnerAuth, 'conversation-a')).rejects.toBeInstanceOf(
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

    const result = await service.removeParticipant(auth, 'conversation-a', 'admin-participant');

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
    // Two distinct `message.findFirst` calls happen in the send path and they
    // must not be conflated: first the idempotency lookup by clientMessageId
    // (no previous send -> null), then the last-sequence lookup.
    prisma.message.findFirst.mockImplementation(({ where, orderBy }: unknown) =>
      Promise.resolve(
        where?.clientMessageId !== undefined
          ? null
          : orderBy?.sequence === 'desc'
            ? { sequence: BigInt(4) }
            : null,
      ),
    );
    prisma.message.create.mockResolvedValue({
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      sequence: BigInt(5),
      type: 'TEXT',
      content: 'Hola',
    });

    const result = await service.createTextMessage(auth, 'conversation-a', 'client-1', 'Hola');

    expect(result.sequence).toBe(BigInt(5));
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conversation-a',
          businessId: 'business-a',
          authorUserId: 'user-a',
          authorMembershipBusinessId: 'business-a',
          sequence: BigInt(5),
          clientMessageId: 'client-1',
          type: 'TEXT',
          content: 'Hola',
        }),
      }),
    );
  });

  // ---------------------------------------------------------------- idempotency
  // `clientMessageId` is the client's retry key. These cover the three outcomes
  // a retry can have, which is what keeps the client out of an ambiguous state.

  it('returns the existing message when the same clientMessageId is retried', async () => {
    const persisted = {
      id: 'message-a',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      sequence: BigInt(5),
      clientMessageId: 'client-1',
      type: 'TEXT',
      content: 'Hola',
      replyToMessageId: null,
    };
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
    // The idempotency lookup finds the previous send.
    prisma.message.findFirst.mockImplementation(({ where }: unknown) =>
      Promise.resolve(where?.clientMessageId !== undefined ? persisted : { sequence: BigInt(5) }),
    );

    const result = await service.createTextMessage(auth, 'conversation-a', 'client-1', 'Hola');

    expect(result).toEqual(persisted);
    // The decisive assertion: a retry must not persist a second row.
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('rejects reusing a clientMessageId with different content', async () => {
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
    prisma.message.findFirst.mockImplementation(({ where }: unknown) =>
      Promise.resolve(
        where?.clientMessageId !== undefined
          ? { id: 'message-a', content: 'Hola', replyToMessageId: null }
          : { sequence: BigInt(5) },
      ),
    );

    // Same key, different payload: a client defect, not a retry. Returning the
    // old message would silently drop the new one.
    await expect(
      service.createTextMessage(auth, 'conversation-a', 'client-1', 'Otro contenido'),
    ).rejects.toThrow(ConflictException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('resolves a concurrent duplicate send through the unique constraint', async () => {
    const persisted = {
      id: 'message-a',
      conversationId: 'conversation-a',
      sequence: BigInt(5),
      clientMessageId: 'client-1',
      content: 'Hola',
      replyToMessageId: null,
    };
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
    // Race: the pre-check misses, the competing transaction commits first.
    let idempotencyLookups = 0;
    prisma.message.findFirst.mockImplementation(({ where }: unknown) => {
      if (where?.clientMessageId !== undefined) {
        idempotencyLookups += 1;
        return Promise.resolve(idempotencyLookups === 1 ? null : persisted);
      }
      return Promise.resolve({ sequence: BigInt(4) });
    });
    prisma.message.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['conversationId', 'clientMessageId', 'authorUserId'] },
      }),
    );

    const result = await service.createTextMessage(auth, 'conversation-a', 'client-1', 'Hola');

    // The DB constraint is the authority; the winner's row is returned.
    expect(result).toEqual(persisted);
  });

  it('reports a sequence collision as retryable, not as a duplicate send', async () => {
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
    prisma.message.findFirst.mockImplementation(({ where }: unknown) =>
      Promise.resolve(where?.clientMessageId !== undefined ? null : { sequence: BigInt(4) }),
    );
    prisma.message.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('seq', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['conversationId', 'sequence'] },
      }),
    );

    // Two different sends racing for the same position is NOT a duplicate
    // clientMessageId; diagnosing it as one would mislead the client.
    await expect(
      service.createTextMessage(auth, 'conversation-a', 'client-1', 'Hola'),
    ).rejects.toThrow(/posición en la conversación/);
  });

  it('creates a TEXT message with the canonical customer-author relation', async () => {
    const customerContext: BusinessContext = {
      ...context,
      customerId: 'customer-a',
      userId: null,
      membershipId: null,
      role: null,
      actorType: 'CUSTOMER',
    };
    const customerAuth: AuthenticatedUser = {
      ...auth,
      id: 'customer-a',
      type: 'cliente',
    };
    businessContext.resolveForCustomer.mockResolvedValueOnce(customerContext);
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-customer',
      customerId: 'customer-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findFirst.mockResolvedValue(null);
    prisma.message.create.mockResolvedValue({
      id: 'message-customer',
      conversationId: 'conversation-a',
      businessId: 'business-a',
      authorCustomerId: 'customer-a',
      authorCustomerBusinessId: 'business-a',
      sequence: BigInt(1),
      type: 'TEXT',
      content: 'Consulta',
    });

    const result = await service.createTextMessage(
      customerAuth,
      'conversation-a',
      'client-customer-1',
      'Consulta',
    );

    expect(result.authorCustomerId).toBe('customer-a');
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorCustomerId: 'customer-a',
          authorCustomerBusinessId: 'business-a',
          sequence: BigInt(1),
          clientMessageId: 'client-customer-1',
          content: 'Consulta',
        }),
      }),
    );
    expect(prisma.message.create.mock.calls[0][0].data).not.toHaveProperty('customerId');
    expect(prisma.message.create.mock.calls[0][0].data).not.toHaveProperty('userId');
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

    const result = await service.editMessage(auth, 'conversation-a', 'message-a', 'Editado');

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

    const result = await service.getMessageReadReceipts(auth, 'conversation-a', 'message-a');

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
});
