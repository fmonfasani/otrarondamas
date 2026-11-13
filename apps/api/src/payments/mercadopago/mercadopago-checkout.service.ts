import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { EstadoPago, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';

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

/**
 * OR-B4-032 — a customer pays a confirmed order with Mercado Pago, into the Business's own
 * account. The checkout charges what is still unpaid (R8-PAY-002 D1 partial payments; E1 no
 * overpayment). Payments are recorded only from Mercado Pago's own data, fetched with the
 * Business's token after a signed webhook: never from the browser's return URL.
 */
@Injectable()
export class MercadoPagoCheckoutService {
  private readonly logger = new Logger(MercadoPagoCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
  ) {}

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
    const notificationUrl = process.env.MERCADOPAGO_NOTIFICATION_URL;
    if (!notificationUrl) {
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

    const token = await this.accounts.accessTokenFor(businessId);
    const amount = Math.round(remaining * 100) / 100;
    const web = (process.env.WEB_APP_URL || 'https://app.wapsell.com').replace(/\/+$/, '');
    const back = (result: string) =>
      `${web}/tienda/${encodeURIComponent(storeSlug)}/cuenta?pago=${result}&pedido=${order.id}`;

    let response: Response;
    try {
      response = await fetch(`${this.apiUrl()}/checkout/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Same order and amount → same preference on a retry.
          'X-Idempotency-Key': `${order.id}-${amount.toFixed(2)}`,
        },
        body: JSON.stringify({
          items: [
            {
              id: order.id,
              title: `Pedido en ${order.Empresa.nombre}`,
              quantity: 1,
              unit_price: amount,
              currency_id: 'ARS',
            },
          ],
          external_reference: order.id,
          notification_url: notificationUrl,
          back_urls: {
            success: back('aprobado'),
            pending: back('pendiente'),
            failure: back('rechazado'),
          },
          auto_return: 'approved',
          ...(order.Cliente.email ? { payer: { email: order.Cliente.email } } : {}),
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
          orderId,
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

  private async recordPayment(businessId: string, orderId: string, payment: MercadoPagoPayment) {
    const referencia = `mercadopago:${payment.id}`;
    const data = {
      estado: pagoStateFor(payment.status),
      monto: new Prisma.Decimal(payment.transaction_amount),
    };
    await this.prisma.$transaction(
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
  }
}
