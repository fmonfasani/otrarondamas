import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
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
 * OR-B4-055 (Owner, 2026-11-27) — a paid order the store does not accept within 3 minutes is
 * rejected by itself and its money goes back; so does one the store or the customer cancels. All
 * of it is kept in the database: the order's deadline, and each refund with its attempts (a fake
 * Mercado Pago answers, or fails on purpose). The sweeps run inside the API, as in production.
 */
describe('P22 — rechazo automático a los 3 minutos y reembolsos', () => {
  const PORT = '3423';
  const BASE = `http://127.0.0.1:${PORT}`;
  const mp = new FakeMercadoPago(3424);
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let productId: string;
  let owner: { usuarioId: string; userId: string; auth: string };
  const customers: Record<string, string> = {};

  const auth = (key: string) => `Bearer ${signCustomerToken(customers[key], shop.id)}`;
  const paidOrder = async (key: string) =>
    (
      await placePaidOrder(BASE, mp, prisma, {
        slug: shop.slug,
        companyId: shop.id,
        auth: auth(key),
        items: [{ productoId: productId, cantidad: 1 }],
      })
    ).order;
  /** Waits (the sweeps run every 15–20 s) until the check holds. */
  const eventually = async <T>(read: () => Promise<T>, ok: (value: T) => boolean, ms = 60_000) => {
    const end = Date.now() + ms;
    for (;;) {
      const value = await read(); // NOSONAR: polling, one read after another
      if (ok(value) || Date.now() > end) return value;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };
  const refundsOf = (pedidoId: string) =>
    prisma.reembolsoPedido.findMany({ where: { pedidoId }, orderBy: { createdAt: 'asc' } });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `P22 ${suffix}`, slug: `p22-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    productId = (await createStoreProduct(prisma, shop.id, 'P22', 'A', suffix)).id;
    for (const key of ['ana', 'beto']) {
      customers[key] = (
        await prisma.cliente.create({
          // NOSONAR: two customers, one after the other
          data: { empresaId: shop.id, nombre: key, email: `p22-${key}-${suffix}@example.test` },
          select: { id: true },
        })
      ).id;
    }
    const email = `p22-owner-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: shop.id, nombre: 'Owner', email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: 'Owner', usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: shop.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await seedUsuarioPermissions(prisma, [usuario.id], ['pedidos.gestionar']);
    owner = {
      usuarioId: usuario.id,
      userId: user.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: 'Owner', empresaId: shop.id, permisos: ['pedidos.gestionar'] })}`,
    };
    await mp.start();
    await mp.connect(prisma, shop.id);
    server = spawnApi({ PORT, ...mp.env(BASE) });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await mp.close();
    await prisma.reembolsoPedido.deleteMany({ where: { empresaId: shop.id } });
    await prisma.auditLog.deleteMany({ where: { empresaId: shop.id } });
    await deleteMessagingOf(prisma, [shop.id]);
    await prisma.membership.deleteMany({ where: { businessId: shop.id } });
    await prisma.user.deleteMany({ where: { id: owner.userId } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: owner.usuarioId } });
    await prisma.pago.deleteMany({ where: { empresaId: shop.id } });
    await prisma.checkoutPedido.deleteMany({ where: { empresaId: shop.id } });
    await prisma.pedidoItem.deleteMany({ where: { empresaId: shop.id } });
    await prisma.pedido.deleteMany({ where: { empresaId: shop.id } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: shop.id } });
    await prisma.usuario.deleteMany({ where: { id: owner.usuarioId } });
    await deleteStoreCompanies(prisma, [shop.id]);
    await prisma.$disconnect();
  });

  it('a paid order is born with 3 minutes to be accepted', async () => {
    const order = await paidOrder('ana');
    const left = order.aceptarAntes!.getTime() - order.createdAt.getTime();
    expect(Math.abs(left - 3 * 60_000)).toBeLessThan(5000);
  });

  it('not accepted in time: rejected by itself, refunded, and both told to the customer', async () => {
    const order = await paidOrder('ana');
    // The deadline is in the database: move it to the past, as 3 minutes would.
    await prisma.pedido.update({
      where: { id: order.id },
      data: { aceptarAntes: new Date(Date.now() - 1000) },
    });
    const rejected = await eventually(
      () => prisma.pedido.findUniqueOrThrow({ where: { id: order.id } }),
      (o) => o.estado === 'CANCELADO',
    );
    expect(rejected.estado).toBe('CANCELADO');
    const audit = await prisma.auditLog.findFirst({
      where: { empresaId: shop.id, entidadId: order.id, accion: 'CANCELAR_ORDEN' },
    });
    expect(audit?.motivo).toBe('El negocio no lo aceptó a tiempo');
    const [refund] = await eventually(
      () => refundsOf(order.id),
      (r) => r[0]?.estado === 'REALIZADO',
    );
    expect(refund).toMatchObject({
      estado: 'REALIZADO',
      intentos: 1,
      motivo: 'El negocio no lo aceptó a tiempo',
    });
    expect(Number(refund.monto)).toBe(Number(order.total));
    expect(mp.refunds.at(-1)?.key).toBe(`refund-${refund.id}`);
    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: refund.pagoId } });
    expect(pago.estado).toBe('REEMBOLSADO_TOTAL');
    const notices = await prisma.message.findMany({
      where: { businessId: shop.id, clientMessageId: { startsWith: `pedido-${order.id}-` } },
      select: { content: true },
    });
    const texts = notices.map((n) => n.content ?? '');
    expect(texts.some((t) => t.includes('Motivo: El negocio no lo aceptó a tiempo'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Te devolvimos $'))).toBe(true);
  }, 90000);

  it('accepted in time, it is never rejected, even after the deadline passes', async () => {
    const order = await paidOrder('ana');
    await request(BASE)
      .patch(`/pedidos/${order.id}/estado`)
      .set('Authorization', owner.auth)
      .send({ estado: 'CONFIRMADO' })
      .expect(200);
    await prisma.pedido.update({
      where: { id: order.id },
      data: { aceptarAntes: new Date(Date.now() - 1000) },
    });
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: order.id } })).estado).toBe(
      'CONFIRMADO',
    );
    expect(await refundsOf(order.id)).toHaveLength(0);
  }, 60000);

  it('the store cancelling a paid order refunds it at once', async () => {
    const order = await paidOrder('beto');
    await request(BASE)
      .post(`/pedidos/${order.id}/cancel`)
      .set('Authorization', owner.auth)
      .send({ motivo: 'Sin stock del sabor pedido' })
      .expect(200);
    const [refund] = await eventually(
      () => refundsOf(order.id),
      (r) => r[0]?.estado === 'REALIZADO',
    );
    expect(refund).toMatchObject({ estado: 'REALIZADO', motivo: 'Sin stock del sabor pedido' });
  }, 60000);

  it('the customer cancels their own order before it is accepted, and gets the money back', async () => {
    const order = await paidOrder('beto');
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos/${order.id}/cancelar`)
      .set('Authorization', auth('ana'))
      .expect(404);
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos/${order.id}/cancelar`)
      .set('Authorization', auth('beto'))
      .expect(200, { id: order.id, estado: 'CANCELADO' });
    const [refund] = await eventually(
      () => refundsOf(order.id),
      (r) => r[0]?.estado === 'REALIZADO',
    );
    expect(refund.motivo).toBe('Lo cancelaste antes de que el negocio lo aceptara');
    const mine = await request(BASE)
      .get(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', auth('beto'))
      .expect(200);
    expect(mine.body.find((o: { id: string }) => o.id === order.id).reembolsos).toEqual([
      { estado: 'REALIZADO', monto: expect.any(String) },
    ]);
    // Once the store accepted an order, the customer writes to it instead.
    const accepted = await paidOrder('beto');
    await request(BASE)
      .patch(`/pedidos/${accepted.id}/estado`)
      .set('Authorization', owner.auth)
      .send({ estado: 'CONFIRMADO' })
      .expect(200);
    const late = await request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos/${accepted.id}/cancelar`)
      .set('Authorization', auth('beto'))
      .expect(409);
    expect(late.body.message).toContain('ya aceptó tu pedido');
  }, 60000);

  it('when Mercado Pago fails, the refund waits in the database and is asked again', async () => {
    const order = await paidOrder('ana');
    mp.failNextRefunds = 1;
    await request(BASE)
      .post(`/pedidos/${order.id}/cancel`)
      .set('Authorization', owner.auth)
      .send({ motivo: 'Cerramos antes' })
      .expect(200);
    const [waiting] = await eventually(
      () => refundsOf(order.id),
      (r) => r[0]?.intentos === 1,
    );
    expect(waiting).toMatchObject({ estado: 'PENDIENTE', intentos: 1 });
    expect(waiting.ultimoError).toContain('Mercado Pago respondió 500');
    expect(waiting.proximoIntento.getTime()).toBeGreaterThan(Date.now() + 30_000);
    // As if the minute passed: the next sweep asks again and it goes through.
    await prisma.reembolsoPedido.update({
      where: { id: waiting.id },
      data: { proximoIntento: new Date(Date.now() - 1000) },
    });
    const [done] = await eventually(
      () => refundsOf(order.id),
      (r) => r[0]?.estado === 'REALIZADO',
    );
    expect(done).toMatchObject({ estado: 'REALIZADO', intentos: 2, ultimoError: null });
  }, 90000);
});
