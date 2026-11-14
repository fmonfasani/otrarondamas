import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerNoticeService } from './customer-notice.service';

const money = (n: number | string) =>
  `$ ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** OR-B4-037 — what the customer reads in the chat when their order changes. */
export const ORDER_NOTICES: Record<string, string> = {
  EN_PREPARACION: 'Estamos preparando tu pedido.',
  LISTO: 'Tu pedido está listo.',
  ASIGNADO: 'Tu pedido ya tiene quién lo lleve.',
  EN_CAMINO: 'Tu pedido está en camino.',
  ENTREGADO: 'Entregamos tu pedido. ¡Gracias por tu compra!',
  PARCIALMENTE_ENTREGADO: 'Entregamos una parte de tu pedido; te avisamos por el resto.',
  ENTREGA_FALLIDA: 'No pudimos entregar tu pedido. Te escribimos para coordinar.',
};

type Order = { id: string; clienteId: string; total: unknown };

/**
 * OR-B4-037 — automatic notices of an order in the customer's chat: received, every status
 * change (confirmed with the pay link when the store takes online payments; cancelled with
 * its reason) and each approved payment. One message per order and event; best effort.
 */
@Injectable()
export class OrderNoticeService {
  constructor(
    private readonly notices: CustomerNoticeService,
    private readonly prisma: PrismaService,
  ) {}

  received(companyId: string, order: Order) {
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-recibido`,
      `Recibimos tu pedido por ${money(String(order.total))}. Te avisamos cuando lo confirmemos.`,
    );
  }

  async confirmed(companyId: string, order: Order, pagosOnline: boolean) {
    let text = `Confirmamos tu pedido por ${money(String(order.total))}.`;
    if (pagosOnline) {
      const business = await this.prisma.empresa.findUnique({
        where: { id: companyId },
        select: { slug: true },
      });
      const base = (process.env.WEB_APP_URL ?? 'https://app.wapsell.com').replace(/\/$/, '');
      if (business)
        text += ` Podés pagarlo online desde Mis pedidos: ${base}/tienda/${business.slug}/cuenta`;
    }
    return this.notices.notify(companyId, order.clienteId, `pedido-${order.id}-CONFIRMADO`, text);
  }

  cancelled(companyId: string, order: Order, motivo?: string | null) {
    const reason = motivo?.trim();
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-CANCELADO`,
      `Cancelamos tu pedido.${reason ? ` Motivo: ${reason}` : ''}`,
    );
  }

  /** Any other status (preparation, delivery…), when something moves the order there. */
  status(companyId: string, order: Order, estado: string) {
    const text = ORDER_NOTICES[estado];
    if (!text) return Promise.resolve();
    return this.notices.notify(companyId, order.clienteId, `pedido-${order.id}-${estado}`, text);
  }

  paid(
    companyId: string,
    order: Order,
    paymentKey: string,
    amount: number | string,
    medio: string,
  ) {
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-pago-${paymentKey}`,
      `Recibimos tu pago de ${money(amount)}${medio === 'MERCADOPAGO' ? ' por Mercado Pago' : ''}. ¡Gracias!`,
    );
  }
}
