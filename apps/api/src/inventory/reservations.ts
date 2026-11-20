import { EstadoPedido } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';

// Same pattern as inventory.service.ts: the real types of the company-scoped client.
type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];
type ItemReader = Pick<CompanyScopedTx, 'pedidoItem'>;

/**
 * OR-B4-049 (R8-ORD-002 B1/D1, OR-B4-012): the orders that hold stock. A confirmed order reserves
 * its units until they leave the business (the first of EN_CAMINO / ENTREGADO), and again after a
 * failed delivery brings them back, until it is sent again or cancelled. Reserved units are not
 * sold to anyone else: at the counter, in the chat or in the store.
 */
export const RESERVING_STATES: EstadoPedido[] = [
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'ASIGNADO',
  'ENTREGA_FALLIDA',
];

/**
 * The reservation is computed from the orders themselves (no table of its own): each transition
 * moves it, so it cannot drift from the order states. `excludeOrderId` leaves out one order (the one
 * being confirmed, which checks the stock the others leave free).
 */
export async function reservedByProduct(
  db: ItemReader,
  productIds?: string[],
  excludeOrderId?: string,
): Promise<Map<string, number>> {
  const reserved = new Map<string, number>();
  if (productIds && productIds.length === 0) return reserved;
  const rows = await db.pedidoItem.findMany({
    where: {
      ...(productIds ? { productoId: { in: productIds } } : {}),
      ...(excludeOrderId ? { pedidoId: { not: excludeOrderId } } : {}),
      Pedido: { estado: { in: RESERVING_STATES } },
    },
    select: { productoId: true, cantidad: true },
  });
  for (const row of rows) {
    reserved.set(row.productoId, (reserved.get(row.productoId) ?? 0) + Number(row.cantidad));
  }
  return reserved;
}
