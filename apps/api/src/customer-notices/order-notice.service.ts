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

type Order = { id: string; clienteId: string; total: unknown; numero?: number | null };

/** «tu pedido N° 12», or «tu pedido» for an order read without its number. */
export const orderName = (order: Pick<Order, 'numero'>) =>
  order.numero ? `tu pedido N° ${order.numero}` : 'tu pedido';

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

  /** OR-B4-053: the order enters the chat as one card that follows its state. */
  received(companyId: string, order: Order) {
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-recibido`,
      `Recibimos ${orderName(order)} por ${money(String(order.total))}. Te avisamos cuando lo confirmemos.`,
      { pedidoId: order.id, numero: order.numero ?? null },
    );
  }

  /** OR-B4-053: the customer ordered again while the order was still open; it grew. */
  added(companyId: string, order: Order, products: number) {
    const what = products === 1 ? '1 producto' : `${products} productos`;
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-suma-${Date.now()}`,
      `Sumamos ${what} a ${orderName(order)}. Total: ${money(String(order.total))}.`,
    );
  }

  /**
   * OR-B4-055: the customer closed the order to pay it (built in the chat, or the store's link).
   * It is not the store's order yet: it becomes one when Mercado Pago approves the payment.
   */
  toPay(
    companyId: string,
    checkout: { id: string; clienteId: string; total: unknown; costoEnvio: unknown },
    url: string,
  ) {
    const amount = Number(checkout.total) + Number(checkout.costoEnvio ?? 0);
    return this.notices.notify(
      companyId,
      checkout.clienteId,
      `checkout-${checkout.id}-pagar`,
      `Tu pedido por ${money(amount)} está listo para pagar con Mercado Pago: ${url} — en cuanto se acredite el pago, lo recibimos.`,
    );
  }

  async confirmed(companyId: string, order: Order, pagosOnline: boolean) {
    let text = `Confirmamos ${orderName(order)} por ${money(String(order.total))}.`;
    // OR-B4-055: an order paid at checkout is already paid; never offer to pay it again.
    const [paid, fee] = await Promise.all([
      this.prisma.pago.aggregate({
        where: { empresaId: companyId, pedidoId: order.id, estado: 'APROBADO' },
        _sum: { monto: true },
      }),
      this.prisma.pedido.findFirst({
        where: { id: order.id, empresaId: companyId },
        select: { costoEnvio: true },
      }),
    ]);
    const owed = Number(order.total) + Number(fee?.costoEnvio ?? 0);
    if (Number(paid._sum.monto ?? 0) + 0.005 >= owed) {
      text += ' Ya está pagado.';
    } else if (pagosOnline) {
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
      `Cancelamos ${orderName(order)}.${reason ? ` Motivo: ${reason}` : ''}`,
    );
  }

  /** Any other status (preparation, delivery…), when something moves the order there. */
  status(companyId: string, order: Order, estado: string) {
    const template = ORDER_NOTICES[estado];
    if (!template) return Promise.resolve();
    const name = orderName(order);
    const text = template.replace('tu pedido', name);
    return this.notices.notify(companyId, order.clienteId, `pedido-${order.id}-${estado}`, text);
  }

  /** OR-B4-055: the money of an order the store did not take went back to the customer. */
  refunded(companyId: string, order: Order, refundId: string, amount: number | string) {
    return this.notices.notify(
      companyId,
      order.clienteId,
      `pedido-${order.id}-reembolso-${refundId}`,
      `Te devolvimos ${money(amount)} por Mercado Pago${order.numero ? ` del pedido N° ${order.numero}` : ''}. Puede tardar unos días en verse en tu cuenta.`,
    );
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
      `Recibimos tu pago de ${money(amount)}${medio === 'MERCADOPAGO' ? ' por Mercado Pago' : ''}${order.numero ? ` para el pedido N° ${order.numero}` : ''}. ¡Gracias!`,
    );
  }
}
