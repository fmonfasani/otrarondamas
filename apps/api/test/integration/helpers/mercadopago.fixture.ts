import { createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { encryptSecret } from '../../../src/payments/mercadopago/mercadopago-crypto';
import type { PrismaService } from '../../../src/prisma/prisma.service';

/**
 * OR-B4-055 — every order is paid at checkout, before it exists. Suites that need an order of
 * the store use this local, fake Mercado Pago (no real account or money): it answers the
 * checkout preference and the payment lookup, a store is connected by writing its (encrypted)
 * account as the OAuth callback would, and paying sends the signed notification Mercado Pago
 * sends. The order is then born exactly as in production.
 */
export class FakeMercadoPago {
  readonly preferences: Array<Record<string, unknown>> = [];
  /** OR-B4-055: refunds asked, with their idempotency key. */
  readonly refunds: Array<{ paymentId: string; key: string | undefined }> = [];
  /** How many of the next refund requests answer with an error (to test the retries). */
  failNextRefunds = 0;
  private readonly payments = new Map<string, Record<string, unknown>>();
  private readonly accounts = new Map<string, number>();
  private readonly token = `APP_USR-${randomUUID()}`;
  private readonly secret = randomUUID();
  private readonly key = randomBytes(32);
  private server?: Server;
  private sequence = 0;

  constructor(private readonly port: number) {}

  async start() {
    this.server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const reply = (status: number, payload: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (req.method === 'POST' && req.url === '/checkout/preferences') {
          this.preferences.push(JSON.parse(body) as Record<string, unknown>);
          return reply(201, {
            id: `pref-${this.preferences.length}`,
            init_point: 'https://www.mercadopago.test/checkout',
            sandbox_init_point: `https://sandbox.mercadopago.test/checkout?pref=${this.preferences.length}`,
          });
        }
        const refund = /^\/v1\/payments\/(\w+)\/refunds$/.exec(req.url ?? '');
        if (req.method === 'POST' && refund) {
          if (this.failNextRefunds > 0) {
            this.failNextRefunds -= 1;
            return reply(500, { message: 'internal_error' });
          }
          const key = req.headers['x-idempotency-key'];
          this.refunds.push({ paymentId: refund[1], key: Array.isArray(key) ? key[0] : key });
          return reply(201, { id: 5_000_000 + this.refunds.length, status: 'approved' });
        }
        const match = /^\/v1\/payments\/(\w+)$/.exec(req.url ?? '');
        if (req.method === 'GET' && match) {
          const payment = this.payments.get(match[1]);
          return payment ? reply(200, payment) : reply(404, {});
        }
        reply(404, {});
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(this.port, '127.0.0.1', resolve));
  }

  async close() {
    await new Promise<void>((resolve) =>
      this.server ? this.server.close(() => resolve()) : resolve(),
    );
  }

  /** What the API needs to take payments, pointed at this fake. */
  env(base: string) {
    return {
      MERCADOPAGO_CLIENT_ID: 'wapsell-test-app',
      MERCADOPAGO_CLIENT_SECRET: randomUUID(),
      MERCADOPAGO_OAUTH_REDIRECT_URI: `${base}/cobros/mercadopago/callback`,
      MERCADOPAGO_TOKEN_KEY: this.key.toString('base64'),
      MERCADOPAGO_API_URL: `http://127.0.0.1:${this.port}`,
      MERCADOPAGO_NOTIFICATION_URL: `${base}/cobros/mercadopago/webhook`,
      MERCADOPAGO_WEBHOOK_SECRET: this.secret,
      WEB_APP_URL: 'https://panel.test',
    };
  }

  /** The store's Mercado Pago account, as the OAuth callback stores it. */
  async connect(prisma: PrismaService, companyId: string) {
    const userId = 990000 + randomInt(9000) + this.accounts.size;
    this.accounts.set(companyId, userId);
    const business = await prisma.empresa.findUniqueOrThrow({
      where: { id: companyId },
      select: { configuracion: true },
    });
    const configuracion = (business.configuracion ?? {}) as Record<string, unknown>;
    await prisma.empresa.update({
      where: { id: companyId },
      data: {
        configuracion: {
          ...configuracion,
          mercadoPago: {
            userId: String(userId),
            accessToken: encryptSecret(this.token, this.key),
            refreshToken: null,
            publicKey: null,
            liveMode: false,
            expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
            connectedAt: new Date().toISOString(),
            connectedBy: 'test',
          },
        },
      },
    });
  }

  /** Mercado Pago approves the payment of a checkout and notifies the API (signed). */
  async pay(base: string, companyId: string, checkoutId: string, amount: number) {
    const userId = this.accounts.get(companyId);
    if (!userId) throw new Error('connect the store first');
    this.sequence += 1;
    const paymentId = String(7_000_000 + this.sequence);
    this.payments.set(paymentId, {
      id: Number(paymentId),
      status: 'approved',
      transaction_amount: amount,
      external_reference: `checkout:${checkoutId}`,
      collector_id: userId,
    });
    const requestId = randomUUID();
    const ts = String(Date.now());
    const v1 = createHmac('sha256', this.secret)
      .update(`id:${paymentId};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    await request(base)
      .post(`/cobros/mercadopago/webhook?data.id=${paymentId}&type=payment`)
      .set('x-signature', `ts=${ts},v1=${v1}`)
      .set('x-request-id', requestId)
      .send({
        type: 'payment',
        action: 'payment.updated',
        user_id: userId,
        data: { id: paymentId },
      })
      .expect(200, { handled: true });
  }
}

/**
 * A paid order, the only way an order exists (OR-B4-055): the signed-in customer closes the cart
 * (a checkout), Mercado Pago approves the whole amount, and the store's order is born.
 */
export async function placePaidOrder(
  base: string,
  mp: FakeMercadoPago,
  prisma: PrismaService,
  p: {
    slug: string;
    companyId: string;
    auth: string;
    items: Array<{ productoId: string; cantidad: number }>;
    entrega?: Record<string, unknown>;
  },
) {
  const opened = await request(base)
    .post(`/${p.slug}/tienda/mis-pedidos`)
    .set('Authorization', p.auth)
    .send({ items: p.items, ...(p.entrega ? { entrega: p.entrega } : {}) })
    .expect(201);
  const owed = Number(opened.body.total) + Number(opened.body.costoEnvio);
  await mp.pay(base, p.companyId, opened.body.checkoutId, owed);
  const checkout = await prisma.checkoutPedido.findUniqueOrThrow({
    where: { id: opened.body.checkoutId },
  });
  const order = await prisma.pedido.findUniqueOrThrow({
    where: { id: checkout.pedidoId as string },
    include: { PedidoItem: true },
  });
  return {
    order,
    checkout: opened.body as {
      checkoutId: string;
      total: string;
      costoEnvio: string;
      pagar: string;
    },
  };
}
