import type { ChildProcess } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteMessagingOf,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-055 (Owner, 2026-11-27) — every order is paid at checkout, before it exists, like
 * PedidosYa. The customer closes the cart: a checkout with frozen prices and the delivery fee,
 * paid with Mercado Pago in the store's own account (here a local fake: no real money). Only an
 * approved payment for the whole amount makes it the store's order. Unpaid, it lapses.
 */
describe('P21 — pagar antes: el pedido nace cuando se paga', () => {
  const PORT = '3410';
  const FAKE_MP_PORT = 3411;
  const BASE = `http://127.0.0.1:${PORT}`;
  const MP_USER = 880021;
  const DOOR = { lat: -32.946812, lng: -60.639347 };
  const webhookSecret = randomUUID();
  const businessToken = `APP_USR-${randomUUID()}`;
  const preferences: Array<Record<string, unknown>> = [];
  const payments = new Map<string, Record<string, unknown>>();
  let fakeMp: Server;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let noMp: { id: string; slug: string };
  let productId: string;
  const people: Record<string, string> = {};
  const owner: { usuario?: string; user?: string } = {};

  const auth = (key: string, companyId = shop.id) =>
    `Bearer ${signCustomerToken(people[key], companyId)}`;
  const checkoutFor = (
    key: string,
    body: Record<string, unknown> = {},
    slug = shop.slug,
    companyId = shop.id,
  ) =>
    request(BASE)
      .post(`/${slug}/tienda/mis-pedidos`)
      .set('Authorization', auth(key, companyId))
      .send({ items: [{ productoId: productId, cantidad: 2 }], ...body });
  const notify = (paymentId: string) => {
    const requestId = randomUUID();
    const ts = String(Date.now());
    const v1 = createHmac('sha256', webhookSecret)
      .update(`id:${paymentId};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    return request(BASE)
      .post(`/cobros/mercadopago/webhook?data.id=${paymentId}&type=payment`)
      .set('x-signature', `ts=${ts},v1=${v1}`)
      .set('x-request-id', requestId)
      .send({
        type: 'payment',
        action: 'payment.updated',
        user_id: MP_USER,
        data: { id: paymentId },
      });
  };
  const pays = (paymentId: number, checkoutId: string, amount: number, status = 'approved') =>
    payments.set(String(paymentId), {
      id: paymentId,
      status,
      transaction_amount: amount,
      external_reference: `checkout:${checkoutId}`,
      collector_id: MP_USER,
    });

  beforeAll(async () => {
    fakeMp = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const reply = (status: number, payload: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (req.method === 'POST' && req.url === '/oauth/token') {
          return reply(200, {
            access_token: businessToken,
            refresh_token: 'TG-x',
            user_id: MP_USER,
            live_mode: false,
            expires_in: 15552000,
          });
        }
        if (req.method === 'POST' && req.url === '/checkout/preferences') {
          preferences.push(JSON.parse(body));
          return reply(201, {
            id: `pref-${preferences.length}`,
            init_point: 'https://www.mercadopago.test/checkout',
            sandbox_init_point: `https://sandbox.mercadopago.test/checkout?pref=${preferences.length}`,
          });
        }
        const match = /^\/v1\/payments\/(\w+)$/.exec(req.url ?? '');
        if (req.method === 'GET' && match) {
          const payment = payments.get(match[1]);
          return payment ? reply(200, payment) : reply(404, {});
        }
        reply(404, {});
      });
    });
    await new Promise<void>((resolve) => fakeMp.listen(FAKE_MP_PORT, '127.0.0.1', resolve));
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: {
        nombre: `P21 ${suffix}`,
        slug: `p21-${suffix}`,
        configuracion: {
          ubicacion: {
            ...DOOR,
            zona: false,
            direccion: 'Córdoba 1000',
            confirmadaAt: new Date().toISOString(),
          },
          envios: { envio: true, retiro: true, radioKm: 5, base: 2500, porKm: 500 },
        },
      },
      select: { id: true, slug: true },
    });
    noMp = await prisma.empresa.create({
      data: { nombre: `P21 sin MP ${suffix}`, slug: `p21-sinmp-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    productId = (await createStoreProduct(prisma, shop.id, 'P21', 'A', suffix)).id;
    for (const key of ['ana', 'beto']) {
      people[key] = (
        await prisma.cliente.create({
          data: { empresaId: shop.id, nombre: key, email: `p21-${key}-${suffix}@example.test` },
          select: { id: true },
        })
      ).id; // NOSONAR: two customers, one after the other
    }
    people.otra = (
      await prisma.cliente.create({
        data: { empresaId: noMp.id, nombre: 'otra', email: `p21-otra-${suffix}@example.test` },
        select: { id: true },
      })
    ).id;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: shop.id,
        nombre: 'Owner',
        email: `p21-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
        estadoLegajo: 'APROBADO',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `p21-user-${suffix}@example.test`, nombre: 'Owner', usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: shop.id, role: 'OWNER', status: 'ACTIVE' },
    });
    owner.usuario = usuario.id;
    owner.user = user.id;
    server = spawnApi({
      PORT,
      MERCADOPAGO_CLIENT_ID: 'wapsell-app-id',
      MERCADOPAGO_CLIENT_SECRET: randomUUID(),
      MERCADOPAGO_OAUTH_REDIRECT_URI: `${BASE}/cobros/mercadopago/callback`,
      MERCADOPAGO_TOKEN_KEY: randomBytes(32).toString('base64'),
      MERCADOPAGO_API_URL: `http://127.0.0.1:${FAKE_MP_PORT}`,
      MERCADOPAGO_NOTIFICATION_URL: `${BASE}/cobros/mercadopago/webhook`,
      MERCADOPAGO_WEBHOOK_SECRET: webhookSecret,
      WEB_APP_URL: 'https://panel.test',
    });
    await waitPort(Number(PORT));
    const ownerAuth = `Bearer ${signStaffToken({
      sub: usuario.id,
      email: `p21-owner-${suffix}@example.test`,
      nombre: 'Owner',
      empresaId: shop.id,
      permisos: [],
    })}`;
    const connect = await request(BASE)
      .post('/cobros/mercadopago/conectar')
      .set('Authorization', ownerAuth)
      .expect(200);
    const state = new URL(connect.body.url).searchParams.get('state') as string;
    await request(BASE)
      .get('/cobros/mercadopago/callback')
      .query({ code: 'ok', state })
      .redirects(0)
      .expect(302);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await new Promise<void>((resolve) => fakeMp.close(() => resolve()));
    const ids = [shop.id, noMp.id];
    await deleteMessagingOf(prisma, ids);
    await prisma.pago.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.checkoutPedido.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.membership.deleteMany({ where: { businessId: shop.id } });
    await prisma.user.deleteMany({ where: { id: owner.user } });
    await prisma.usuario.deleteMany({ where: { id: owner.usuario } });
    await deleteStoreCompanies(prisma, ids);
    await prisma.$disconnect();
  });

  it('a store without Mercado Pago takes no online order, and the old order without paying is closed', async () => {
    const refused = await checkoutFor('otra', {}, noMp.slug, noMp.id).expect(409);
    expect(refused.body.message).toContain('todavía no cobra online');
    expect(await prisma.checkoutPedido.count({ where: { empresaId: noMp.id } })).toBe(0);
    const gone = await request(BASE)
      .post(`/${shop.slug}/tienda/pedidos`)
      .send({
        nombre: 'X',
        email: 'x@example.test',
        items: [{ productoId: productId, cantidad: 1 }],
      })
      .expect(410);
    expect(gone.body.message).toContain('pagá el pedido con Mercado Pago');
    expect(await prisma.pedido.count({ where: { empresaId: shop.id } })).toBe(0);
  });

  it('closing the cart opens a checkout for products and delivery; the store sees nothing yet', async () => {
    const res = await checkoutFor('ana', {
      entrega: {
        tipo: 'ENVIO',
        direccion: 'Av. Pellegrini 1234',
        lat: DOOR.lat + 2.1 / 111.2,
        lng: DOOR.lng,
      },
    }).expect(201);
    expect(res.body.pagar).toMatch(/^https:\/\/sandbox\.mercadopago\.test\/checkout/);
    const total = Number(res.body.total);
    expect(Number(res.body.costoEnvio)).toBe(4000);
    const sent = preferences.at(-1) as {
      external_reference: string;
      items: Array<{ unit_price: number }>;
      back_urls: { success: string };
    };
    expect(sent.external_reference).toBe(`checkout:${res.body.checkoutId}`);
    expect(sent.items[0].unit_price).toBe(total + 4000);
    expect(sent.back_urls.success).toBe(
      `https://panel.test/tienda/${shop.slug}/cuenta?pago=aprobado&checkout=${res.body.checkoutId}`,
    );
    expect(await prisma.pedido.count({ where: { empresaId: shop.id } })).toBe(0);
    const checkout = await prisma.checkoutPedido.findUnique({ where: { id: res.body.checkoutId } });
    expect(checkout).toMatchObject({ estado: 'PENDIENTE', tipoEntrega: 'ENVIO', kmEntrega: 2.1 });
    // 30 minutes (the database stamps createdAt, the API venceAt: a few ms apart).
    expect(
      Math.abs(checkout!.venceAt.getTime() - checkout!.createdAt.getTime() - 30 * 60_000),
    ).toBeLessThan(5000);
  });

  it('an approved payment for the whole amount makes it the store’s order, once', async () => {
    const opened = await checkoutFor('ana', { entrega: { tipo: 'RETIRO' } }).expect(201);
    const id = opened.body.checkoutId as string;
    const owed = Number(opened.body.total);
    // Less than owed: nothing happens.
    pays(7001, id, owed - 100);
    await notify('7001').expect(200);
    expect(await prisma.pedido.count({ where: { empresaId: shop.id } })).toBe(0);
    // The whole amount: the order is born, numbered, with its payment.
    pays(7002, id, owed);
    await notify('7002').expect(200);
    await notify('7002').expect(200);
    const orders = await prisma.pedido.findMany({
      where: { empresaId: shop.id },
      include: { PedidoItem: true },
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      estado: 'RECIBIDO',
      numero: 1,
      tipoEntrega: 'RETIRO',
      canalOrigen: 'web',
    });
    expect(orders[0].PedidoItem).toHaveLength(1);
    expect(Number(orders[0].total)).toBe(owed);
    const checkout = await prisma.checkoutPedido.findUnique({ where: { id } });
    expect(checkout).toMatchObject({ estado: 'PAGADO', pedidoId: orders[0].id });
    const pagos = await prisma.pago.findMany({ where: { pedidoId: orders[0].id } });
    expect(pagos.map((p) => [p.estado, Number(p.monto)])).toEqual([['APROBADO', owed]]);
    const mine = await request(BASE)
      .get(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', auth('ana'))
      .expect(200);
    expect(mine.body.map((o: { id: string }) => o.id)).toEqual([orders[0].id]);
  });

  it('only its customer goes back to pay it, and never after 30 minutes', async () => {
    const opened = await checkoutFor('beto').expect(201);
    const id = opened.body.checkoutId as string;
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-checkouts/${id}/pagar`)
      .set('Authorization', auth('ana'))
      .expect(404);
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-checkouts/${id}/pagar`)
      .set('Authorization', auth('beto'))
      .expect(200);
    await prisma.checkoutPedido.update({
      where: { id },
      data: { venceAt: new Date(Date.now() - 1000) },
    });
    const late = await request(BASE)
      .post(`/${shop.slug}/tienda/mis-checkouts/${id}/pagar`)
      .set('Authorization', auth('beto'))
      .expect(409);
    expect(late.body.message).toContain('30 minutos');
  });

  it('a payment that arrives after it lapsed is still honoured: the customer paid', async () => {
    const opened = await checkoutFor('beto').expect(201);
    const id = opened.body.checkoutId as string;
    await prisma.checkoutPedido.update({ where: { id }, data: { estado: 'VENCIDO' } });
    pays(7003, id, Number(opened.body.total));
    await notify('7003').expect(200);
    const checkout = await prisma.checkoutPedido.findUnique({ where: { id } });
    expect(checkout?.estado).toBe('PAGADO');
    const order = await prisma.pedido.findUnique({ where: { id: checkout!.pedidoId! } });
    expect(order).toMatchObject({ estado: 'RECIBIDO', numero: 2 });
  });
});
