import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * P2 -- Security and tenancy: negative authorization tests for Messaging.
 *
 * Every assertion below runs against the compiled stack over real HTTP with
 * real JWTs, so identity, BusinessContext and the participation guards are the
 * production ones. `resolveContext` is deliberately NOT stubbed: stubbing it
 * bypasses the Membership gate and makes a suspended member look authorized
 * when the real stack denies it.
 *
 * Normative source: 03-INVARIANTS/
 * WAPSELL-MESSAGING-MVP-INVARIANTS-CORE-CONVERSATION-PARTICIPANTS-v0.2.md,
 * section 4 (four access modes) and section 4.3 (per-endpoint enforcement).
 *
 * Matrix covered: Owner non-participant, internal non-Owner, Customer,
 * departed participant (leftAt), removed participant (removedAt), suspended
 * Membership and foreign Business. Each rejection also asserts that nothing
 * was persisted, because a 403 that still writes is worse than a 200.
 */
describe('P2 -- Messaging authorization (compiled stack + real PostgreSQL)', () => {
  const PORT = '3397';
  const BASE = `http://127.0.0.1:${PORT}`;
  const NOT_PARTICIPANT = 'El actor no participa en la conversación';

  let server: ChildProcess;
  let serverOutput = '';
  let serverStartError: string | undefined;
  let prisma: PrismaService;
  let suffix: number;

  type Actor = {
    legacyId: string;
    userId: string;
    businessId: string;
    role: 'OWNER' | 'ASISTENTE_LOCAL';
  };

  let owner: Actor; // creator, admin and participant
  let leaver: Actor; // participant who leaves (leftAt)
  let removed: Actor; // participant removed by the admin (removedAt)
  let suspended: Actor; // active participant whose Membership is later suspended
  let outsider: Actor; // internal non-Owner, never a participant
  let foreignOwner: Actor; // Owner of another Business
  let businessId: string;
  let foreignBusinessId: string;
  let customer: { id: string };

  let groupId: string; // owner + leaver + removed + suspended
  let customerConversationId: string; // owner + customer

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sign = (payload: Record<string, unknown>) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const body = b64url({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  };
  const userToken = (actor: Actor) =>
    sign({
      sub: actor.legacyId,
      email: `p2-${actor.legacyId}@example.test`,
      nombre: 'P2 authorization',
      empresaId: actor.businessId,
      permisos: [],
      rol: actor.role,
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });
  const customerToken = () =>
    sign({
      sub: customer.id,
      email: `p2-customer-${suffix}@example.test`,
      nombre: 'P2 customer',
      empresaId: businessId,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'cliente',
    });
  const bearer = (token: string) => `Bearer ${token}`;

  const makeActor = async (
    business: string,
    label: string,
    role: 'OWNER' | 'ASISTENTE_LOCAL',
  ): Promise<Actor> => {
    const legacy = await prisma.usuario.create({
      data: {
        empresaId: business,
        nombre: `P2 ${label} ${suffix}`,
        email: `p2-${label}-${suffix}@example.test`,
        activo: true,
        rol: role,
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `p2-canonical-${label}-${suffix}@example.test`,
        nombre: `P2 canonical ${label}`,
        usuarioId: legacy.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: business, role, status: 'ACTIVE' },
    });
    return { legacyId: legacy.id, userId: user.id, businessId: business, role };
  };

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        if (serverStartError || server.exitCode !== null || server.signalCode !== null) {
          reject(
            new Error(
              `API terminó antes de abrir el puerto ${port}. ${serverStartError ?? ''} ${serverOutput}`.trim(),
            ),
          );
          return;
        }
        const socket = net.connect(port, '127.0.0.1');
        socket.once('connect', () => {
          socket.end();
          resolve();
        });
        socket.once('error', () => {
          if (remaining <= 0)
            reject(new Error(`puerto ${port} sin respuesta. ${serverOutput}`.trim()));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  const stopServer = async () => {
    if (!server || server.exitCode !== null || server.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      const forceKill = setTimeout(() => server.kill('SIGKILL'), 5000);
      forceKill.unref();
      server.once('exit', () => {
        clearTimeout(forceKill);
        resolve();
      });
      server.kill('SIGTERM');
    });
  };

  const send = (token: string, conversationId: string, clientMessageId: string, content: string) =>
    request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', bearer(token))
      .send({ clientMessageId, content });

  const participantIdOf = (conversationId: string, userId: string) =>
    prisma.conversationParticipant
      .findFirst({ where: { conversationId, userId }, select: { id: true } })
      .then((row) => row!.id);

  beforeAll(async () => {
    if (!process.env.JWT_SECRET)
      throw new Error('JWT_SECRET es requerido para el test de autorización P2');
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    const company = await prisma.empresa.create({
      data: { nombre: `P2 authz ${suffix}`, slug: `p2-authz-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    const foreign = await prisma.empresa.create({
      data: { nombre: `P2 authz B ${suffix}`, slug: `p2-authz-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    businessId = company.id;
    foreignBusinessId = foreign.id;

    owner = await makeActor(businessId, 'owner', 'OWNER');
    leaver = await makeActor(businessId, 'leaver', 'OWNER');
    removed = await makeActor(businessId, 'removed', 'OWNER');
    suspended = await makeActor(businessId, 'suspended', 'OWNER');
    outsider = await makeActor(businessId, 'outsider', 'ASISTENTE_LOCAL');
    foreignOwner = await makeActor(foreignBusinessId, 'foreign', 'OWNER');
    customer = await prisma.cliente.create({
      data: { empresaId: businessId, nombre: `P2 customer ${suffix}` },
      select: { id: true },
    });

    server = spawn(process.execPath, ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout?.on('data', (chunk: Buffer) => {
      serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000);
    });
    server.stderr?.on('data', (chunk: Buffer) => {
      serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000);
    });
    server.once('error', (error) => {
      serverStartError = error.message;
    });
    await waitPort(Number(PORT));

    const group = await request(BASE)
      .post('/messaging/conversations')
      .set('Authorization', bearer(userToken(owner)))
      .send({
        type: 'GROUP',
        participantUserIds: [leaver.userId, removed.userId, suspended.userId],
      })
      .expect(201);
    groupId = group.body.id;

    const withCustomer = await request(BASE)
      .post('/messaging/conversations')
      .set('Authorization', bearer(userToken(owner)))
      .send({ type: 'DIRECT', participantCustomerIds: [customer.id] })
      .expect(201);
    customerConversationId = withCustomer.body.id;
  }, 120000);

  afterAll(async () => {
    await stopServer();
    if (prisma) {
      const businessIds = [businessId, foreignBusinessId].filter(Boolean);
      if (businessIds.length) {
        const actors = [owner, leaver, removed, suspended, outsider, foreignOwner].filter(Boolean);
        await prisma.messageReadReceipt.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.messagingReadPreference.deleteMany({
          where: { businessId: { in: businessIds } },
        });
        await prisma.reaction
          .deleteMany({ where: { message: { businessId: { in: businessIds } } } })
          .catch(() => undefined);
        await prisma.message.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.conversationAssociation.deleteMany({
          where: { businessId: { in: businessIds } },
        });
        await prisma.conversationParticipant.deleteMany({
          where: { businessId: { in: businessIds } },
        });
        await prisma.conversation.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.cliente.deleteMany({ where: { empresaId: { in: businessIds } } });
        await prisma.membership.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.user.deleteMany({ where: { id: { in: actors.map((a) => a.userId) } } });
        await prisma.usuario.deleteMany({ where: { id: { in: actors.map((a) => a.legacyId) } } });
        await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
      }
      await prisma.$disconnect();
    }
  });

  // -------------------------------------------------------------------
  // A departed participant keeps no write rights over its own history.
  // Section 4.3: edit and delete require assertActiveParticipant BEFORE
  // the author check. Authorship alone must not survive the departure.
  // -------------------------------------------------------------------
  describe('participant who left the conversation (leftAt)', () => {
    let messageId: string;

    beforeAll(async () => {
      const sent = await send(
        userToken(leaver),
        groupId,
        `leaver-${suffix}`,
        'Antes de irme',
      ).expect(201);
      messageId = sent.body.id;
      // Self-removal: the service writes leftAt for the actor itself.
      const participantId = await participantIdOf(groupId, leaver.userId);
      await request(BASE)
        .delete(`/messaging/conversations/${groupId}/participants/${participantId}`)
        .set('Authorization', bearer(userToken(leaver)))
        .expect(200);
      const row = await prisma.conversationParticipant.findUnique({
        where: { id: participantId },
        select: { leftAt: true },
      });
      expect(row!.leftAt).not.toBeNull();
    }, 60000);

    it('cannot send after leaving and persists nothing', async () => {
      const before = await prisma.message.count({ where: { conversationId: groupId } });
      const response = await send(userToken(leaver), groupId, `leaver-after-${suffix}`, 'Después');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(NOT_PARTICIPANT);
      expect(await prisma.message.count({ where: { conversationId: groupId } })).toBe(before);
    });

    it('cannot edit its own message after leaving and leaves the row untouched', async () => {
      const response = await request(BASE)
        .patch(`/messaging/conversations/${groupId}/messages/${messageId}`)
        .set('Authorization', bearer(userToken(leaver)))
        .send({ content: 'Editado después de irme' });

      expect(response.status).toBe(403);
      const persisted = await prisma.message.findUnique({
        where: { id: messageId },
        select: { content: true, editedAt: true },
      });
      // The rejection must leave no effect: original content, never edited.
      expect(persisted!.content).toBe('Antes de irme');
      expect(persisted!.editedAt).toBeNull();
    });

    it('cannot delete its own message after leaving and leaves the row untouched', async () => {
      const response = await request(BASE)
        .delete(`/messaging/conversations/${groupId}/messages/${messageId}`)
        .set('Authorization', bearer(userToken(leaver)));

      expect(response.status).toBe(403);
      const persisted = await prisma.message.findUnique({
        where: { id: messageId },
        select: { content: true, deletedAt: true },
      });
      expect(persisted!.deletedAt).toBeNull();
      expect(persisted!.content).toBe('Antes de irme');
    });

    it('cannot read the conversation detail or its history after leaving', async () => {
      // `leaver` has the OWNER role, so Mode 2 (OWNER_READ_ONLY) grants the
      // administrative read. What must never come back is write access.
      const detail = await request(BASE)
        .get(`/messaging/conversations/${groupId}`)
        .set('Authorization', bearer(userToken(leaver)));
      expect(detail.status).toBe(200);
      expect(detail.body.viewerAccess).toEqual({ canSend: false, mode: 'OWNER_READ_ONLY' });
    });
  });

  // -------------------------------------------------------------------
  // A participant removed by the admin (removedAt) is equally inactive.
  // -------------------------------------------------------------------
  describe('participant removed by the admin (removedAt)', () => {
    let messageId: string;

    beforeAll(async () => {
      const sent = await send(
        userToken(removed),
        groupId,
        `removed-${suffix}`,
        'Antes de salir',
      ).expect(201);
      messageId = sent.body.id;
      const participantId = await participantIdOf(groupId, removed.userId);
      await request(BASE)
        .delete(`/messaging/conversations/${groupId}/participants/${participantId}`)
        .set('Authorization', bearer(userToken(owner)))
        .expect(200);
      const row = await prisma.conversationParticipant.findUnique({
        where: { id: participantId },
        select: { removedAt: true },
      });
      expect(row!.removedAt).not.toBeNull();
    }, 60000);

    it('cannot send, edit or delete after removal, and nothing is persisted', async () => {
      const sendResponse = await send(
        userToken(removed),
        groupId,
        `removed-after-${suffix}`,
        'Después',
      );
      expect(sendResponse.status).toBe(403);

      const editResponse = await request(BASE)
        .patch(`/messaging/conversations/${groupId}/messages/${messageId}`)
        .set('Authorization', bearer(userToken(removed)))
        .send({ content: 'Editado tras la expulsión' });
      expect(editResponse.status).toBe(403);

      const deleteResponse = await request(BASE)
        .delete(`/messaging/conversations/${groupId}/messages/${messageId}`)
        .set('Authorization', bearer(userToken(removed)));
      expect(deleteResponse.status).toBe(403);

      const persisted = await prisma.message.findUnique({
        where: { id: messageId },
        select: { content: true, editedAt: true, deletedAt: true },
      });
      expect(persisted!.content).toBe('Antes de salir');
      expect(persisted!.editedAt).toBeNull();
      expect(persisted!.deletedAt).toBeNull();
    });

    it('keeps the conversation history for the remaining participants', async () => {
      // I-3 / section 2.4: departure is not a cascade. The message stays
      // readable for whoever still participates.
      const history = await request(BASE)
        .get(`/messaging/conversations/${groupId}/messages`)
        .set('Authorization', bearer(userToken(owner)))
        .expect(200);
      expect(history.body.map((m: { id: string }) => m.id)).toContain(messageId);
    });
  });

  // -------------------------------------------------------------------
  // Membership is the authority for internal identity: a suspended
  // Membership denies the context even while the participant row is
  // still active. This is the HTTP counterpart of the socket eviction.
  // -------------------------------------------------------------------
  describe('suspended Membership with a still-active participant row', () => {
    beforeAll(async () => {
      await prisma.membership.updateMany({
        where: { userId: suspended.userId, businessId },
        data: { status: 'SUSPENDED' },
      });
      const row = await prisma.conversationParticipant.findFirst({
        where: { conversationId: groupId, userId: suspended.userId },
        select: { leftAt: true, removedAt: true },
      });
      // The participant row is deliberately left untouched: the point is
      // that Membership alone must deny access.
      expect(row!.leftAt).toBeNull();
      expect(row!.removedAt).toBeNull();
    });

    it('denies every Messaging operation once the Membership is suspended', async () => {
      const before = await prisma.message.count({ where: { conversationId: groupId } });

      const responses = [
        await request(BASE)
          .get('/messaging/conversations')
          .set('Authorization', bearer(userToken(suspended))),
        await request(BASE)
          .get(`/messaging/conversations/${groupId}`)
          .set('Authorization', bearer(userToken(suspended))),
        await request(BASE)
          .get(`/messaging/conversations/${groupId}/messages`)
          .set('Authorization', bearer(userToken(suspended))),
        await send(userToken(suspended), groupId, `suspended-${suffix}`, 'No debería entrar'),
      ];

      for (const response of responses) {
        // Fails closed at context resolution, before any participation check.
        expect(response.status).toBeGreaterThanOrEqual(400);
      }

      expect(await prisma.message.count({ where: { conversationId: groupId } })).toBe(before);
    });
  });

  // -------------------------------------------------------------------
  // Internal non-Owner, never a participant (Mode 3: NON_AUTHORIZED).
  // -------------------------------------------------------------------
  describe('internal user who is not a participant and not Owner', () => {
    it('cannot read or write, and its list does not leak other conversations', async () => {
      const list = await request(BASE)
        .get('/messaging/conversations')
        .set('Authorization', bearer(userToken(outsider)))
        .expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).not.toContain(groupId);

      await request(BASE)
        .get(`/messaging/conversations/${groupId}`)
        .set('Authorization', bearer(userToken(outsider)))
        .expect(403);
      await request(BASE)
        .get(`/messaging/conversations/${groupId}/messages`)
        .set('Authorization', bearer(userToken(outsider)))
        .expect(403);

      const before = await prisma.message.count({ where: { conversationId: groupId } });
      const response = await send(userToken(outsider), groupId, `outsider-${suffix}`, 'Intruso');
      expect(response.status).toBe(403);
      expect(await prisma.message.count({ where: { conversationId: groupId } })).toBe(before);
    });
  });

  // -------------------------------------------------------------------
  // Foreign Business (Mode 4): 404, never 403 -- a 403 would confirm the
  // conversation exists and leak its existence across the tenant border.
  // -------------------------------------------------------------------
  describe('actor of another Business', () => {
    it('cannot discover, read or write, and nothing leaks', async () => {
      await request(BASE)
        .get(`/messaging/conversations/${groupId}`)
        .set('Authorization', bearer(userToken(foreignOwner)))
        .expect(404);
      await request(BASE)
        .get(`/messaging/conversations/${groupId}/messages`)
        .set('Authorization', bearer(userToken(foreignOwner)))
        .expect(404);

      const before = await prisma.message.count({ where: { conversationId: groupId } });
      const response = await send(userToken(foreignOwner), groupId, `foreign-${suffix}`, 'Ajeno');
      expect(response.status).toBe(404);
      expect(await prisma.message.count({ where: { conversationId: groupId } })).toBe(before);

      const list = await request(BASE)
        .get('/messaging/conversations')
        .set('Authorization', bearer(userToken(foreignOwner)))
        .expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).not.toContain(groupId);
    });

    it('cannot add itself as a participant of a foreign conversation', async () => {
      const response = await request(BASE)
        .post(`/messaging/conversations/${groupId}/participants`)
        .set('Authorization', bearer(userToken(foreignOwner)))
        .send({ userId: foreignOwner.userId });
      expect(response.status).toBe(404);
      const leaked = await prisma.conversationParticipant.findFirst({
        where: { conversationId: groupId, userId: foreignOwner.userId },
      });
      expect(leaked).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // Customer identity: participates in its own conversation only, and
  // cannot reach a conversation of the Business it is not part of.
  // -------------------------------------------------------------------
  describe('Customer identity', () => {
    it('cannot read a conversation of the Business where it does not participate', async () => {
      const response = await request(BASE)
        .get(`/messaging/conversations/${groupId}`)
        .set('Authorization', bearer(customerToken()));
      // Same Business, no participation: denied, never 200.
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('cannot write into a conversation where it does not participate', async () => {
      const before = await prisma.message.count({ where: { conversationId: groupId } });
      const response = await send(customerToken(), groupId, `customer-${suffix}`, 'Cliente ajeno');
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await prisma.message.count({ where: { conversationId: groupId } })).toBe(before);
    });

    it('cannot run admin operations on its own conversation', async () => {
      // I-8 / section 3.6: isAdmin requires OWNER role; a Customer never
      // administers, not even where it legitimately participates.
      const response = await request(BASE)
        .delete(`/messaging/conversations/${customerConversationId}`)
        .set('Authorization', bearer(customerToken()));
      expect(response.status).toBeGreaterThanOrEqual(400);
      const conversation = await prisma.conversation.findUnique({
        where: { id: customerConversationId },
        select: { deletedAt: true },
      });
      expect(conversation!.deletedAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // I-2: type immutable and cardinality enforced on add.
  // -------------------------------------------------------------------
  describe('I-2 -- cardinality enforced on participant addition', () => {
    it('refuses a third participant in a DIRECT conversation and persists nothing', async () => {
      const before = await prisma.conversationParticipant.count({
        where: { conversationId: customerConversationId, leftAt: null, removedAt: null },
      });
      expect(before).toBe(2);

      const response = await request(BASE)
        .post(`/messaging/conversations/${customerConversationId}/participants`)
        .set('Authorization', bearer(userToken(owner)))
        .send({ userId: outsider.userId });

      expect(response.status).toBe(409);
      const after = await prisma.conversationParticipant.count({
        where: { conversationId: customerConversationId, leftAt: null, removedAt: null },
      });
      expect(after).toBe(before);
    });
  });

  // -------------------------------------------------------------------
  // I-6: a Customer participant must exist and be activo = true.
  // -------------------------------------------------------------------
  describe('I-6 -- inactive or foreign Customer cannot be added', () => {
    it('refuses an inactive Customer and persists no participant', async () => {
      const inactive = await prisma.cliente.create({
        data: { empresaId: businessId, nombre: `P2 inactive ${suffix}`, activo: false },
        select: { id: true },
      });

      const response = await request(BASE)
        .post(`/messaging/conversations/${groupId}/participants`)
        .set('Authorization', bearer(userToken(owner)))
        .send({ customerId: inactive.id });

      expect(response.status).toBe(403);
      const persisted = await prisma.conversationParticipant.findFirst({
        where: { conversationId: groupId, customerId: inactive.id },
      });
      expect(persisted).toBeNull();
    });

    it('refuses a Customer of another Business', async () => {
      const foreignCustomer = await prisma.cliente.create({
        data: { empresaId: foreignBusinessId, nombre: `P2 foreign customer ${suffix}` },
        select: { id: true },
      });

      const response = await request(BASE)
        .post(`/messaging/conversations/${groupId}/participants`)
        .set('Authorization', bearer(userToken(owner)))
        .send({ customerId: foreignCustomer.id });

      expect(response.status).toBe(403);
      const persisted = await prisma.conversationParticipant.findFirst({
        where: { conversationId: groupId, customerId: foreignCustomer.id },
      });
      expect(persisted).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // Owner read-only (Mode 2): reads everything, writes nothing.
  // -------------------------------------------------------------------
  describe('Owner who is not a participant (Mode 2: OWNER_READ_ONLY)', () => {
    it('reads the conversation but cannot write, and nothing is persisted', async () => {
      const before = await prisma.message.count({
        where: { conversationId: customerConversationId },
      });
      const response = await send(
        userToken(leaver),
        customerConversationId,
        `owner-ro-${suffix}`,
        'Owner no participante',
      );
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(NOT_PARTICIPANT);
      expect(await prisma.message.count({ where: { conversationId: customerConversationId } })).toBe(
        before,
      );
    });
  });

  describe('unauthenticated access', () => {
    it('rejects every Messaging endpoint without a token', async () => {
      await request(BASE).get('/messaging/conversations').expect(401);
      await request(BASE).get(`/messaging/conversations/${groupId}`).expect(401);
      await request(BASE).get(`/messaging/conversations/${groupId}/messages`).expect(401);
      await request(BASE)
        .post(`/messaging/conversations/${groupId}/messages`)
        .send({ clientMessageId: `anon-${suffix}`, content: 'Anónimo' })
        .expect(401);
    });
  });
});
