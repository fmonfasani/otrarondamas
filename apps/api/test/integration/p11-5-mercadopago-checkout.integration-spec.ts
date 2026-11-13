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
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * P11-5 — a customer pays a confirmed order with Mercado Pago into the Business's own
 * account (OR-B4-032), and the payment is recorded only from a webhook signed with
 * Mercado Pago's real scheme, reading the payment from Mercado Pago. Mercado Pago is a
 * local fake: no real account or money is involved.
 */
describe('P11-5 — paying a confirmed order with Mercado Pago', () => {
  const PORT = '3384';
  const FAKE_MP_PORT = 3383;
  const BASE = `http://127.0.0.1:${PORT}`;
  const MP_USER = 880001;
  const webhookSecret = randomUUID();
  const businessToken = `APP_USR-${randomUUID()}`;
  const preferenceRequests: Array<{ auth?: string; body: Record<string, unknown> }> = [];
  const payments = new Map<string, Record<string, unknown>>();
  let fakeMp: Server;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let otherCompany: { id: string; slug: string };
  let legacyOwner: { id: string };
  let owner: { id: string };
  let customer: { id: string };
  let otherCustomer: { id: string };
  let orderId: string;
  let total: number;

  const customerAuth = (id = customer.id) => `Bearer ${signCustomerToken(id, company.id)}`;
  const ownerAuth = () =>
    `Bearer ${signStaffToken({
      sub: legacyOwner.id,
      email: `p11-5-owner-${suffix}@example.test`,
      nombre: 'Owner',
      empresaId: company.id,
      permisos: [],
    })}`;
  const pay = (id = orderId, auth = customerAuth(), slug = company.slug) =>
    request(BASE).post(`/${slug}/tienda/mis-pedidos/${id}/pagar`).set('Authorization', auth);
  const notify = (paymentId: string, opts: { secret?: string; userId?: number } = {}) => {
    const requestId = randomUUID();
    const ts = String(Date.now());
    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', opts.secret ?? webhookSecret)
      .update(manifest)
      .digest('hex');
    return request(BASE)
      .post(`/cobros/mercadopago/webhook?data.id=${paymentId}&type=payment`)
      .set('x-signature', `ts=${ts},v1=${v1}`)
      .set('x-request-id', requestId)
      .send({
        type: 'payment',
        action: 'payment.updated',
        user_id: opts.userId ?? MP_USER,
        data: { id: paymentId },
      });
  };
  const pagos = () =>
    prisma.pago.findMany({ where: { pedidoId: orderId }, orderBy: { createdAt: 'asc' } });

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
          preferenceRequests.push({ auth: req.headers.authorization, body: JSON.parse(body) });
          return reply(201, {
            id: 'pref-1',
            init_point: 'https://www.mercadopago.test/checkout?pref_id=pref-1',
            sandbox_init_point: 'https://sandbox.mercadopago.test/checkout?pref_id=pref-1',
          });
        }
        const match = /^\/v1\/payments\/(\w+)$/.exec(req.url ?? '');
        if (req.method === 'GET' && match) {
          if (req.headers.authorization !== `Bearer ${businessToken}`) return reply(401, {});
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
    const newCompany = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P11-5 ${tag} ${suffix}`,
          slug: `p11-5-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    company = await newCompany('a');
    otherCompany = await newCompany('b');
    legacyOwner = await prisma.usuario.create({
      data: {
        empresaId: company.id,
        nombre: 'P11-5 Owner',
        email: `p11-5-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    owner = await prisma.user.create({
      data: {
        email: `p11-5-owner-user-${suffix}@example.test`,
        nombre: 'Owner',
        usuarioId: legacyOwner.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: owner.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    const newCustomer = (tag: string) =>
      prisma.cliente.create({
        data: {
          empresaId: company.id,
          nombre: `Cliente ${tag}`,
          email: `p11-5-${tag}-${suffix}@example.test`,
        },
        select: { id: true },
      });
    customer = await newCustomer('ana');
    otherCustomer = await newCustomer('beto');
    const product = await createStoreProduct(prisma, company.id, 'P11-5', 'A', suffix);

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

    const order = await request(BASE)
      .post(`/${company.slug}/tienda/mis-pedidos`)
      .set('Authorization', customerAuth())
      .send({ items: [{ productoId: product.id, cantidad: 2 }] })
      .expect(201);
    orderId = order.body.id;
    total = Number(order.body.total);

    // The Owner connects the account (fake Mercado Pago authorization).
    const connect = await request(BASE)
      .post('/cobros/mercadopago/conectar')
      .set('Authorization', ownerAuth())
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
    await prisma.pago.deleteMany({ where: { empresaId: { in: [company.id, otherCompany.id] } } });
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({ where: { id: owner.id } });
    await prisma.usuario.deleteMany({ where: { id: legacyOwner.id } });
    await deleteStoreCompanies(prisma, [company.id, otherCompany.id]);
    await prisma.$disconnect();
  });

  it('tells the store that it takes online payments', async () => {
    const res = await request(BASE).get(`/${company.slug}/tienda`).expect(200);
    expect(res.body.pagosOnline).toBe(true);
    const other = await request(BASE).get(`/${otherCompany.slug}/tienda`).expect(200);
    expect(other.body.pagosOnline).toBe(false);
  });

  it('does not take payment before the Business confirms the order', async () => {
    const res = await pay();
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('todavía no confirmó');
    expect(preferenceRequests).toHaveLength(0);
  });

  it('only the customer who owns the order can pay it, in its own store', async () => {
    // The Business confirms the order. Confirmation itself is covered by the Orders suites
    // (and needs the legacy permission row in shadow mode), so it is set directly here.
    await prisma.pedido.update({ where: { id: orderId }, data: { estado: 'CONFIRMADO' } });
    await pay(orderId, customerAuth(otherCustomer.id)).expect(404);
    await pay(orderId, customerAuth(), otherCompany.slug).expect(403);
    await request(BASE).post(`/${company.slug}/tienda/mis-pedidos/${orderId}/pagar`).expect(401);
  });

  it('creates the checkout in the Business’s account for the order total', async () => {
    const res = await pay().expect(200);
    expect(res.body.url).toBe('https://sandbox.mercadopago.test/checkout?pref_id=pref-1');
    const sent = preferenceRequests.at(-1);
    expect(sent?.auth).toBe(`Bearer ${businessToken}`);
    expect(sent?.body).toMatchObject({
      external_reference: orderId,
      notification_url: `${BASE}/cobros/mercadopago/webhook`,
      items: [{ id: orderId, quantity: 1, unit_price: total, currency_id: 'ARS' }],
      back_urls: {
        success: `https://panel.test/tienda/${company.slug}/cuenta?pago=aprobado&pedido=${orderId}`,
      },
    });
  });

  it('refuses unsigned or wrongly signed notifications', async () => {
    payments.set('5001', {
      id: 5001,
      status: 'approved',
      transaction_amount: total,
      external_reference: orderId,
      collector_id: MP_USER,
    });
    await request(BASE)
      .post('/cobros/mercadopago/webhook?data.id=5001&type=payment')
      .send({ type: 'payment', user_id: MP_USER, data: { id: '5001' } })
      .expect(401);
    await notify('5001', { secret: randomUUID() }).expect(401);
    expect(await pagos()).toHaveLength(0);
  });

  it('records the payment from Mercado Pago’s data, once, and follows its status', async () => {
    payments.set('5001', {
      id: 5001,
      status: 'in_process',
      transaction_amount: total,
      external_reference: orderId,
      collector_id: MP_USER,
    });
    await notify('5001').expect(200, { handled: true });
    expect((await pagos()).map((p) => p.estado)).toEqual(['EN_PROCESO']);

    payments.set('5001', {
      id: 5001,
      status: 'approved',
      transaction_amount: total,
      external_reference: orderId,
      collector_id: MP_USER,
    });
    await notify('5001').expect(200, { handled: true });
    await notify('5001').expect(200, { handled: true });
    const recorded = await pagos();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      estado: 'APROBADO',
      medio: 'MERCADOPAGO',
      referencia: 'mercadopago:5001',
      empresaId: company.id,
    });
    expect(Number(recorded[0].monto)).toBe(total);
  });

  it('shows the customer the order as paid and does not charge it again', async () => {
    const res = await request(BASE)
      .get(`/${company.slug}/tienda/mis-pedidos`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(Number(res.body[0].pagado)).toBe(total);
    const again = await pay();
    expect(again.status).toBe(409);
    expect(again.body.message).toContain('ya está pagado');
  });

  it('ignores a payment collected by another account or pointing at another Business’s order', async () => {
    payments.set('6001', {
      id: 6001,
      status: 'approved',
      transaction_amount: 1,
      external_reference: orderId,
      collector_id: 999,
    });
    await notify('6001').expect(200, { handled: false });
    await notify('6001', { userId: 123456 }).expect(200, { handled: false });
    payments.set('6002', {
      id: 6002,
      status: 'approved',
      transaction_amount: 1,
      external_reference: randomUUID(),
      collector_id: MP_USER,
    });
    await notify('6002').expect(200, { handled: false });
    expect(await pagos()).toHaveLength(1);
  });
});
