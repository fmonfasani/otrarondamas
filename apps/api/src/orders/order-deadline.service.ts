import {
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderNoticeService } from '../customer-notices/order-notice.service';
import { OrderRefundsService } from '../payments/mercadopago/order-refunds.service';
import { OrdersService } from './orders.service';

/** OR-B4-055 — what the store and the customer read when nobody accepted the order in time. */
export const LATE_REJECTION = 'El negocio no lo aceptó a tiempo';
const SWEEP_MS = 15_000;

/**
 * OR-B4-055 (Owner, 2026-11-27) — a paid order the store does not accept within 3 minutes is
 * rejected automatically and its money goes back. The deadline is the order's own column
 * (aceptarAntes), so a restart never forgets it: a sweep finds the late ones in every business
 * (system client, ADR-DAT-019), cancels each through the usual cancellation (audited, no user)
 * and queues its refund.
 */
@Injectable()
export class OrderDeadlineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderDeadlineService.name);
  private sweep?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly refunds: OrderRefundsService,
    @Optional() private readonly notices?: OrderNoticeService,
  ) {}

  onModuleInit() {
    this.sweep = setInterval(() => {
      void this.rejectLate().catch((error: unknown) =>
        this.logger.warn(
          JSON.stringify({ event: 'order.deadline.failed', error: String(error).slice(0, 200) }),
        ),
      );
    }, SWEEP_MS);
    this.sweep.unref?.();
  }

  onModuleDestroy() {
    if (this.sweep) clearInterval(this.sweep);
  }

  /** Paid orders still waiting for the store past their deadline: rejected and refunded. */
  async rejectLate(now = new Date()) {
    const late = await this.prisma.pedido.findMany({
      where: { estado: 'RECIBIDO', aceptarAntes: { lt: now } },
      select: { id: true, empresaId: true },
      take: 50,
    });
    for (const order of late) {
      try {
        // NOSONAR: one after another, each in its own transaction
        const cancelled = await this.orders.cancelOrder(
          order.id,
          order.empresaId,
          null,
          LATE_REJECTION,
        );
        await this.refunds.enqueueForOrder(order.empresaId, order.id, LATE_REJECTION);
        await this.notices?.cancelled(order.empresaId, cancelled, LATE_REJECTION);
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'order.deadline.reject_failed',
            orderId: order.id,
            error: String(error).slice(0, 200),
          }),
        );
      }
    }
    return late.length;
  }
}
