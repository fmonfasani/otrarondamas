import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { createStoreProduct, waitPort } from './helpers/store-catalog.fixture';

/**
 * STORE-V1-05 — "Crear pedido" from a conversation: the order is the associated customer's
 * cart. A retry of the same cart returns the same order; a later cart in the same
 * conversation is a new order (the key used to be the conversation id, which returned the
 * first order forever and emptied the new cart without ordering it).
 */
describe('STORE-V1-05 — order from a conversation', () => {
  const PORT = '3387';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let legacyOwner: { id: string };
  let owner: { id: string };
  let customer: { id: string };
  let productA: { id: string; nombre: string };
  let productB: { id: string; nombre: string };
  let conversationId: string;
  let firstOrderId: string;

  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, company.id)}`;
  const ownerAuth = () =>
    `Bearer ${signStaffToken({
      sub: legacyOwner.id,
      email: `store-v1-05-owner-${suffix}@example.test`,
      nombre: 'Owner',
      empresaId: company.id,
      permisos: [],
    })}`;
  const fillCart = async (items: Array<{ productoId: string; cantidad: number }>) => {
    const cart = await request(BASE).post('/cart').set('Authorization', customerAuth()).expect(201);
    for (const item of items) {
      await request(BASE)
        .post(`/cart/${cart.body.id}/items`)
        .set('Authorization', customerAuth())
        .send(item)
        .expect(201);
    }
  };
  const createOrder = () =>
    request(BASE)
      .post(`/messaging/conversations/${conversationId}/orders`)
      .set('Authorization', ownerAuth())
      .send({});

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: {
        nombre: `STORE-V1-05 ${suffix}`,
        slug: `store-v1-05-${suffix}`,
        configuracion: {},
      },
      select: { id: true, slug: true },
    });
    legacyOwner = await prisma.usuario.create({
      data: {
        empresaId: company.id,
        nombre: `STORE-V1-05 Owner ${suffix}`,
        email: `store-v1-05-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    owner = await prisma.user.create({
      data: {
        email: `store-v1-05-owner-user-${suffix}@example.test`,
        nombre: 'STORE-V1-05 Owner',
        usuarioId: legacyOwner.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: owner.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente Chat',
        email: `store-v1-05-cliente-${suffix}@example.test`,
      },
      select: { id: true },
    });
    productA = await createStoreProduct(prisma, company.id, 'STORE-V1-05', 'A', suffix);
    productB = await createStoreProduct(prisma, company.id, 'STORE-V1-05', 'B', suffix);
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));

    const chat = await request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'c-1', content: 'Quiero hacer un pedido' })
      .expect(201);
    conversationId = chat.body.conversationId;
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const businessIds = [company.id];
    const scope = { where: { businessId: { in: businessIds } } };
    const empresaScope = { where: { empresaId: { in: businessIds } } };
    await prisma.messageReadReceipt.deleteMany(scope);
    await prisma.message.deleteMany(scope);
    await prisma.conversationAssociation.deleteMany(scope);
    await prisma.conversationParticipant.deleteMany(scope);
    await prisma.conversation.deleteMany(scope);
    await prisma.cartItem.deleteMany({ where: { Cart: { businessId: company.id } } });
    await prisma.cart.deleteMany(scope);
    await prisma.pedidoItem.deleteMany({ where: { Pedido: { empresaId: company.id } } });
    await prisma.pedido.deleteMany(empresaScope);
    await prisma.membership.deleteMany(scope);
    await prisma.user.deleteMany({ where: { id: owner.id } });
    await prisma.usuario.deleteMany({ where: { id: legacyOwner.id } });
    await prisma.cliente.deleteMany(empresaScope);
    await prisma.movimientoStock.deleteMany(empresaScope);
    await prisma.lote.deleteMany(empresaScope);
    await prisma.producto.deleteMany(empresaScope);
    await prisma.subtipo.deleteMany(empresaScope);
    await prisma.tipo.deleteMany(empresaScope);
    await prisma.subfamilia.deleteMany(empresaScope);
    await prisma.familia.deleteMany(empresaScope);
    await prisma.empresa.deleteMany({ where: { id: company.id } });
    await prisma.$disconnect();
  });

  it('refuses an empty cart', async () => {
    const res = await createOrder();
    expect(res.status).toBe(409);
  });

  it('shows the team the customer’s cart before ordering', async () => {
    await fillCart([
      { productoId: productA.id, cantidad: 2 },
      { productoId: productB.id, cantidad: 1 },
    ]);
    const res = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/cart`)
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(res.body.customerId).toBe(customer.id);
    expect(res.body.items).toEqual([
      expect.objectContaining({ productoId: productA.id, nombre: productA.nombre, cantidad: 2 }),
      expect.objectContaining({ productoId: productB.id, nombre: productB.nombre, cantidad: 1 }),
    ]);
    expect(res.body.total).toBe('30.00');
  });

  it('creates the order from the cart and empties it', async () => {
    const res = await createOrder();
    expect(res.status).toBe(201);
    firstOrderId = res.body.id;
    const order = await prisma.pedido.findUnique({
      where: { id: firstOrderId },
      include: { PedidoItem: true },
    });
    expect(order).toMatchObject({
      clienteId: customer.id,
      empresaId: company.id,
      estado: 'RECIBIDO',
    });
    expect(order?.PedidoItem).toHaveLength(2);
    const cart = await request(BASE)
      .get(`/messaging/conversations/${conversationId}/cart`)
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(cart.body.items).toEqual([]);
  });

  it('a second order in the same conversation is a new order with the new cart', async () => {
    await fillCart([{ productoId: productB.id, cantidad: 3 }]);
    const res = await createOrder();
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(firstOrderId);
    const order = await prisma.pedido.findUnique({
      where: { id: res.body.id },
      include: { PedidoItem: true },
    });
    expect(order?.PedidoItem).toEqual([expect.objectContaining({ productoId: productB.id })]);
    expect(Number(order?.PedidoItem[0].cantidad)).toBe(3);
    expect(await prisma.pedido.count({ where: { empresaId: company.id } })).toBe(2);
  });

  it('links each order to the conversation exactly once', async () => {
    const links = await prisma.conversationAssociation.findMany({
      where: { conversationId, entityType: 'ORDER' },
    });
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.entityId)).size).toBe(2);
  });

  it('the customer sees both orders in their account', async () => {
    const res = await request(BASE)
      .get(`/${company.slug}/tienda/mis-pedidos`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('keeps the cart and the order away from the customer and from no-session calls', async () => {
    await request(BASE)
      .get(`/messaging/conversations/${conversationId}/cart`)
      .set('Authorization', customerAuth())
      .expect(403);
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/orders`)
      .send({})
      .expect(401);
  });
});
