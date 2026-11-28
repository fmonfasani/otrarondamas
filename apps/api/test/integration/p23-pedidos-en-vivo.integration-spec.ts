import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { FakeMercadoPago, placePaidOrder } from './helpers/mercadopago.fixture';
import {
  createStoreProduct,
  deleteMessagingOf,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';
import { seedUsuarioPermissions } from './helpers/usuario-permissions.fixture';

/**
 * Fase 3 (OR-B4-054) — Pedidos en vivo. A paid order reaches the team's open screens at once
 * (`orders.changed`, ids only, only to that Business's team), the store accepts it choosing 10,
 * 20 or 30 minutes (kept in the order), and it may stop taking new orders for 30 minutes (kept in
 * the Business). The board lists what is still to be accepted, made or delivered.
 */
describe('P23 — pedidos en vivo', () => {
  const PORT = '3425';
  const BASE = `http://127.0.0.1:${PORT}`;
  const mp = new FakeMercadoPago(3426);
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let other: { id: string; slug: string };
  let productId: string;
  let customerId: string;
  const staff: Record<string, { usuarioId: string; userId: string; token: string }> = {};
  const sockets: Socket[] = [];

  const customerAuth = () => `Bearer ${signCustomerToken(customerId, shop.id)}`;
  const ownerAuth = () => `Bearer ${staff.shop.token}`;
  const paidOrder = async () =>
    (
      await placePaidOrder(BASE, mp, prisma, {
        slug: shop.slug,
        companyId: shop.id,
        auth: customerAuth(),
        items: [{ productoId: productId, cantidad: 1 }],
      })
    ).order;

  const connect = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(`${BASE}/messaging`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  const heard = (socket: Socket) => {
    const events: Array<{ orderId: string; nuevo: boolean }> = [];
    socket.on('orders.changed', (payload) => events.push(payload));
    return events;
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 800));

  const createStaff = async (key: string, businessId: string) => {
    const email = `p23-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: businessId, nombre: key, email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId, role: 'OWNER', status: 'ACTIVE' },
    });
    await seedUsuarioPermissions(prisma, [usuario.id], ['pedidos.gestionar']);
    staff[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      token: signStaffToken({
        sub: usuario.id,
        email,
        nombre: key,
        empresaId: businessId,
        permisos: ['pedidos.gestionar'],
      }),
    };
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `P23 ${suffix}`, slug: `p23-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    other = await prisma.empresa.create({
      data: { nombre: `P23 otro ${suffix}`, slug: `p23-otro-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    productId = (await createStoreProduct(prisma, shop.id, 'P23', 'A', suffix)).id;
    customerId = (
      await prisma.cliente.create({
        data: { empresaId: shop.id, nombre: 'Ana', email: `p23-ana-${suffix}@example.test` },
        select: { id: true },
      })
    ).id;
    await createStaff('shop', shop.id);
    await createStaff('other', other.id);
    await mp.start();
    await mp.connect(prisma, shop.id);
    server = spawnApi({ PORT, ...mp.env(BASE) });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    if (server && !server.killed) server.kill();
    await mp.close();
    const ids = [shop.id, other.id];
    await prisma.reembolsoPedido.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: ids } } });
    await deleteMessagingOf(prisma, ids);
    await prisma.membership.deleteMany({ where: { businessId: { in: ids } } });
    const people = Object.values(staff);
    await prisma.user.deleteMany({ where: { id: { in: people.map((p) => p.userId) } } });
    await prisma.usuarioPermiso.deleteMany({
      where: { usuarioId: { in: people.map((p) => p.usuarioId) } },
    });
    await prisma.pago.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.checkoutPedido.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.pedidoItem.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: people.map((p) => p.usuarioId) } } });
    await deleteStoreCompanies(prisma, ids);
    await prisma.$disconnect();
  });

  it('a paid order rings on its team screens only, and shows on the board', async () => {
    const team = heard(await connect(staff.shop.token));
    const otherTeam = heard(await connect(staff.other.token));
    const customer = heard(await connect(signCustomerToken(customerId, shop.id)));
    const order = await paidOrder();
    await settle();
    expect(team).toContainEqual({ orderId: order.id, nuevo: true });
    expect(otherTeam).toHaveLength(0);
    expect(customer).toHaveLength(0);

    const board = await request(BASE).get('/pedidos/tablero').set('Authorization', ownerAuth());
    expect(board.status).toBe(200);
    expect(board.body.pausadoHasta).toBeNull();
    const card = board.body.pedidos.find((p: { id: string }) => p.id === order.id);
    expect(card).toMatchObject({ estado: 'RECIBIDO', cliente: 'Ana', listoEstimado: null });
    expect(card.aceptarAntes).toBeTruthy();
    expect(Number(card.pagado)).toBe(Number(order.total) + Number(order.costoEnvio));
    expect(card.items).toEqual([{ producto: expect.stringContaining('P23'), cantidad: 1 }]);
    // Another business's board never shows it.
    const theirs = await request(BASE)
      .get('/pedidos/tablero')
      .set('Authorization', `Bearer ${staff.other.token}`)
      .expect(200);
    expect(theirs.body.pedidos.some((p: { id: string }) => p.id === order.id)).toBe(false);
  });

  it('accepting with 20 minutes keeps when it will be ready, and moves it on every screen', async () => {
    const order = await paidOrder();
    const team = heard(await connect(staff.shop.token));
    const before = Date.now();
    await request(BASE)
      .patch(`/pedidos/${order.id}/estado`)
      .set('Authorization', ownerAuth())
      .send({ estado: 'CONFIRMADO', minutosPreparacion: 20 })
      .expect(200);
    await settle();
    expect(team).toContainEqual({ orderId: order.id, nuevo: false });
    const saved = await prisma.pedido.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.estado).toBe('CONFIRMADO');
    const ahead = saved.listoEstimado!.getTime() - before;
    expect(ahead).toBeGreaterThan(19 * 60_000);
    expect(ahead).toBeLessThan(21 * 60_000);
    // Only 10, 20 or 30, and only when accepting.
    await request(BASE)
      .patch(`/pedidos/${order.id}/estado`)
      .set('Authorization', ownerAuth())
      .send({ estado: 'LISTO', minutosPreparacion: 10 })
      .expect(400);
    const another = await paidOrder();
    await request(BASE)
      .patch(`/pedidos/${another.id}/estado`)
      .set('Authorization', ownerAuth())
      .send({ estado: 'CONFIRMADO', minutosPreparacion: 15 })
      .expect(400);
    // Rejecting takes it off the board at once too.
    await request(BASE)
      .post(`/pedidos/${another.id}/cancel`)
      .set('Authorization', ownerAuth())
      .send({ motivo: 'Sin stock' })
      .expect(200);
    await settle();
    expect(team).toContainEqual({ orderId: another.id, nuevo: false });
  });

  it('paused for 30 minutes, the store takes no new orders until it resumes', async () => {
    const paused = await request(BASE)
      .put('/pedidos/pausa')
      .set('Authorization', ownerAuth())
      .send({ minutos: 30 })
      .expect(200);
    const until = new Date(paused.body.pausadoHasta).getTime();
    expect(until - Date.now()).toBeGreaterThan(29 * 60_000);
    const saved = await prisma.empresa.findUniqueOrThrow({ where: { id: shop.id } });
    expect(saved.pedidosPausadosHasta?.getTime()).toBe(until);
    const refused = await request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', customerAuth())
      .send({ items: [{ productoId: productId, cantidad: 1 }] })
      .expect(409);
    expect(refused.body.message).toContain('no está tomando pedidos');
    const board = await request(BASE)
      .get('/pedidos/tablero')
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(new Date(board.body.pausadoHasta).getTime()).toBe(until);

    await request(BASE)
      .put('/pedidos/pausa')
      .set('Authorization', ownerAuth())
      .send({ minutos: 0 })
      .expect(200, { pausadoHasta: null });
    await request(BASE)
      .put('/pedidos/pausa')
      .set('Authorization', ownerAuth())
      .send({ minutos: 45 })
      .expect(400);
    const audit = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, accion: { in: ['PEDIDOS_PAUSADOS', 'PEDIDOS_REANUDADOS'] } },
    });
    expect(audit).toHaveLength(2);
    await paidOrder();
  });

  it('a customer cannot see the board nor pause the store', async () => {
    await request(BASE).get('/pedidos/tablero').set('Authorization', customerAuth()).expect(403);
    await request(BASE)
      .put('/pedidos/pausa')
      .set('Authorization', customerAuth())
      .send({ minutos: 30 })
      .expect(403);
  });
});
