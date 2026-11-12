import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { waitPort } from './helpers/store-catalog.fixture';

/**
 * STORE-V1-04 — chat of the store customer with the Business (OR-B4-031): the first message
 * opens a DIRECT conversation with the Owner; the Owner answers from Mensajes; the customer
 * only ever sees their own conversation, in their own store.
 */
describe('STORE-V1-04 — customer chat in a Business store', () => {
  const PORT = '3388';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let companyA: { id: string; slug: string };
  let companyB: { id: string; slug: string };
  let legacyOwner: { id: string };
  let owner: { id: string };
  let customer: { id: string };
  let otherCustomer: { id: string };
  let customerB: { id: string };
  let conversationId: string;

  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, companyA.id)}`;
  const ownerAuth = () =>
    `Bearer ${signStaffToken({
      sub: legacyOwner.id,
      email: `store-v1-04-owner-${suffix}@example.test`,
      nombre: 'Owner',
      empresaId: companyA.id,
      permisos: [],
    })}`;
  const chatOf = (slug: string) => `/${slug}/tienda/chat`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const company = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `STORE-V1-04 ${tag} ${suffix}`,
          slug: `store-v1-04-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    companyA = await company('a');
    companyB = await company('b');
    legacyOwner = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: `STORE-V1-04 Owner ${suffix}`,
        email: `store-v1-04-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    owner = await prisma.user.create({
      data: {
        email: `store-v1-04-owner-user-${suffix}@example.test`,
        nombre: 'STORE-V1-04 Owner',
        usuarioId: legacyOwner.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: owner.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    const newCustomer = (empresaId: string, tag: string) =>
      prisma.cliente.create({
        data: {
          empresaId,
          nombre: `Cliente ${tag}`,
          email: `store-v1-04-${tag}-${suffix}@example.test`,
        },
        select: { id: true },
      });
    customer = await newCustomer(companyA.id, 'ana');
    otherCustomer = await newCustomer(companyA.id, 'beto');
    customerB = await newCustomer(companyB.id, 'carla');
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const businessIds = [companyA.id, companyB.id];
    const scope = { where: { businessId: { in: businessIds } } };
    await prisma.messageReadReceipt.deleteMany(scope);
    await prisma.message.deleteMany(scope);
    await prisma.conversationAssociation.deleteMany(scope);
    await prisma.conversationParticipant.deleteMany(scope);
    await prisma.conversation.deleteMany(scope);
    await prisma.membership.deleteMany(scope);
    await prisma.user.deleteMany({ where: { id: owner.id } });
    await prisma.usuario.deleteMany({ where: { id: legacyOwner.id } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: businessIds } } });
    await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
    await prisma.$disconnect();
  });

  it('starts with no conversation', async () => {
    const res = await request(BASE)
      .get(chatOf(companyA.slug))
      .set('Authorization', customerAuth())
      .expect(200);
    expect(res.body).toEqual({ conversationId: null, messages: [] });
  });

  it('opens a DIRECT conversation with the Owner on the first message', async () => {
    const res = await request(BASE)
      .post(`${chatOf(companyA.slug)}/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'c-1', content: '¿Tienen envío a domicilio?' })
      .expect(201);
    conversationId = res.body.conversationId;
    expect(res.body.message).toMatchObject({ content: '¿Tienen envío a domicilio?', mine: true });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { ConversationParticipant: true, ConversationAssociation: true },
    });
    expect(conversation?.type).toBe('DIRECT');
    expect(conversation?.businessId).toBe(companyA.id);
    const participants = conversation?.ConversationParticipant ?? [];
    expect(participants).toHaveLength(2);
    expect(participants.find((p) => p.userId === owner.id)?.isAdmin).toBe(true);
    expect(participants.find((p) => p.customerId === customer.id)?.isAdmin).toBe(false);
    expect(conversation?.ConversationAssociation).toEqual([
      expect.objectContaining({ entityType: 'CUSTOMER', entityId: customer.id, active: true }),
    ]);
  });

  it('lets the Owner read and answer it from Mensajes', async () => {
    const listed = await request(BASE)
      .get('/messaging/conversations')
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(listed.body.map((c: { id: string }) => c.id)).toContain(conversationId);
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', ownerAuth())
      .send({ clientMessageId: 'o-1', content: 'Sí, en el día.' })
      .expect(201);
  });

  it('shows the customer both messages without staff identities', async () => {
    const res = await request(BASE)
      .get(chatOf(companyA.slug))
      .set('Authorization', customerAuth())
      .expect(200);
    expect(res.body.conversationId).toBe(conversationId);
    expect(
      res.body.messages.map((m: { content: string; mine: boolean }) => [m.content, m.mine]),
    ).toEqual([
      ['¿Tienen envío a domicilio?', true],
      ['Sí, en el día.', false],
    ]);
    for (const message of res.body.messages) {
      expect(Object.keys(message).sort()).toEqual([
        'clientMessageId',
        'content',
        'createdAt',
        'id',
        'mine',
      ]);
    }
  });

  it('keeps writing in the same conversation, and a retry does not duplicate', async () => {
    const send = () =>
      request(BASE)
        .post(`${chatOf(companyA.slug)}/mensajes`)
        .set('Authorization', customerAuth())
        .send({ clientMessageId: 'c-2', content: 'Perfecto, gracias' })
        .expect(201);
    const first = await send();
    const retry = await send();
    expect(first.body.conversationId).toBe(conversationId);
    expect(retry.body.message.id).toBe(first.body.message.id);
    expect(await prisma.conversation.count({ where: { businessId: companyA.id } })).toBe(1);
  });

  it('never shows another customer of the same store this conversation', async () => {
    const res = await request(BASE)
      .get(chatOf(companyA.slug))
      .set('Authorization', `Bearer ${signCustomerToken(otherCustomer.id, companyA.id)}`)
      .expect(200);
    expect(res.body).toEqual({ conversationId: null, messages: [] });
  });

  it('refuses the account in another store, staff tokens and no session', async () => {
    await request(BASE).get(chatOf(companyB.slug)).set('Authorization', customerAuth()).expect(403);
    await request(BASE)
      .post(`${chatOf(companyB.slug)}/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'x', content: 'hola' })
      .expect(403);
    await request(BASE).get(chatOf(companyA.slug)).set('Authorization', ownerAuth()).expect(403);
    await request(BASE).get(chatOf(companyA.slug)).expect(401);
  });

  it('says the store cannot take messages yet when it has no Owner', async () => {
    const res = await request(BASE)
      .post(`${chatOf(companyB.slug)}/mensajes`)
      .set('Authorization', `Bearer ${signCustomerToken(customerB.id, companyB.id)}`)
      .send({ clientMessageId: 'b-1', content: 'hola' });
    expect(res.status).toBe(409);
    expect(await prisma.conversation.count({ where: { businessId: companyB.id } })).toBe(0);
  });
});
