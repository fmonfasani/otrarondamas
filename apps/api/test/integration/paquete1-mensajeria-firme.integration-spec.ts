import { createHmac, randomBytes } from 'crypto';
import type { ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import webpush from 'web-push';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';

// Paquete 1 «mensajería firme»: the anti-spam brake (S1), push only to real push services (S2),
// system notices nobody can edit (S3), the customer's alerts (F1) and chats loaded by pages (F2).
// Real API and PostgreSQL; no e-mail provider, so nothing leaves the machine.
describe('Paquete 1 — mensajería firme (compiled stack + real PostgreSQL)', () => {
  const PORT = '3398';
  const BASE = `http://127.0.0.1:${PORT}`;
  const vapid = webpush.generateVAPIDKeys();

  let server: ChildProcess;
  let serverOutput = '';
  let prisma: PrismaService;
  let suffix: number;
  let businessId: string;
  let slug: string;
  let owner: { legacyId: string; userId: string };
  let customerId: string;
  let conversationId: string;

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sign = (payload: Record<string, unknown>) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const body = b64url({ ...payload, mfa: true, exp: Math.floor(Date.now() / 1000) + 3600 });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  };
  const ownerAuth = () =>
    `Bearer ${sign({ sub: owner.legacyId, email: `p1-owner-${suffix}@example.test`, nombre: 'P1 owner', empresaId: businessId, permisos: [], rol: 'OWNER', estadoLegajo: 'APROBADO', type: 'usuario' })}`;
  const customerAuth = () =>
    `Bearer ${sign({ sub: customerId, email: `p1-customer-${suffix}@example.test`, nombre: 'P1 customer', empresaId: businessId, permisos: [], rol: 'OWNER', estadoLegajo: 'APROBADO', type: 'cliente' })}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        if (server.exitCode !== null) return reject(new Error(`API terminó. ${serverOutput}`));
        const socket = net.connect(port, '127.0.0.1');
        socket.once('connect', () => {
          socket.end();
          resolve();
        });
        socket.once('error', () => {
          if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta. ${serverOutput}`));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  const customerReadState = () =>
    prisma.conversationReadState.findFirst({
      where: { businessId, ConversationParticipant: { customerId } },
    });

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET es requerido');
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    slug = `p1-firme-${suffix}`;
    businessId = (
      await prisma.empresa.create({
        data: { nombre: `P1 Firme ${suffix}`, slug, configuracion: {} },
        select: { id: true },
      })
    ).id;
    const legacy = await prisma.usuario.create({
      data: {
        empresaId: businessId,
        nombre: 'P1 owner',
        email: `p1-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `p1-owner-c-${suffix}@example.test`,
        nombre: 'P1 owner',
        usuarioId: legacy.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId, role: 'OWNER', status: 'ACTIVE' },
    });
    owner = { legacyId: legacy.id, userId: user.id };
    customerId = (
      await prisma.cliente.create({
        data: {
          empresaId: businessId,
          nombre: 'P1 cliente',
          email: `p1-customer-${suffix}@example.test`,
        },
        select: { id: true },
      })
    ).id;

    server = spawnApi(
      {
        PORT,
        PRESENCE_GRACE_MS: '200',
        MESSAGE_ALERT_AFTER_MS: '0',
        MESSAGE_ALERT_EVERY_MS: '300',
        VAPID_PUBLIC_KEY: vapid.publicKey,
        VAPID_PRIVATE_KEY: vapid.privateKey,
        RESEND_API_KEY: '',
        SENDGRID_API_KEY: '',
        AWS_REGION: '',
      },
      ['ignore', 'pipe', 'pipe'],
    );
    server.stdout?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    server.stderr?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    await waitPort(Number(PORT));

    // The customer opens the chat with the store.
    const first = await request(BASE)
      .post(`/${slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: `c-0-${suffix}`, content: 'hola' })
      .expect(201);
    conversationId =
      first.body.conversationId ??
      (await request(BASE).get(`/${slug}/tienda/chat`).set('Authorization', customerAuth())).body
        .conversationId;
  }, 120000);

  afterAll(async () => {
    if (server && server.exitCode === null) {
      await new Promise<void>((resolve) => {
        server.once('exit', () => resolve());
        server.kill('SIGTERM');
        setTimeout(() => server.kill('SIGKILL'), 5000).unref();
      });
    }
    if (prisma && businessId) {
      const where = { businessId };
      await prisma.pushSubscription.deleteMany({ where });
      await prisma.messageReadReceipt.deleteMany({ where });
      await prisma.attachment.deleteMany({ where });
      await prisma.message.deleteMany({ where });
      await prisma.conversationAssociation.deleteMany({ where });
      await prisma.conversationParticipant.deleteMany({ where });
      await prisma.conversation.deleteMany({ where });
      await prisma.cliente.deleteMany({ where: { empresaId: businessId } });
      await prisma.membership.deleteMany({ where });
      await prisma.user.deleteMany({ where: { id: owner?.userId } });
      await prisma.usuario.deleteMany({ where: { id: owner?.legacyId } });
      await prisma.empresa.deleteMany({ where: { id: businessId } });
    }
    await prisma?.$disconnect();
  });

  it('F1 — the store’s answer e-mails the customer once, when they are away', async () => {
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', ownerAuth())
      .send({ clientMessageId: `o-1-${suffix}`, content: 'Sí, tenemos talle 40' })
      .expect(201);
    const end = Date.now() + 5000;
    let state = await customerReadState();
    while (!state?.lastAlertedAt && Date.now() < end) {
      await pause(100);
      state = await customerReadState();
    }
    expect(state?.lastAlertedAt).toBeTruthy();
    const first = state?.lastAlertedAt;
    await pause(900);
    expect((await customerReadState())?.lastAlertedAt).toEqual(first);
  });

  it('F1 + S2 — a customer’s browser subscribes to push, only through a real push service', async () => {
    const subscription = {
      endpoint: `https://fcm.googleapis.com/fcm/send/p1-${suffix}`,
      keys: { p256dh: vapid.publicKey, auth: 'c2VjcmV0LWF1dGgtMTY' },
    };
    const settings = await request(BASE)
      .get(`/${slug}/tienda/chat/avisos`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(settings.body).toEqual({ enabled: true, publicKey: vapid.publicKey });

    await request(BASE)
      .post(`/${slug}/tienda/chat/avisos`)
      .set('Authorization', customerAuth())
      .send(subscription)
      .expect(204);
    const saved = await prisma.pushSubscription.findFirst({ where: { businessId } });
    expect(saved).toMatchObject({ customerId, userId: null });

    // Anywhere else (an internal address, say) is refused — for the team as well.
    for (const endpoint of ['https://10.0.0.5/push', 'https://wapsell-api:3000/x']) {
      await request(BASE)
        .post(`/${slug}/tienda/chat/avisos`)
        .set('Authorization', customerAuth())
        .send({ ...subscription, endpoint })
        .expect(400);
      await request(BASE)
        .post('/messaging/conversations/push/subscriptions')
        .set('Authorization', ownerAuth())
        .send({ ...subscription, endpoint })
        .expect(400);
    }
    // The team cannot use the customer's door.
    await request(BASE)
      .post(`/${slug}/tienda/chat/avisos`)
      .set('Authorization', ownerAuth())
      .send(subscription)
      .expect(403);

    await request(BASE)
      .delete(`/${slug}/tienda/chat/avisos`)
      .set('Authorization', customerAuth())
      .send({ endpoint: subscription.endpoint })
      .expect(204);
    expect(await prisma.pushSubscription.count({ where: { businessId } })).toBe(0);
  });

  it('S3 — what the system posted cannot be edited or deleted by anyone', async () => {
    const last = await prisma.message.findFirstOrThrow({
      where: { conversationId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const notice = await prisma.message.create({
      data: {
        conversationId,
        businessId,
        authorUserId: owner.userId,
        sequence: last.sequence + BigInt(1),
        clientMessageId: `pedido-x-${suffix}-CONFIRMADO`,
        type: 'SYSTEM',
        content: 'Confirmamos tu pedido N° 1.',
      },
    });
    await request(BASE)
      .patch(`/messaging/conversations/${conversationId}/messages/${notice.id}`)
      .set('Authorization', ownerAuth())
      .send({ content: 'otra cosa' })
      .expect(403);
    await request(BASE)
      .delete(`/messaging/conversations/${conversationId}/messages/${notice.id}`)
      .set('Authorization', ownerAuth())
      .expect(403);
    const chat = await request(BASE)
      .get(`/${slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(chat.body.messages.find((m: { id: string }) => m.id === notice.id)).toMatchObject({
      aviso: true,
      content: 'Confirmamos tu pedido N° 1.',
    });
  });

  it('F2 — a long chat loads its newest 50 messages, and older ones on request', async () => {
    const last = await prisma.message.findFirstOrThrow({
      where: { conversationId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    await prisma.message.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({
        conversationId,
        businessId,
        authorCustomerId: customerId,
        sequence: last.sequence + BigInt(i + 1),
        clientMessageId: `bulk-${suffix}-${i}`,
        type: 'TEXT' as const,
        content: `mensaje ${i}`,
      })),
    });
    const total = await prisma.message.count({ where: { conversationId, deletedAt: null } });

    const page = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(page.body).toHaveLength(50);
    expect(page.body[49].content).toBe('mensaje 59');
    const older = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages?antes=${page.body[0].sequence}`)
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(older.body).toHaveLength(total - 50);
    expect(BigInt(older.body[older.body.length - 1].sequence)).toBeLessThan(
      BigInt(page.body[0].sequence),
    );
    await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages?antes=1;DROP`)
      .set('Authorization', ownerAuth())
      .expect(400);

    const chat = await request(BASE)
      .get(`/${slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(chat.body.messages).toHaveLength(50);
    expect(chat.body.hayMas).toBe(true);
  });

  it('S1 — a flood of messages is braked (429 with Retry-After), and the next person is not', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      const res = await request(BASE)
        .post(`/${slug}/tienda/chat/mensajes`)
        .set('Authorization', customerAuth())
        .send({ clientMessageId: `flood-${suffix}-${i}`, content: `spam ${i}` });
      statuses.push(res.status);
      if (res.status === 429) {
        expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
        expect(res.body.message).toContain('Vas muy rápido');
      }
    }
    // Earlier tests already sent one; the brake allows 30 a minute.
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
    expect(statuses.slice(0, 29).every((s) => s === 201)).toBe(true);
    // The store keeps answering.
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', ownerAuth())
      .send({ clientMessageId: `o-2-${suffix}`, content: 'seguimos' })
      .expect(201);
  });

  it('S1 — guessing a customer’s password is braked per account', async () => {
    const attempt = (email: string) =>
      request(BASE)
        .post(`/auth/cliente/negocio/${slug}/login`)
        // A random wrong password each run (never a fixed one in the code).
        .send({ email, password: randomBytes(12).toString('base64url') });
    const target = `p1-victima-${suffix}@example.test`;
    const statuses: number[] = [];
    for (let i = 0; i < 9; i += 1) statuses.push((await attempt(target)).status);
    expect(statuses.slice(0, 8).every((s) => s === 401 || s === 400)).toBe(true);
    expect(statuses[8]).toBe(429);
    // Another account is not affected.
    expect((await attempt(`p1-otra-${suffix}@example.test`)).status).not.toBe(429);
  });
});
