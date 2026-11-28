import { Global, Injectable, Logger, Module } from '@nestjs/common';

/** What changed: a new paid order arrived, or an order the team sees moved. */
export interface OrderChanged {
  businessId: string;
  orderId: string;
  nuevo: boolean;
}

/**
 * Fase 3 (OR-B4-054) — «pedidos en vivo»: whoever creates or moves an order says so here, and the
 * realtime gateway tells the team's open screens. Ids only: the screen reloads through HTTP,
 * which stays the authority on what each person may see. Best-effort, in this process.
 */
@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);
  private readonly listeners = new Set<(event: OrderChanged) => void>();

  onChanged(listener: (event: OrderChanged) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  changed(businessId: string, orderId: string, nuevo = false): void {
    for (const listener of this.listeners) {
      try {
        listener({ businessId, orderId, nuevo });
      } catch (error) {
        this.logger.warn(
          JSON.stringify({ event: 'orders.changed.failed', error: String(error).slice(0, 200) }),
        );
      }
    }
  }
}

/** Global, so the store (a new order), the orders and the gateway share the same one. */
@Global()
@Module({
  providers: [OrderEventsService],
  exports: [OrderEventsService],
})
export class OrderEventsModule {}
