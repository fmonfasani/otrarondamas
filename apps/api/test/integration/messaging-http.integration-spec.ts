import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// P1 — exercise the Messaging HTTP path against the compiled application and
// real PostgreSQL: list → create → history → send → persisted reread.
// No Socket.IO assertions are made here; realtime is a separate verification.
describe('P1 Messaging HTTP (compiled stack + real PostgreSQL)', () => {
  const PORT = '3394';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let serverOutput = '';
  let serverStartError: string | undefined;
  let prisma: PrismaService;
  let suffix: number;
  let company: { id: string };
  let companyB: { id: string };
  let legacyUser: { id: string };
  let legacyUserB: { id: string };
  let user: { id: string };
  let userB: { id: string };
  let customer: { id: string };
  let conversationId: string | undefined;
  let messageId: string | undefined;

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (userId: string, companyId: string) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `p1-messaging-${userId}@example.test`,
      nombre: 'P1 Messaging HTTP',
      empresaId: companyId,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  };

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        if (serverStartError || server.exitCode !== null || server.signalCode !== null) {
          reject(new Error(`Messaging API terminó antes de abrir el puerto ${port}. ${serverStartError ?? ''} ${serverOutput}`.trim()));
          return;
        }
        const socket = net.connect(port, '127.0.0.1');
        socket.once('connect', () => {
          socket.end();
          resolve();
        });
        socket.once('error', () => {
          if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta. ${serverOutput}`.trim()));
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

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET es requerido para el test HTTP');
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    company = await prisma.empresa.create({
      data: {
        nombre: `P1 Messaging HTTP ${suffix}`,
        slug: `p1-messaging-http-${suffix}`,
        configuracion: {},
      },
      select: { id: true },
    });
    legacyUser = await prisma.usuario.create({
      data: {
        empresaId: company.id,
        nombre: `P1 Messaging HTTP ${suffix}`,
        email: `p1-messaging-http-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    user = await prisma.user.create({
      data: {
        email: `p1-messaging-canonical-${suffix}@example.test`,
        nombre: 'P1 Messaging canonical user',
        usuarioId: legacyUser.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: {
        userId: user.id,
        businessId: company.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `P1 Messaging HTTP B ${suffix}`, slug: `p1-messaging-http-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    legacyUserB = await prisma.usuario.create({
      data: { empresaId: companyB.id, nombre: `P1 Messaging HTTP B ${suffix}`, email: `p1-messaging-http-b-${suffix}@example.test`, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    userB = await prisma.user.create({
      data: { email: `p1-messaging-canonical-b-${suffix}@example.test`, nombre: 'P1 Messaging canonical user B', usuarioId: legacyUserB.id },
      select: { id: true },
    });
    await prisma.membership.create({ data: { userId: userB.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' } });

    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: `P1 Messaging customer ${suffix}`,
      },
      select: { id: true },
    });

    server = spawn(process.execPath, ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout?.on('data', (chunk: Buffer) => { serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000); });
    server.stderr?.on('data', (chunk: Buffer) => { serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000); });
    server.once('error', (error) => { serverStartError = error.message; });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    await stopServer();
    if (prisma) {
      if (company?.id || companyB?.id) {
        const businessIds = [company?.id, companyB?.id].filter((id): id is string => Boolean(id));
        await prisma.messageReadReceipt.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.messagingReadPreference.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.message.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.conversationAssociation.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.conversationParticipant.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.conversation.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.cliente.deleteMany({ where: { empresaId: { in: businessIds } } });
        await prisma.membership.deleteMany({ where: { businessId: { in: businessIds } } });
        await prisma.user.deleteMany({ where: { id: { in: [user?.id, userB?.id].filter((id): id is string => Boolean(id)) } } });
        await prisma.usuario.deleteMany({ where: { id: { in: [legacyUser?.id, legacyUserB?.id].filter((id): id is string => Boolean(id)) } } });
        await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
      }
      await prisma.$disconnect();
    }
  });

  it('rejects requests without authentication', async () => {
    await request(BASE).get('/messaging/conversations').expect(401);
  });

  it('lists conversations for the active BusinessContext', async () => {
    const response = await request(BASE)
      .get('/messaging/conversations')
      .set('Authorization', `Bearer ${tokenFor(legacyUser.id, company.id)}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it('creates and opens a DIRECT conversation through the existing HTTP contract', async () => {
    const response = await request(BASE)
      .post('/messaging/conversations')
      .set('Authorization', `Bearer ${tokenFor(legacyUser.id, company.id)}`)
      .send({ type: 'DIRECT', participantCustomerIds: [customer.id] })
      .expect(201);

    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.businessId).toBe(company.id);
    conversationId = response.body.id;

    const listed = await request(BASE)
      .get('/messaging/conversations')
      .set('Authorization', `Bearer ${tokenFor(legacyUser.id, company.id)}`)
      .expect(200);
    expect(listed.body.some((row: { id: string }) => row.id === conversationId)).toBe(true);

    const opened = await request(BASE)
      .get(`/messaging/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUser.id, company.id)}`)
      .expect(200);
    expect(opened.body.id).toBe(conversationId);

    const associations = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/associations`)
      .set('Authorization', `Bearer ${tokenFor(legacyUser.id, company.id)}`)
      .expect(200);
    expect(associations.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'CUSTOMER', entityId: customer.id, active: true }),
    ]));

    const foreignAuth = `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`;
    await request(BASE).get(`/messaging/conversations/${conversationId}`).set('Authorization', foreignAuth).expect(404);
    await request(BASE).get(`/messaging/conversations/${conversationId}/associations`).set('Authorization', foreignAuth).expect(404);
  });

  it('loads an empty history, sends over HTTP, and rereads the persisted message as JSON', async () => {
    if (!conversationId) throw new Error('La conversación debe haberse creado antes');

    const auth = `Bearer ${tokenFor(legacyUser.id, company.id)}`;
    const before = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', auth)
      .expect(200);
    expect(before.body).toEqual([]);

    const content = `P1 HTTP persistido ${suffix}`;
    const sent = await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', auth)
      .send({ clientMessageId: `p1-${suffix}`, content })
      .expect(201);

    expect(sent.body.id).toEqual(expect.any(String));
    expect(sent.body.sequence).toBe('1');
    expect(sent.body.content).toBe(content);
    messageId = sent.body.id;
    expect(() => JSON.stringify(sent.body)).not.toThrow();

    const history = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', auth)
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toEqual(expect.objectContaining({
      id: messageId,
      conversationId,
      sequence: '1',
      content,
      authorUserId: user.id,
    }));
    expect(() => JSON.stringify(history.body)).not.toThrow();

    const persisted = await prisma.message.findFirst({
      where: { id: messageId, businessId: company.id },
    });
    expect(persisted).toEqual(expect.objectContaining({
      conversationId,
      authorUserId: user.id,
      authorMembershipBusinessId: company.id,
      sequence: BigInt(1),
      content,
    }));

    const reread = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', auth)
      .expect(200);
    expect(reread.body[0].id).toBe(messageId);
    expect(reread.body[0].content).toBe(content);

    await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(404);
  });
});
