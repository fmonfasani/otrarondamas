import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { createStoreProduct, waitPort } from './helpers/store-catalog.fixture';

/**
 * OR-B4-037 — selling in the conversation: the team shares a catalogue product as a card
 * (the customer sees it in the store chat) and loads products into the customer's cart
 * (Owner, Admin, Vendedor), which «Crear pedido» then orders.
 */
describe('P13-1 — productos y carrito en la conversación', () => {
  const PORT = '3378';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let other: { id: string; slug: string };
  const staff: Record<string, { usuarioId: string; userId: string; auth: string }> = {};
  let customer: { id: string };
  let product: { id: string; nombre: string };
  let foreignProduct: { id: string; nombre: string };
  let conversationId: string;

  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, company.id)}`;

  async function person(role: 'OWNER' | 'VENDEDOR' | 'GESTOR_DE_STOCK', key: string) {
    const email = `p13-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: key, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role, status: 'ACTIVE' },
    });
    staff[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company.id, permisos: [] })}`,
    };
  }

  const share = (auth: string, productoId: string, clientMessageId: string) =>
    request(BASE)
      .post(`/messaging/conversations/${conversationId}/products`)
      .set('Authorization', auth)
      .send({ clientMessageId, productoId });
  const setItem = (auth: string, productoId: string, cantidad: number) =>
    request(BASE)
      .put(`/messaging/conversations/${conversationId}/cart/items`)
      .set('Authorization', auth)
      .send({ productoId, cantidad });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const newCompany = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P13-1 ${tag} ${suffix}`,
          slug: `p13-1-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    company = await newCompany('a');
    other = await newCompany('b');
    await person('OWNER', 'owner');
    await person('VENDEDOR', 'vendedor');
    await person('GESTOR_DE_STOCK', 'gestor');
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente Chat',
        email: `p13-1-cliente-${suffix}@example.test`,
      },
      select: { id: true },
    });
    product = await createStoreProduct(prisma, company.id, 'P13-1', 'A', suffix);
    foreignProduct = await createStoreProduct(prisma, other.id, 'P13-1', 'B', suffix);
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));

    // The team attends the customer in a group (as from Clientes): Owner, Vendedor, Gestor.
    const created = await request(BASE)
      .post('/messaging/conversations')
      .set('Authorization', staff.owner.auth)
      .send({
        type: 'GROUP',
        participantUserIds: [staff.vendedor.userId, staff.gestor.userId],
        participantCustomerIds: [customer.id],
      })
      .expect(201);
    conversationId = created.body.id;
    // Starting it with a Customer already associates it (P2).
    await request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'c-1', content: '¿Qué gaseosas tienen?' })
      .then((r) => {
        if (r.status !== 201)
          throw new Error(`customer post ${r.status} ${JSON.stringify(r.body)}`);
      });
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const ids = [company.id, other.id];
    const scope = { where: { businessId: { in: ids } } };
    const empresaScope = { where: { empresaId: { in: ids } } };
    await prisma.attachment.deleteMany({ where: { Message: { businessId: { in: ids } } } });
    await prisma.messageReadReceipt.deleteMany(scope);
    await prisma.message.deleteMany(scope);
    await prisma.conversationAssociation.deleteMany(scope);
    await prisma.conversationParticipant.deleteMany(scope);
    await prisma.conversation.deleteMany(scope);
    await prisma.cartItem.deleteMany({ where: { Cart: { businessId: { in: ids } } } });
    await prisma.cart.deleteMany(scope);
    await prisma.membership.deleteMany(scope);
    const usuarioIds = Object.values(staff).map((s) => s.usuarioId);
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await prisma.cliente.deleteMany(empresaScope);
    await prisma.movimientoStock.deleteMany(empresaScope);
    await prisma.lote.deleteMany(empresaScope);
    await prisma.producto.deleteMany(empresaScope);
    await prisma.subtipo.deleteMany(empresaScope);
    await prisma.tipo.deleteMany(empresaScope);
    await prisma.subfamilia.deleteMany(empresaScope);
    await prisma.familia.deleteMany(empresaScope);
    await prisma.empresa.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('shares a product as a card, once per send, and the customer sees it', async () => {
    const res = await share(staff.vendedor.auth, product.id, 'p-1').expect(201);
    expect(res.body.adjuntos).toEqual([
      expect.objectContaining({ tipo: 'producto', productoId: product.id, nombre: product.nombre }),
    ]);
    expect(res.body.content).toContain(product.nombre);
    const again = await share(staff.vendedor.auth, product.id, 'p-1').expect(201);
    expect(again.body.id).toBe(res.body.id);
    expect(await prisma.attachment.count({ where: { messageId: res.body.id } })).toBe(1);

    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    const card = chat.body.messages.find((m: { id: string }) => m.id === res.body.id);
    expect(card.adjuntos[0]).toMatchObject({ tipo: 'producto', productoId: product.id });
    const thread = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', staff.owner.auth)
      .expect(200);
    expect(thread.body.find((m: { id: string }) => m.id === res.body.id).adjuntos).toHaveLength(1);
  });

  it('never shares another Business’s product', async () => {
    await share(staff.owner.auth, foreignProduct.id, 'p-2').expect(404);
  });

  it('lets Owner, Admin and Vendedor load the customer’s cart; never the Gestor', async () => {
    await setItem(staff.gestor.auth, product.id, 1).expect(403);
    const added = await setItem(staff.vendedor.auth, product.id, 2).expect(200);
    expect(added.body).toMatchObject({
      customerId: customer.id,
      items: [{ productoId: product.id, cantidad: 2 }],
    });
    const changed = await setItem(staff.owner.auth, product.id, 3).expect(200);
    expect(changed.body.items).toEqual([
      expect.objectContaining({ productoId: product.id, cantidad: 3 }),
    ]);
    // The customer sees it in their own cart.
    const cart = await request(BASE).post('/cart').set('Authorization', customerAuth()).expect(201);
    expect(cart.body.CartItem).toEqual([expect.objectContaining({ productoId: product.id })]);
    const removed = await setItem(staff.vendedor.auth, product.id, 0).expect(200);
    expect(removed.body.items).toEqual([]);
    await setItem(staff.vendedor.auth, foreignProduct.id, 1).expect(404);
  });

  it('refuses team members outside the conversation', async () => {
    await request(BASE)
      .delete(`/messaging/conversations/${conversationId}/participants/${staff.vendedor.userId}`)
      .set('Authorization', staff.owner.auth);
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: staff.vendedor.userId, removedAt: null, leftAt: null },
    });
    if (participant)
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { removedAt: new Date() },
      });
    await setItem(staff.vendedor.auth, product.id, 1).expect(403);
  });
});
