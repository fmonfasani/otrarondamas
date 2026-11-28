import {
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderNoticeService } from '../../customer-notices/order-notice.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';

/** Minutes to wait after each failed attempt; after the last one the refund is FALLIDO. */
export const REFUND_BACKOFF_MINUTES = [1, 5, 15, 60, 180, 720];
const SWEEP_MS = 20_000;
/** While one attempt runs, no other sweep takes the same refund. */
const LEASE_MS = 120_000;

/**
 * OR-B4-055 (Owner, 2026-11-27) — every paid order the store does not take is refunded by
 * Mercado Pago, without anyone doing anything: rejected because nobody accepted it within 3
 * minutes, cancelled by the store, or cancelled by the customer before it was accepted. Each
 * refund is a row (ReembolsoPedido) with its attempts, so a restart loses nothing; a sweep asks
 * Mercado Pago again with a growing wait. Uses the system client (ADR-DAT-019): the sweep spans
 * every business, and each row carries its business.
 */
@Injectable()
export class OrderRefundsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderRefundsService.name);
  private sweep?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    @Optional() private readonly notices?: OrderNoticeService,
  ) {}

  onModuleInit() {
    this.sweep = setInterval(() => {
      void this.processDue().catch((error: unknown) =>
        this.logger.warn(
          JSON.stringify({ event: 'refund.sweep.failed', error: String(error).slice(0, 200) }),
        ),
      );
    }, SWEEP_MS);
    this.sweep.unref?.();
  }

  onModuleDestroy() {
    if (this.sweep) clearInterval(this.sweep);
  }

  private apiUrl() {
    return (process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com').replace(/\/+$/, '');
  }

  /** Every approved Mercado Pago payment of the order becomes a pending refund, once each. */
  async enqueueForOrder(companyId: string, pedidoId: string, motivo: string) {
    const pagos = await this.prisma.pago.findMany({
      where: { empresaId: companyId, pedidoId, estado: 'APROBADO', medio: 'MERCADOPAGO' },
      select: { id: true, monto: true },
    });
    if (pagos.length === 0) return 0;
    const created = await this.prisma.reembolsoPedido.createMany({
      data: pagos.map((pago) => ({
        empresaId: companyId,
        pedidoId,
        pagoId: pago.id,
        monto: pago.monto,
        motivo,
      })),
      skipDuplicates: true,
    });
    // Try at once; the sweep takes over if Mercado Pago does not answer now.
    void this.processDue().catch(() => undefined);
    return created.count;
  }

  /** Refunds due now: each one claimed (so a parallel sweep skips it) and attempted. */
  async processDue(now = new Date()) {
    const due = await this.prisma.reembolsoPedido.findMany({
      where: { estado: 'PENDIENTE', proximoIntento: { lte: now } },
      orderBy: { proximoIntento: 'asc' },
      take: 10,
    });
    for (const refund of due) {
      const claimed = await this.prisma.reembolsoPedido.updateMany({
        where: { id: refund.id, estado: 'PENDIENTE', proximoIntento: refund.proximoIntento },
        data: { proximoIntento: new Date(now.getTime() + LEASE_MS) },
      });
      if (claimed.count === 1) await this.attempt(refund); // NOSONAR: one after another
    }
  }

  private async attempt(refund: {
    id: string;
    empresaId: string;
    pedidoId: string;
    pagoId: string;
    monto: unknown;
    intentos: number;
  }) {
    try {
      const pago = await this.prisma.pago.findFirst({
        where: { id: refund.pagoId, empresaId: refund.empresaId },
        select: { referencia: true },
      });
      const paymentId = pago?.referencia?.startsWith('mercadopago:')
        ? pago.referencia.slice('mercadopago:'.length)
        : null;
      if (!paymentId) throw new Error('El pago no tiene referencia de Mercado Pago');
      const token = await this.accounts.accessTokenFor(refund.empresaId);
      const response = await fetch(
        `${this.apiUrl()}/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            // Asking again for the same refund never returns money twice.
            'X-Idempotency-Key': `refund-${refund.id}`,
          },
          body: '{}',
          signal: AbortSignal.timeout(15000),
        },
      );
      const body = (await response.json().catch(() => ({}))) as { id?: unknown; message?: string };
      if (!response.ok) {
        throw new Error(
          `Mercado Pago respondió ${response.status}${body.message ? `: ${body.message}` : ''}`,
        );
      }
      await this.prisma.$transaction([
        this.prisma.reembolsoPedido.update({
          where: { id: refund.id },
          data: {
            estado: 'REALIZADO',
            intentos: refund.intentos + 1,
            referenciaMp: body.id === undefined ? null : String(body.id),
            realizadoAt: new Date(),
            ultimoError: null,
          },
        }),
        this.prisma.pago.update({
          where: { id: refund.pagoId },
          data: { estado: 'REEMBOLSADO_TOTAL' },
        }),
      ]);
      const order = await this.prisma.pedido.findFirst({
        where: { id: refund.pedidoId, empresaId: refund.empresaId },
        select: { id: true, clienteId: true, total: true, numero: true },
      });
      if (order)
        await this.notices?.refunded(refund.empresaId, order, refund.id, String(refund.monto));
    } catch (error) {
      const intentos = refund.intentos + 1;
      const wait = REFUND_BACKOFF_MINUTES[intentos - 1];
      const ultimoError = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      await this.prisma.reembolsoPedido.update({
        where: { id: refund.id },
        data:
          wait === undefined
            ? { estado: 'FALLIDO', intentos, ultimoError }
            : { intentos, ultimoError, proximoIntento: new Date(Date.now() + wait * 60_000) },
      });
      this.logger.warn(
        JSON.stringify({
          event: wait === undefined ? 'refund.failed' : 'refund.retry',
          refundId: refund.id,
          businessId: refund.empresaId,
          intentos,
        }),
      );
    }
  }
}
