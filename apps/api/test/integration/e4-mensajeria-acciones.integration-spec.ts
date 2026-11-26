import { createHmac } from 'crypto';
import type { ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';

// E4 (messaging like WhatsApp): reply quoting, edit for 15 minutes, «Se eliminó este mensaje»
// (2 days), one reaction per person from the team or the customer, ⭐ starred, search and
// «Reenviar». Real API and PostgreSQL.
describe('E4 — acciones sobre mensajes (compiled stack + real PostgreSQL)', () => {
  const PORT = '3397';
  const BASE = `http://127.0.0.1:${PORT}`;

  let server: ChildProcess;
  let serverOutput = '';
  let prisma: PrismaService;
  let suffix: number;
  let businessId: string;
  let slug: string;
  let owner: { legacyId: string; userId: string };
  const customers: string[] = [];
  let conversationId: string;
  let ownerMessageId: string;
  let sends = 0;

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
    `Bearer ${sign({ sub: owner.legacyId, email: `e4-owner-${suffix}@example.test`, nombre: 'E4 owner', empresaId: businessId, permisos: [], rol: 'OWNER', estadoLegajo: 'APROBADO', type: 'usuario' })}`;
  const customerAuth = (index = 0) =>
    `Bearer ${sign({ sub: customers[index], email: `e4-customer-${index}-${suffix}@example.test`, nombre: 'E4 customer', empresaId: businessId, permisos: [], rol: 'OWNER', estadoLegajo: 'APROBADO', type: 'cliente' })}`;

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

  const customerChat = async (index = 0) =>
    (await request(BASE).get(`/${slug}/tienda/chat`).set('Authorization', customerAuth(index)))
      .body as {
      conversationId: string;
      messages: Array<Record<string, any>>;
    };
  const ownerMessages = async (id = conversationId) =>
    (
      await request(BASE)
        .get(`/messaging/conversations/${id}/messages`)
        .set('Authorization', ownerAuth())
        .expect(200)
    ).body as Array<Record<string, any>>;
  const customerSays = async (content: string, index = 0, extra: Record<string, unknown> = {}) =>
    (
      await request(BASE)
        .post(`/${slug}/tienda/chat/mensajes`)
        .set('Authorization', customerAuth(index))
        // Like the real screen: the retry key says nothing about the text.
        .send({ clientMessageId: `c-${index}-${(sends += 1)}-${suffix}`, content, ...extra })
        .expect(201)
    ).body as { conversationId: string; message: { id: string } };

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET es requerido');
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    slug = `e4-acciones-${suffix}`;
    businessId = (
      await prisma.empresa.create({
        data: { nombre: `E4 Acciones ${suffix}`, slug, configuracion: {} },
        select: { id: true },
      })
    ).id;
    const legacy = await prisma.usuario.create({
      data: {
        empresaId: businessId,
        nombre: 'E4 owner',
        email: `e4-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `e4-owner-c-${suffix}@example.test`,
        nombre: 'E4 owner',
        usuarioId: legacy.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId, role: 'OWNER', status: 'ACTIVE' },
    });
    owner = { legacyId: legacy.id, userId: user.id };
    for (const index of [0, 1]) {
      customers.push(
        (
          await prisma.cliente.create({
            data: {
              empresaId: businessId,
              nombre: `E4 cliente ${index}`,
              email: `e4-customer-${index}-${suffix}@example.test`,
            },
            select: { id: true },
          })
        ).id,
      );
    }

    server = spawnApi({ PORT, RESEND_API_KEY: '', SENDGRID_API_KEY: '', AWS_REGION: '' }, [
      'ignore',
      'pipe',
      'pipe',
    ]);
    server.stdout?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    server.stderr?.on('data', (c: Buffer) => (serverOutput = `${serverOutput}${c}`.slice(-6000)));
    await waitPort(Number(PORT));

    conversationId = (await customerSays('hola')).conversationId;
    ownerMessageId = (
      await request(BASE)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', ownerAuth())
        .send({ clientMessageId: `o-1-${suffix}`, content: 'Tenemos talle 40' })
        .expect(201)
    ).body.id;
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
      await prisma.messageStar.deleteMany({ where });
      await prisma.reaction.deleteMany({ where });
      await prisma.conversationReadState.deleteMany({ where });
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

  it('the customer answers quoting the store’s message', async () => {
    await customerSays('¿y en negro?', 0, { replyToMessageId: ownerMessageId });
    const reply = (await customerChat()).messages.find((m) => m.content === '¿y en negro?');
    expect(reply?.respuesta).toEqual({
      id: ownerMessageId,
      mia: false,
      tipo: 'texto',
      texto: 'Tenemos talle 40',
    });
    const seen = (await ownerMessages()).find((m) => m.content === '¿y en negro?');
    expect(seen?.respuesta).toMatchObject({ id: ownerMessageId, mia: true });
  });

  it('one reaction per person, from the customer too; another emoji replaces it', async () => {
    const react = (emoji: string) =>
      request(BASE)
        .put(`/${slug}/tienda/chat/mensajes/${ownerMessageId}/reaccion`)
        .set('Authorization', customerAuth())
        .send({ emoji })
        .expect(200);
    await react('❤️');
    await react('👍');
    expect(await prisma.reaction.count({ where: { messageId: ownerMessageId } })).toBe(1);

    const forOwner = (await ownerMessages()).find((m) => m.id === ownerMessageId);
    expect(forOwner?.reacciones).toEqual([
      {
        emoji: '👍',
        cantidad: 1,
        mia: false,
        autores: [{ userId: null, customerId: customers[0] }],
      },
    ]);
    const forCustomer = (await customerChat()).messages.find((m) => m.id === ownerMessageId);
    expect(forCustomer?.reacciones).toEqual([{ emoji: '👍', cantidad: 1, mia: true }]);

    await request(BASE)
      .put(`/${slug}/tienda/chat/mensajes/${ownerMessageId}/reaccion`)
      .set('Authorization', customerAuth())
      .send({ emoji: 'hola' })
      .expect(400);
    await request(BASE)
      .delete(`/${slug}/tienda/chat/mensajes/${ownerMessageId}/reaccion`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(await prisma.reaction.count({ where: { messageId: ownerMessageId } })).toBe(0);
  });

  it('a reaction belongs to a team member or a customer, never both', async () => {
    await expect(
      prisma.reaction.create({
        data: {
          messageId: ownerMessageId,
          businessId,
          emoji: '👍',
          userId: owner.userId,
          customerId: customers[0],
        },
      }),
    ).rejects.toThrow();
  });

  it('edits for 15 minutes', async () => {
    const mine = await customerSays('talle 38');
    await request(BASE)
      .patch(`/${slug}/tienda/chat/mensajes/${mine.message.id}`)
      .set('Authorization', customerAuth())
      .send({ content: 'talle 39' })
      .expect(200);
    const edited = (await customerChat()).messages.find((m) => m.id === mine.message.id);
    expect(edited).toMatchObject({ content: 'talle 39', editado: true });

    await prisma.message.update({
      where: { id: mine.message.id },
      data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) },
    });
    await request(BASE)
      .patch(`/${slug}/tienda/chat/mensajes/${mine.message.id}`)
      .set('Authorization', customerAuth())
      .send({ content: 'talle 41' })
      .expect(403);
  });

  it('a deleted message stays as «Se eliminó este mensaje», without what it said', async () => {
    const mine = await customerSays('mi dirección es Falsa 123');
    await customerSays('¿llegó?', 0, { replyToMessageId: mine.message.id });
    await request(BASE)
      .delete(`/${slug}/tienda/chat/mensajes/${mine.message.id}`)
      .set('Authorization', customerAuth())
      .expect(200);

    const forCustomer = (await customerChat()).messages;
    expect(forCustomer.find((m) => m.id === mine.message.id)).toMatchObject({
      eliminado: true,
      content: null,
    });
    expect(forCustomer.find((m) => m.content === '¿llegó?')?.respuesta).toEqual({
      id: mine.message.id,
      mia: true,
      tipo: 'texto',
      texto: null,
      eliminado: true,
    });
    const forOwner = (await ownerMessages()).find((m) => m.id === mine.message.id);
    expect(forOwner).toMatchObject({ eliminado: true, content: null, adjuntos: [] });
    expect(JSON.stringify(await ownerMessages())).not.toContain('Falsa 123');

    // After 2 days, «Eliminar para todos» is over.
    const old = await customerSays('viejo');
    await prisma.message.update({
      where: { id: old.message.id },
      data: { createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    await request(BASE)
      .delete(`/${slug}/tienda/chat/mensajes/${old.message.id}`)
      .set('Authorization', customerAuth())
      .expect(403);
  });

  it('⭐ is personal to the team member', async () => {
    await request(BASE)
      .put(`/messaging/conversations/${conversationId}/messages/${ownerMessageId}/star`)
      .set('Authorization', ownerAuth())
      .expect(200);
    const starred = (
      await request(BASE)
        .get('/messaging/conversations/starred')
        .set('Authorization', ownerAuth())
        .expect(200)
    ).body as Array<{ id: string }>;
    expect(starred.map((m) => m.id)).toEqual([ownerMessageId]);
    expect((await ownerMessages()).find((m) => m.id === ownerMessageId)?.destacado).toBe(true);
  });

  it('search finds the text of the chats the team member reads', async () => {
    const found = (
      await request(BASE)
        .get('/messaging/conversations/search')
        .query({ q: 'TALLE 4' })
        .set('Authorization', ownerAuth())
        .expect(200)
    ).body as Array<{ id: string; conversationId: string }>;
    expect(found.map((m) => m.id)).toContain(ownerMessageId);
    expect(found.every((m) => m.conversationId === conversationId)).toBe(true);
    const tooShort = await request(BASE)
      .get('/messaging/conversations/search')
      .query({ q: 't' })
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(tooShort.body).toEqual([]);
  });

  it('«Reenviar» copies the message to another chat, once per send', async () => {
    const other = (await customerSays('hola, otra consulta', 1)).conversationId;
    const forward = () =>
      request(BASE)
        .post(`/messaging/conversations/${conversationId}/messages/${ownerMessageId}/forward`)
        .set('Authorization', ownerAuth())
        .send({ clientMessageId: `fw-${suffix}`, conversationIds: [other] })
        .expect(201);
    await forward();
    await forward();
    const copies = (await ownerMessages(other)).filter((m) => m.content === 'Tenemos talle 40');
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ reenviado: true, authorUserId: owner.userId });
    const seenByCustomer = (await customerChat(1)).messages.find(
      (m) => m.content === 'Tenemos talle 40',
    );
    expect(seenByCustomer).toBeDefined();
  });
});
