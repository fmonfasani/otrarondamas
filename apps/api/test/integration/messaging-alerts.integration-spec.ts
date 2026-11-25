import { createHmac } from 'crypto';
import type { ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import webpush from 'web-push';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';

// E3 (messaging like WhatsApp) — alerts that reach a team member with Wapsell closed: the push
// settings and browser subscriptions, and one e-mail per run of unread customer messages. Real
// API and PostgreSQL; no e-mail provider is set, so nothing leaves the machine (the e-mail mark
// in the database is what is checked). Push delivery itself (web-push only speaks https) is
// covered by messaging-alerts.service.spec.ts.
describe('E3 messaging alerts (compiled stack + real PostgreSQL)', () => {
  const PORT = '3396';
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
  const sockets: Socket[] = [];

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sign = (payload: Record<string, unknown>) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const body = b64url({ ...payload, mfa: true, exp: Math.floor(Date.now() / 1000) + 3600 });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  };
  const ownerToken = () =>
    sign({
      sub: owner.legacyId,
      email: `e3-owner-${suffix}@example.test`,
      nombre: 'E3 owner',
      empresaId: businessId,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });
  const customerToken = () =>
    sign({
      sub: customerId,
      email: `e3-customer-${suffix}@example.test`,
      nombre: 'E3 customer',
      empresaId: businessId,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'cliente',
    });
  const bearer = (token: string) => `Bearer ${token}`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async <T>(read: () => Promise<T>, ok: (value: T) => boolean, ms = 5000) => {
    const end = Date.now() + ms;
    let value = await read();
    while (!ok(value) && Date.now() < end) {
      await pause(100);
      value = await read();
    }
    return value;
  };

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

  const connectSocket = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(`${BASE}/messaging`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const customerWrites = (text: string) =>
    request(BASE)
      .post(`/${slug}/tienda/chat/mensajes`)
      .set('Authorization', bearer(customerToken()))
      .send({ clientMessageId: `${text}-${Date.now()}`, content: text })
      .expect(201);

  const readState = () =>
    prisma.conversationReadState.findFirst({
      where: { businessId, ConversationParticipant: { userId: owner.userId } },
    });

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET es requerido');
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    slug = `e3-alerts-${suffix}`;

    const business = await prisma.empresa.create({
      data: { nombre: `E3 Avisos ${suffix}`, slug, configuracion: {} },
      select: { id: true },
    });
    businessId = business.id;
    const legacy = await prisma.usuario.create({
      data: {
        empresaId: businessId,
        nombre: 'E3 owner',
        email: `e3-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `e3-owner-c-${suffix}@example.test`,
        nombre: 'E3 owner',
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
        data: { empresaId: businessId, nombre: `E3 cliente ${suffix}` },
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
        // Nothing leaves the machine.
        RESEND_API_KEY: '',
        SENDGRID_API_KEY: '',
        AWS_REGION: '',
      },
      ['ignore', 'pipe', 'pipe'],
    );
    server.stdout?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    server.stderr?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    await waitPort(Number(PORT));

    const created = await request(BASE)
      .post('/messaging/conversations')
      .set('Authorization', bearer(ownerToken()))
      .send({ type: 'DIRECT', participantCustomerIds: [customerId] })
      .expect(201);
    conversationId = created.body.id;
  }, 120000);

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
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

  it('tells the browser whether push is on and the key to subscribe with', async () => {
    const settings = await request(BASE)
      .get('/messaging/conversations/push')
      .set('Authorization', bearer(ownerToken()))
      .expect(200);
    expect(settings.body).toEqual({ enabled: true, publicKey: vapid.publicKey });
  });

  it('saves a browser subscription (https only), once per browser, and customers cannot', async () => {
    const subscription = {
      endpoint: `https://push.example.test/${suffix}`,
      keys: { p256dh: vapid.publicKey, auth: 'c2VjcmV0LWF1dGgtMTY' },
    };
    const subscribe = () =>
      request(BASE)
        .post('/messaging/conversations/push/subscriptions')
        .set('Authorization', bearer(ownerToken()))
        .send(subscription);
    await subscribe().expect(204);
    await subscribe().expect(204);
    expect(await prisma.pushSubscription.count({ where: { businessId } })).toBe(1);

    await request(BASE)
      .post('/messaging/conversations/push/subscriptions')
      .set('Authorization', bearer(ownerToken()))
      .send({ ...subscription, endpoint: 'http://insecure.example.test/x' })
      .expect(400);
    await request(BASE)
      .post('/messaging/conversations/push/subscriptions')
      .set('Authorization', bearer(customerToken()))
      .send(subscription)
      .expect(403);

    await request(BASE)
      .delete('/messaging/conversations/push/subscriptions')
      .set('Authorization', bearer(ownerToken()))
      .send({ endpoint: subscription.endpoint })
      .expect(204);
    expect(await prisma.pushSubscription.count({ where: { businessId } })).toBe(0);
  });

  it('marks one e-mail per run of unread customer messages, and a new one only after reading', async () => {
    await customerWrites('hola, ¿tienen talle 40?');
    // Due right away (MESSAGE_ALERT_AFTER_MS=0); the owner has no screen open.
    const first = await until(readState, (state) => Boolean(state?.lastAlertedAt));
    expect(first?.lastAlertedAt).toBeTruthy();

    await pause(1000); // several passes of the check
    const still = await readState();
    expect(still?.lastAlertedAt).toEqual(first?.lastAlertedAt);

    // More messages in the same unread run: no new e-mail.
    await customerWrites('¿hola?');
    await pause(800);
    expect((await readState())?.lastAlertedAt).toEqual(first?.lastAlertedAt);

    // The owner reads; a new message starts a new run → a new e-mail.
    const messages = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', bearer(ownerToken()))
      .expect(200);
    const newest = messages.body[messages.body.length - 1];
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages/${newest.id}/read`)
      .set('Authorization', bearer(ownerToken()))
      .expect(201);
    await customerWrites('te escribo de nuevo');
    const second = await until(readState, (state) =>
      Boolean(
        state?.lastAlertedAt && first?.lastAlertedAt && state.lastAlertedAt > first.lastAlertedAt,
      ),
    );
    expect(second?.lastAlertedAt?.getTime()).toBeGreaterThan(first!.lastAlertedAt!.getTime());
  });

  it('does not e-mail someone who has Wapsell open', async () => {
    await connectSocket(ownerToken());
    await pause(300);
    const before = (await readState())?.lastAlertedAt;
    const messages = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', bearer(ownerToken()))
      .expect(200);
    await request(BASE)
      .post(
        `/messaging/conversations/${conversationId}/messages/${messages.body[messages.body.length - 1].id}/read`,
      )
      .set('Authorization', bearer(ownerToken()))
      .expect(201);
    await customerWrites('estás conectado');
    await pause(1200);
    expect((await readState())?.lastAlertedAt).toEqual(before);
  });
});
