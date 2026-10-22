import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { toMessageWire } from '../../src/messaging/message-serializer';
import type { BusinessContext } from '../../src/business-context/business-context.types';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

/**
 * Message send cycle against real PostgreSQL.
 *
 * Covers the acceptance criteria of the message engine: a successful send has
 * a serializable response consistent with the persisted row, a real failure
 * keeps its error semantics, retries do not duplicate, and the history
 * survives a reload (a fresh query, not an in-memory cache).
 *
 * `resolveContext` is stubbed because BusinessContext resolution belongs to
 * another workstream and needs a full Membership/JWT fixture; everything below
 * the context boundary -- transaction, sequence, uniqueness, serialization --
 * runs against the real database.
 */
describe('Messaging send cycle (real PostgreSQL)', () => {
  let prisma: PrismaService;
  let service: MessagingService;
  let suffix: number;
  let businessId: string;
  let userId: string;
  let legacyUserId: string;
  let conversationId: string;
  let context: BusinessContext;

  const auth = { id: 'legacy-user', type: 'usuario' } as unknown as AuthenticatedUser;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    const company = await prisma.empresa.create({
      data: { nombre: `MSG Send ${suffix}`, slug: `msg-send-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    businessId = company.id;

    const legacy = await prisma.usuario.create({
      data: {
        empresaId: businessId,
        nombre: `MSG sender ${suffix}`,
        email: `msg-send-${suffix}@test.local`,
      },
      select: { id: true },
    });
    legacyUserId = legacy.id;

    const user = await prisma.user.create({
      data: {
        email: `msg-send-${suffix}@test.local`,
        nombre: `MSG sender ${suffix}`,
        usuarioId: legacyUserId,
      },
      select: { id: true },
    });
    userId = user.id;

    await prisma.membership.create({
      data: { userId, businessId, role: 'OWNER', status: 'ACTIVE' },
    });

    const conversation = await prisma.conversation.create({
      data: { businessId, type: 'GROUP' },
      select: { id: true },
    });
    conversationId = conversation.id;

    await prisma.conversationParticipant.create({
      data: { conversationId, businessId, userId, membershipBusinessId: businessId },
    });

    context = {
      businessId,
      userId,
      membershipId: null,
      customerId: null,
      role: 'OWNER',
      permissions: [],
      actorType: 'USER',
    } as unknown as BusinessContext;

    service = new MessagingService(prisma, {} as never);
    // The context boundary is owned by another workstream; everything below it
    // is exercised for real.
    (service as unknown as { resolveContext: () => Promise<BusinessContext> }).resolveContext =
      () => Promise.resolve(context);
  });

  afterAll(async () => {
    // Order matters: children before parents. `conversationAssociation` is
    // cleared explicitly because its FK to Conversation would otherwise block
    // the delete if another flow created one for this conversation.
    await prisma.messageReadReceipt.deleteMany({ where: { businessId } }).catch(() => undefined);
    await prisma.reaction.deleteMany({ where: { message: { businessId } } }).catch(() => undefined);
    await prisma.conversationAssociation
      .deleteMany({ where: { businessId } })
      .catch(() => undefined);
    await prisma.message.deleteMany({ where: { businessId } });
    await prisma.conversationParticipant.deleteMany({ where: { businessId } });
    await prisma.conversation.deleteMany({ where: { businessId } });
    await prisma.membership.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.usuario.deleteMany({ where: { id: legacyUserId } });
    await prisma.empresa.deleteMany({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it('persists a message and returns a JSON-safe body consistent with the row', async () => {
    const created = await service.createTextMessage(
      auth,
      conversationId,
      `send-${suffix}-1`,
      'Primer mensaje',
    );

    const persisted = await prisma.message.findUnique({ where: { id: created.id } });
    expect(persisted).not.toBeNull();

    const wire = toMessageWire(created as never);
    // The defect reported in the field: the row commits and the response then
    // fails to serialize because `sequence` is a BigInt.
    expect(() => JSON.stringify(wire)).not.toThrow();
    expect(wire.sequence).toBe(String(persisted!.sequence));
    expect(wire.content).toBe(persisted!.content);
    expect(wire.id).toBe(persisted!.id);
    // Tenancy columns never reach the wire.
    expect(wire).not.toHaveProperty('businessId');
  });

  it('assigns strictly increasing sequences', async () => {
    const a = await service.createTextMessage(auth, conversationId, `send-${suffix}-2`, 'A');
    const b = await service.createTextMessage(auth, conversationId, `send-${suffix}-3`, 'B');
    expect(b.sequence > a.sequence).toBe(true);
  });

  it('does not duplicate when the same clientMessageId is retried', async () => {
    const key = `retry-${suffix}`;
    const first = await service.createTextMessage(auth, conversationId, key, 'Reintento');
    const second = await service.createTextMessage(auth, conversationId, key, 'Reintento');

    expect(second.id).toBe(first.id);
    expect(second.sequence).toBe(first.sequence);

    const rows = await prisma.message.findMany({
      where: { conversationId, clientMessageId: key },
    });
    // The acceptance criterion: one row, regardless of how many retries.
    expect(rows).toHaveLength(1);
  });

  it('keeps error semantics when the same key carries different content', async () => {
    const key = `conflict-${suffix}`;
    await service.createTextMessage(auth, conversationId, key, 'Original');

    await expect(
      service.createTextMessage(auth, conversationId, key, 'Distinto'),
    ).rejects.toBeInstanceOf(ConflictException);

    const rows = await prisma.message.findMany({
      where: { conversationId, clientMessageId: key },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe('Original');
  });

  it('recovers the ordered history after a reload', async () => {
    const history = await service.getMessages(auth, conversationId);
    expect(history.length).toBeGreaterThan(0);

    const sequences = history.map((m) => m.sequence);
    const ascending = [...sequences].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    expect(sequences).toEqual(ascending);

    // "Survives the reload": re-read with a fresh client, no in-memory state.
    const fresh = new PrismaService();
    await fresh.$connect();
    try {
      const rows = await fresh.message.findMany({
        where: { conversationId, deletedAt: null },
        orderBy: { sequence: 'asc' },
      });
      expect(rows.map((r) => r.id)).toEqual(history.map((m) => m.id));
      expect(() => JSON.stringify(rows.map((r) => toMessageWire(r as never)))).not.toThrow();
    } finally {
      await fresh.$disconnect();
    }
  });
});
