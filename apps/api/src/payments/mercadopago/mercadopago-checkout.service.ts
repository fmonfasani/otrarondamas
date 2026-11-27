import { OrderNoticeService } from '../../customer-notices/order-notice.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EstadoPago, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { StoreService } from '../../store/store.service';

/** Order states after the Business confirmed it (OR-B4-032: pay after confirmation). */
export const PAYABLE_ORDER_STATES = [
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'ASIGNADO',
  'EN_CAMINO',
  'ENTREGADO',
  'PARCIALMENTE_ENTREGADO',
] as const;

/** Mercado Pago payment status → AS-IS Pago state (R8-PAY-002 A1: AS-IS vocabulary). */
export function pagoStateFor(status: string): EstadoPago {
  switch (status) {
    case 'approved':
      return EstadoPago.APROBADO;
    case 'in_process':
    case 'in_mediation':
    case 'authorized':
      return EstadoPago.EN_PROCESO;
    case 'rejected':
      return EstadoPago.RECHAZADO;
    case 'cancelled':
      return EstadoPago.CANCELADO;
    case 'refunded':
    case 'charged_back':
      return EstadoPago.REEMBOLSADO_TOTAL;
    default:
      return EstadoPago.PENDIENTE;
  }
}

/**
 * Mercado Pago's webhook signature: header `x-signature: ts=<ts>,v1=<hmac>`, where v1 is
 * HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"); an alphanumeric
 * data.id is lowercased. Parts missing from the request are left out of the manifest.
 */
export function validMercadoPagoSignature(
  signature: string | undefined,
  requestId: string | undefined,
  dataId: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key.trim(), rest.join('=').trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `${id ? `id:${id};` : ''}${requestId ? `request-id:${requestId};` : ''}ts:${ts};`;
  const expected = Buffer.from(createHmac('sha256', secret).update(manifest).digest('hex'));
  const received = Buffer.from(v1);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

type MercadoPagoPayment = {
  id: number | string;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
  collector_id: number | string;
};

const MONEY_EPSILON = 0.005;

/** Runs a serializable transaction again when Postgres refuses it for a conflict (P2034). */
async function retryOnConflict<T>(run: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const conflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!conflict || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 30));
    }
  }
}

/**
 * OR-B4-032 — a customer pays a confirmed order with Mercado Pago, into the Business's own
 * account. The checkout charges what is still unpaid (R8-PAY-002 D1 partial payments; E1 no
 * overpayment). Payments are recorded only from Mercado Pago's own data, fetched with the
 * Business's token after a signed webhook: never from the browser's return URL.
 */
@Injectable()
export class MercadoPagoCheckoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoCheckoutService.name);
  private sweep?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly orderNotices?: OrderNoticeService,
  ) {}

  /** OR-B4-055: every minute, checkouts left unpaid past their 30 minutes lapse. */
  onModuleInit() {
    this.sweep = setInterval(() => {
      void this.expireUnpaid().catch((error: unknown) =>
        this.logger.warn(
          JSON.stringify({ event: 'checkout.expire.failed', error: String(error).slice(0, 200) }),
        ),
      );
    }, 60_000);
    this.sweep.unref?.();
  }

  onModuleDestroy() {
    if (this.sweep) clearInterval(this.sweep);
  }

  /** Checkouts still waiting for their payment after `venceAt` lapse (every business). */
  async expireUnpaid(now = new Date()) {
    const lapsed = await this.prisma.checkoutPedido.updateMany({
      where: { estado: 'PENDIENTE', venceAt: { lt: now } },
      data: { estado: 'VENCIDO' },
    });
    return lapsed.count;
  }

  /**
   * OR-B4-055 — the Mercado Pago checkout of a checkout (the cart closed to pay it): the whole
   * order, products and delivery. Only for the customer who opened it, while it waits.
   */
  async checkoutPaymentUrl(params: {
    businessId: string;
    customerId: string;
    checkoutId: string;
    storeSlug: string;
  }): Promise<{ url: string }> {
    const { businessId, customerId, checkoutId, storeSlug } = params;
    const checkout = await this.prisma.checkoutPedido.findFirst({
      where: { id: checkoutId, empresaId: businessId, clienteId: customerId },
      select: {
        id: true,
        estado: true,
        venceAt: true,
        total: true,
        costoEnvio: true,
        Cliente: { select: { email: true } },
        Empresa: { select: { nombre: true } },
      },
    });
    if (!checkout) throw new NotFoundException('Pedido no encontrado');
    if (checkout.estado === 'PAGADO') throw new ConflictException('El pedido ya está pagado');
    if (checkout.estado === 'VENCIDO' || checkout.venceAt < new Date()) {
      throw new ConflictException('Pasaron 30 minutos sin pagar: armá el pedido de nuevo.');
    }
    const amount = Math.round((Number(checkout.total) + Number(checkout.costoEnvio)) * 100) / 100;
    return this.preference(businessId, {
      reference: `checkout:${checkout.id}`,
      title: `Pedido en ${checkout.Empresa.nombre}`,
      amount,
      email: checkout.Cliente.email,
      back: (result) =>
        `/tienda/${encodeURIComponent(storeSlug)}/cuenta?pago=${result}&checkout=${checkout.id}`,
      logId: checkout.id,
    });
  }

  private apiUrl() {
    return (process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com').replace(/\/+$/, '');
  }

  /** Approved amount already paid for the order. */
  async paidAmount(businessId: string, orderId: string): Promise<number> {
    const paid = await this.prisma.pago.aggregate({
      where: { empresaId: businessId, pedidoId: orderId, estado: EstadoPago.APROBADO },
      _sum: { monto: true },
    });
    return Number(paid._sum.monto ?? 0);
  }

  /** Mercado Pago checkout URL for what is still unpaid of the customer's confirmed order. */
  async checkoutUrl(params: {
    businessId: string;
    customerId: string;
    orderId: string;
    storeSlug: string;
  }): Promise<{ url: string }> {
    const { businessId, customerId, orderId, storeSlug } = params;
    if (!process.env.MERCADOPAGO_NOTIFICATION_URL) {
      throw new ServiceUnavailableException('Los pagos online todavía no están habilitados');
    }
    const order = await this.prisma.pedido.findFirst({
      where: { id: orderId, empresaId: businessId, clienteId: customerId },
      select: {
        id: true,
        estado: true,
        total: true,
        Cliente: { select: { email: true } },
        Empresa: { select: { nombre: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!(PAYABLE_ORDER_STATES as readonly string[]).includes(order.estado)) {
      throw new ConflictException(
        order.estado === 'CANCELADO'
          ? 'El pedido fue cancelado'
          : 'El comercio todavía no confirmó el pedido. Vas a poder pagarlo cuando lo confirme.',
      );
    }
    const remaining = Number(order.total) - (await this.paidAmount(businessId, orderId));
    if (remaining <= MONEY_EPSILON) throw new ConflictException('El pedido ya está pagado');

    const amount = Math.round(remaining * 100) / 100;
    return this.preference(businessId, {
      reference: order.id,
      title: `Pedido en ${order.Empresa.nombre}`,
      amount,
      email: order.Cliente.email,
      back: (result) =>
        `/tienda/${encodeURIComponent(storeSlug)}/cuenta?pago=${result}&pedido=${order.id}`,
      logId: orderId,
    });
  }

  /** A Mercado Pago preference in the Business's own account; the URL to send the customer to. */
  private async preference(
    businessId: string,
    p: {
      reference: string;
      title: string;
      amount: number;
      email: string | null;
      back: (result: string) => string;
      logId: string;
    },
  ): Promise<{ url: string }> {
    const notificationUrl = process.env.MERCADOPAGO_NOTIFICATION_URL;
    if (!notificationUrl) {
      throw new ServiceUnavailableException('Los pagos online todavía no están habilitados');
    }
    const token = await this.accounts.accessTokenFor(businessId);
    const web = (process.env.WEB_APP_URL || 'https://app.wapsell.com').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl()}/checkout/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Same reference and amount → same preference on a retry.
          'X-Idempotency-Key': `${p.reference}-${p.amount.toFixed(2)}`,
        },
        body: JSON.stringify({
          items: [
            {
              id: p.reference,
              title: p.title,
              quantity: 1,
              unit_price: p.amount,
              currency_id: 'ARS',
            },
          ],
          external_reference: p.reference,
          notification_url: notificationUrl,
          back_urls: {
            success: `${web}${p.back('aprobado')}`,
            pending: `${web}${p.back('pendiente')}`,
            failure: `${web}${p.back('rechazado')}`,
          },
          auto_return: 'approved',
          ...(p.email ? { payer: { email: p.email } } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException('No pudimos comunicarnos con Mercado Pago');
    }
    const preference = (await response.json().catch(() => ({}))) as {
      init_point?: string;
      sandbox_init_point?: string;
    };
    const status = await this.accounts.status(businessId);
    const url = status.liveMode === false ? preference.sandbox_init_point : preference.init_point;
    if (!response.ok || !url) {
      this.logger.warn(
        JSON.stringify({
          event: 'mercadopago.preference.failed',
          status: response.status,
          reference: p.logId,
        }),
      );
      throw new BadRequestException(
        'Mercado Pago no pudo iniciar el pago. Probá de nuevo en unos minutos.',
      );
    }
    return { url };
  }

  /**
   * Webhook from Mercado Pago. Only `payment` notifications matter. The signature is
   * checked first; then the payment is read from Mercado Pago with the token of the
   * Business that owns the collecting account, and must point at an order of that Business.
   * Recording is idempotent per Mercado Pago payment id.
   */
  async handleNotification(input: {
    signature?: string;
    requestId?: string;
    query: Record<string, string | undefined>;
    body: {
      type?: string;
      action?: string;
      user_id?: number | string;
      data?: { id?: string | number };
    };
  }): Promise<{ handled: boolean }> {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '';
    const dataId =
      input.query['data.id'] ??
      (input.body.data?.id !== undefined ? String(input.body.data.id) : undefined);
    if (!validMercadoPagoSignature(input.signature, input.requestId, dataId, secret)) {
      throw new UnauthorizedException('Firma de Mercado Pago inválida');
    }
    const type = input.body.type ?? input.query.type ?? input.query.topic;
    if (type !== 'payment' || !dataId || input.body.user_id === undefined)
      return { handled: false };

    const mpUserId = String(input.body.user_id);
    const businessId = await this.accounts.businessForMercadoPagoUser(mpUserId);
    if (!businessId) {
      this.logger.warn(JSON.stringify({ event: 'mercadopago.webhook.unknown_account', mpUserId }));
      return { handled: false };
    }
    const token = await this.accounts.accessTokenFor(businessId);
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl()}/v1/payments/${encodeURIComponent(dataId)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // Mercado Pago retries the notification when it does not get a 2xx.
      throw new ServiceUnavailableException('No pudimos consultar el pago en Mercado Pago');
    }
    if (!response.ok)
      throw new ServiceUnavailableException('No pudimos consultar el pago en Mercado Pago');
    const payment = (await response.json()) as MercadoPagoPayment;

    if (String(payment.collector_id) !== mpUserId || !payment.external_reference) {
      this.logger.warn(
        JSON.stringify({
          event: 'mercadopago.webhook.mismatch',
          businessId,
          paymentId: String(payment.id),
        }),
      );
      return { handled: false };
    }
    if (payment.external_reference.startsWith('checkout:')) {
      return this.payCheckout(businessId, payment.external_reference.slice(9), payment);
    }
    const order = await this.prisma.pedido.findFirst({
      where: { id: payment.external_reference, empresaId: businessId },
      select: { id: true },
    });
    if (!order) {
      this.logger.warn(
        JSON.stringify({
          event: 'mercadopago.webhook.unknown_order',
          businessId,
          paymentId: String(payment.id),
        }),
      );
      return { handled: false };
    }

    await this.recordPayment(businessId, order.id, payment);
    return { handled: true };
  }

  /**
   * OR-B4-055 — a payment of a checkout. Approved for the whole amount, the checkout becomes the
   * store's order (once) and the payment is recorded on it. Anything else leaves it waiting.
   */
  private async payCheckout(businessId: string, checkoutId: string, payment: MercadoPagoPayment) {
    const checkout = await this.prisma.checkoutPedido.findFirst({
      where: { id: checkoutId, empresaId: businessId },
      select: { id: true, total: true, costoEnvio: true },
    });
    const log = (event: string) =>
      this.logger.warn(
        JSON.stringify({ event, businessId, checkoutId, paymentId: String(payment.id) }),
      );
    if (!checkout) {
      log('mercadopago.webhook.unknown_checkout');
      return { handled: false };
    }
    if (pagoStateFor(payment.status) !== EstadoPago.APROBADO) return { handled: true };
    const owed = Number(checkout.total) + Number(checkout.costoEnvio);
    if (Number(payment.transaction_amount) + MONEY_EPSILON < owed) {
      log('mercadopago.checkout.short_payment');
      return { handled: true };
    }
    const store = this.moduleRef.get(StoreService, { strict: false });
    const { order } = await store.closeCheckout(businessId, checkout.id);
    if (!order) {
      log('mercadopago.checkout.without_order');
      return { handled: false };
    }
    await this.recordPayment(businessId, order.id, payment);
    return { handled: true };
  }

  private async recordPayment(businessId: string, orderId: string, payment: MercadoPagoPayment) {
    const referencia = `mercadopago:${payment.id}`;
    const data = {
      estado: pagoStateFor(payment.status),
      monto: new Prisma.Decimal(payment.transaction_amount),
    };
    const wasApproved = await this.prisma.pago.count({
      where: { empresaId: businessId, referencia, estado: 'APROBADO' },
    });
    // Serializable: two notices of one payment never record it twice. Postgres may refuse one of
    // two payments recorded at the same moment (P2034); that one is simply tried again.
    await retryOnConflict(() =>
      this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.pago.findFirst({
            where: { empresaId: businessId, referencia },
            select: { id: true },
          });
          if (existing) await tx.pago.update({ where: { id: existing.id }, data });
          else
            await tx.pago.create({
              data: {
                ...data,
                empresaId: businessId,
                pedidoId: orderId,
                medio: 'MERCADOPAGO',
                referencia,
              },
            });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    this.logger.log(
      JSON.stringify({
        event: 'mercadopago.payment.recorded',
        businessId,
        orderId,
        paymentId: String(payment.id),
        status: payment.status,
      }),
    );
    // OR-B4-037: the customer reads in their chat that the payment arrived (once).
    if (data.estado === 'APROBADO' && !wasApproved && this.orderNotices) {
      const order = await this.prisma.pedido.findFirst({
        where: { id: orderId, empresaId: businessId },
        select: { id: true, clienteId: true, total: true, numero: true },
      });
      if (order) {
        await this.orderNotices.paid(
          businessId,
          order,
          String(payment.id),
          payment.transaction_amount,
          'MERCADOPAGO',
        );
      }
    }
  }
}
