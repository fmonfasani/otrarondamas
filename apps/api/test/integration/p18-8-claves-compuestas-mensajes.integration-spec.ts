import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 4b: messaging) with decision D6 (option A). Every messaging
 * reference to the customer and the team member uses the row's own businessId: (customerId, businessId)
 * → Cliente (id, empresaId), (userId, businessId) → Membership (userId, businessId). The eight separate
 * `*BusinessId` columns that nothing tied to the row's business are gone. Attachments and reactions
 * carry their message's business. Restrict both ways, for every role (the system role included).
 */
const MODULE_TABLES = [
  'ConversationParticipant',
  'Message',
  'MessageReadReceipt',
  'MessagingReadPreference',
  'ConversationAssociation',
  'Attachment',
  'Reaction',
  // E4: a team member's ⭐ (its message and its membership).
  'MessageStar',
];

const DROPPED_COLUMNS = [
  'membershipBusinessId',
  'customerBusinessId',
  'authorMembershipBusinessId',
  'authorCustomerBusinessId',
];

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-8 ${label} ${suffix}`,
      slug: `p18-8-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const user = await prisma.user.create({
    data: { email: `p18-8-${label}-${suffix}@example.test`, nombre: `P18-8 User ${label}` },
  });
  await prisma.membership.create({
    data: { userId: user.id, businessId: id, role: 'OWNER', status: 'ACTIVE' },
  });
  const customer = await prisma.cliente.create({
    data: { empresaId: id, nombre: `P18-8 Customer ${label}` },
  });
  const conversation = await prisma.conversation.create({
    data: { businessId: id, type: 'GROUP' },
  });
  await prisma.conversationParticipant.create({
    data: { conversationId: conversation.id, businessId: id, userId: user.id, isAdmin: true },
  });
  await prisma.conversationParticipant.create({
    data: { conversationId: conversation.id, businessId: id, customerId: customer.id },
  });
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      businessId: id,
      authorUserId: user.id,
      sequence: BigInt(1),
      clientMessageId: `p18-8-${label}-${suffix}`,
      type: 'TEXT',
      content: 'Hola',
    },
  });
  return {
    id,
    user: user.id,
    customer: customer.id,
    conversation: conversation.id,
    message: message.id,
  };
}

describe('P18-8 — claves compuestas: mensajes (ADR-DAT-020, D6)', () => {
  let prisma: PrismaService;
  let suffix: number;
  let A: Business;
  let B: Business;

  const code = (error: unknown) => (error as { code?: string }).code;
  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'written';
    } catch (error) {
      return code(error);
    }
  };

  beforeAll(async () => {
    // The system role (wapsell_system) bypasses row security by design: the keys must hold for it too.
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    A = await createBusiness(prisma, 'A', suffix);
    B = await createBusiness(prisma, 'B', suffix);
  });

  afterAll(async () => {
    const businessId = { in: [A?.id, B?.id].filter(Boolean) as string[] };
    await prisma.reaction.deleteMany({ where: { businessId } });
    await prisma.attachment.deleteMany({ where: { businessId } });
    await prisma.messageReadReceipt.deleteMany({ where: { businessId } });
    await prisma.messagingReadPreference.deleteMany({ where: { businessId } });
    await prisma.conversationAssociation.deleteMany({ where: { businessId } });
    await prisma.message.deleteMany({ where: { businessId } });
    await prisma.conversationParticipant.deleteMany({ where: { businessId } });
    await prisma.conversation.deleteMany({ where: { businessId } });
    const users = [A?.user, B?.user].filter(Boolean) as string[];
    await prisma.membership.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.cliente.deleteMany({ where: { empresaId: businessId } });
    await prisma.empresa.deleteMany({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it('every foreign key of the module carries the business and restricts delete and update', async () => {
    type Fk = {
      name: string;
      on_delete: string;
      on_update: string;
      columns: string[];
      referenced_columns: string[];
    };
    const fks = await prisma.$queryRaw<Fk[]>`
      SELECT c.conname::text AS name, c.confdeltype::text AS on_delete, c.confupdtype::text AS on_update,
             ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS columns,
             ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i)
               AS referenced_columns
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class r ON r.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
      WHERE c.contype = 'f' AND t.relname::text = ANY(${MODULE_TABLES})
        AND r.relname NOT IN ('Empresa', 'User')
      ORDER BY 1`;

    // ConversationParticipant 3, Message 3, MessageReadReceipt 3, MessagingReadPreference 2,
    // ConversationAssociation 1, Attachment 1, Reaction 2 (E4: its customer), MessageStar 2.
    expect(fks).toHaveLength(17);
    const wrong = fks
      .filter((fk) => {
        const at = fk.columns.indexOf('businessId');
        const carries = at >= 0 && ['businessId', 'empresaId'].includes(fk.referenced_columns[at]);
        return !carries || fk.on_delete !== 'r' || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it('the eight separate business columns are gone (D6)', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name::text, column_name::text FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = ANY(${DROPPED_COLUMNS})`;
    expect(rows).toEqual([]);
  });

  it("the database refuses another business's customer, member or message, even for the system role", async () => {
    // A participant of A's conversation who is B's customer, or B's team member.
    expect(
      await rejection(
        prisma.conversationParticipant.create({
          data: { conversationId: A.conversation, businessId: A.id, customerId: B.customer },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.conversationParticipant.create({
          data: { conversationId: A.conversation, businessId: A.id, userId: B.user },
        }),
      ),
    ).toBe('P2003');
    // A message in A's conversation written by B's member.
    expect(
      await rejection(
        prisma.message.create({
          data: {
            conversationId: A.conversation,
            businessId: A.id,
            authorUserId: B.user,
            sequence: BigInt(99),
            clientMessageId: `p18-8-cross-${suffix}`,
            type: 'TEXT',
            content: 'Cruzado',
          },
        }),
      ),
    ).toBe('P2003');
    // A receipt, an attachment and a reaction of A on B's message.
    expect(
      await rejection(
        prisma.messageReadReceipt.create({
          data: { messageId: B.message, businessId: A.id, userId: A.user },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.attachment.create({
          data: {
            messageId: B.message,
            businessId: A.id,
            storageKey: `p18-8/${suffix}`,
            filename: 'x.png',
            mimeType: 'image/png',
            sizeBytes: BigInt(1),
          },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.reaction.create({
          data: { messageId: B.message, businessId: A.id, userId: A.user, emoji: '👍' },
        }),
      ),
    ).toBe('P2003');
    // A read preference of A for B's customer.
    expect(
      await rejection(
        prisma.messagingReadPreference.create({
          data: { businessId: A.id, customerId: B.customer, enabled: false },
        }),
      ),
    ).toBe('P2003');
    // The same rows inside A are fine.
    expect(
      await rejection(
        prisma.messageReadReceipt.create({
          data: { messageId: A.message, businessId: A.id, customerId: A.customer },
        }),
      ),
    ).toBe('written');
    expect(
      await rejection(
        prisma.reaction.create({
          data: { messageId: A.message, businessId: A.id, userId: A.user, emoji: '👍' },
        }),
      ),
    ).toBe('written');
  });

  it('a referenced row can be neither deleted nor moved to another business', async () => {
    expect(await rejection(prisma.conversation.delete({ where: { id: A.conversation } }))).toBe(
      'P2003',
    );
    expect(await rejection(prisma.cliente.delete({ where: { id: A.customer } }))).toBe('P2003');
    expect(
      await rejection(
        prisma.message.update({ where: { id: A.message }, data: { businessId: B.id } }),
      ),
    ).toBe('P2003');
  });
});
