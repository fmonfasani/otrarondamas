import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { reservedByProduct } from '../inventory/reservations';
import { recordAudit } from '../auditoria/audit-catalog';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CANCELLABLE_STATES, NEXT_STATES, stockLeaves, stockReturns } from './order-states';

// Same pattern as inventory.service.ts: the real types of the company-scoped client.
type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];
type OrderItem = { productoId: string; cantidad: Prisma.Decimal; Producto: { nombre: string } };

/** Quantities in Decimal(18,4): sums of Numbers are rounded back to 4 places. */
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** What an order asks for, per product (a product may come in more than one line). */
function wantedOf(items: OrderItem[]) {
  const wanted = new Map<string, { nombre: string; cantidad: number }>();
  for (const item of items) {
    const current = wanted.get(item.productoId);
    wanted.set(item.productoId, {
      nombre: item.Producto.nombre,
      cantidad: round4((current?.cantidad ?? 0) + Number(item.cantidad)),
    });
  }
  return wanted;
}

/**
 * Phase 4 of the Online Store (RF-06): the seller's counterpart — the
 * inbox where they view and manage what came in through the public store
 * (store.controller.ts, canalOrigen='web') or the chat.
 *
 * #168 and OR-B4-049: the order moves along NEXT_STATES (order-states.ts). Confirming reserves
 * the stock; the stock leaves the business at the first of EN_CAMINO / ENTREGADO; a failed delivery
 * brings it back, still reserved; cancelling is possible until the stock leaves.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async list(companyId: string, status?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    return db.pedido.findMany({
      where: status ? { estado: status as never } : {},
      include: {
        Cliente: { select: { nombre: true, email: true, telefono: true } },
        PedidoItem: { include: { Producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        // Never the customer's store credentials (passwordHash, googleId).
        Cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true,
            esMayorista: true,
          },
        },
        PedidoItem: { include: { Producto: { select: { nombre: true } } } },
        // OR-B4-032: online payments of the order (Mercado Pago), newest first.
        // OR-B4-055: refunds of a paid order the store did not take (kept, with their attempts).
        ReembolsoPedido: {
          select: {
            id: true,
            monto: true,
            motivo: true,
            estado: true,
            intentos: true,
            ultimoError: true,
            realizadoAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        Pago: {
          select: { id: true, monto: true, estado: true, medio: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    // Stable, frontend-facing fields (owner decision 2026-11-09), added next to
    // the raw Prisma relations so existing consumers keep working. Amounts and
    // quantities keep the API's Decimal-as-string convention, and `estado` is
    // the real EstadoPedido: clients decide how to display it.
    return {
      ...order,
      cliente: {
        id: order.Cliente.id,
        nombre: order.Cliente.nombre,
        email: order.Cliente.email,
        telefono: order.Cliente.telefono,
      },
      items: order.PedidoItem.map((item) => ({
        productId: item.productoId,
        productName: item.Producto.nombre,
        quantity: item.cantidad,
        price: item.precioUnitario,
        discount: item.descuentoItem,
      })),
    };
  }

  /**
   * #168 and OR-B4-049: moves an order to the next state, with its stock effect.
   * - CONFIRMADO (ORDER_CONFIRM) reserves: each product needs what the order asks for, free of the
   *   other orders' reservations. Nothing physical moves (R8-ORD-002 B1: confirming is not the
   *   stock exit).
   * - The first of EN_CAMINO / ENTREGADO is the stock exit: what the order has not taken out yet
   *   leaves through deductStock (FEFO with a date, FIFO without one), as 'Venta' movements of the
   *   order with their cost.
   * - ENTREGA_FALLIDA brings the goods back to the lots they left from; they stay reserved for the
   *   order until it is sent again, picked up or cancelled.
   * - CANCELADO goes through cancelOrder (the same rules as POST /pedidos/:id/cancel).
   *
   * The transition is claimed with the current state as a predicate inside a SERIALIZABLE
   * transaction: two people moving the same order, or two orders competing for the last units, end
   * with exactly one winner (the other gets a 400 and nothing changes).
   */
  async updateStatus(id: string, companyId: string, dto: UpdateOrderStatusDto, userId: string) {
    if (dto.estado === 'CANCELADO') {
      return this.cancelOrder(id, companyId, userId);
    }
    const db = this.prismaFactory.forCompany(companyId);
    try {
      return await db.$transaction(
        async (tx) => {
          const order = await tx.pedido.findUnique({
            where: { id },
            include: { PedidoItem: { include: { Producto: { select: { nombre: true } } } } },
          });
          if (!order) {
            throw new NotFoundException('Pedido no encontrado');
          }
          if (!NEXT_STATES[order.estado].includes(dto.estado)) {
            throw new BadRequestException(
              `El pedido está en estado ${order.estado}, no se puede pasar a ${dto.estado} desde ahí.`,
            );
          }
          const claimed = await tx.pedido.updateMany({
            where: { id, estado: order.estado },
            data: { estado: dto.estado, usuarioId: userId },
          });
          if (claimed.count !== 1) {
            throw new BadRequestException('El pedido ya fue gestionado por otro usuario.');
          }

          if (dto.estado === 'CONFIRMADO') {
            await this.reserve(tx, companyId, order.id, order.PedidoItem);
          } else if (stockLeaves(order.estado, dto.estado)) {
            await this.takeOut(tx, companyId, order.id, order.PedidoItem, userId);
          } else if (stockReturns(order.estado, dto.estado)) {
            await this.bringBack(tx, companyId, order.id, userId, 'Entrega fallida');
          }

          await recordAudit(tx, companyId, userId, {
            accion: 'PEDIDO_ESTADO',
            entidad: 'Pedido',
            entidadId: id,
            antes: { estado: order.estado },
            despues: { estado: dto.estado },
          });
          return tx.pedido.findUniqueOrThrow({ where: { id }, include: { PedidoItem: true } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // PostgreSQL SERIALIZABLE can abort the losing concurrent move with SQLSTATE 40001
      // (Prisma P2034): the same order moved twice, or two orders taking the same last units.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException(
          'El pedido ya fue gestionado por otro usuario, o su stock cambió al mismo tiempo. Actualizá y probá de nuevo.',
        );
      }
      throw error;
    }
  }

  /**
   * P2-3: Cancel an order, with an optional reason and audit logging.
   *
   * OR-B4-049 / R8-ORD-002 D1: an order is cancelled before its stock leaves (RECIBIDO,
   * CONFIRMADO, EN_PREPARACION, LISTO, ASIGNADO) or after a failed delivery (ENTREGA_FALLIDA).
   * Cancelling releases the reservation (a CANCELADO order holds nothing) without inventing a
   * movement. Whatever of the order is still out of the business comes back once, at the cost it
   * left with: an order confirmed before stage B3 had its stock deducted when it was confirmed. A
   * failed delivery already brought its goods back, so nothing comes back twice.
   * Once the stock left (EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO) the answer is 409.
   *
   * - Idempotent: cancelling a CANCELADO order answers 200 with stockReversedItems 0 (owner
   *   decision 2026-11-09), and stock is never reversed twice.
   * - Audit: CANCELAR_ORDEN, with the state, the items and how many lots came back.
   * - Concurrency: SERIALIZABLE; exactly one concurrent cancellation wins, the loser re-reads the
   *   order and answers the idempotent result.
   */
  /** `userId` null: cancelled by Wapsell itself (OR-B4-055: not accepted in time, or by the customer). */
  async cancelOrder(
    id: string,
    companyId: string,
    userId: string | null,
    motivo?: string,
  ): Promise<any> {
    const db = this.prismaFactory.forCompany(companyId);

    try {
      return await db.$transaction(
        async (tx) => {
          const order = await tx.pedido.findUnique({
            where: { id },
            include: { PedidoItem: true },
          });

          if (!order) {
            throw new NotFoundException('Pedido no encontrado');
          }

          // Idempotency first: an already-cancelled order is a no-op success.
          if (order.estado === 'CANCELADO') {
            return {
              ...order,
              stockReversedItems: 0,
            };
          }

          if (!CANCELLABLE_STATES.includes(order.estado)) {
            throw new ConflictException(
              `El pedido está en estado ${order.estado} y no puede ser cancelado: su mercadería ya salió del local. Se cancela antes de que salga, o después de una entrega fallida.`,
            );
          }

          // Atomic state transition: exactly one concurrent cancellation succeeds.
          const transition = await tx.pedido.updateMany({
            where: { id, estado: { not: 'CANCELADO' } },
            data: {
              estado: 'CANCELADO',
              ...(userId ? { usuarioId: userId } : {}),
              updatedAt: new Date(),
            },
          });

          if (transition.count === 0) {
            // Another concurrent request already cancelled it: settled below.
            throw new ConcurrentCancellation();
          }

          const stockReversedItems = await this.bringBack(
            tx,
            companyId,
            id,
            userId,
            `Reversión por cancelación de pedido: ${motivo || 'sin motivo especificado'}`,
          );

          await tx.auditLog.create({
            data: {
              empresaId: companyId,
              usuarioId: userId,
              accion: 'CANCELAR_ORDEN',
              entidadAfectada: 'Pedido',
              entidadId: id,
              motivo: motivo || undefined,
              valoresAnteriores: { estado: order.estado },
              valoresPosteriores: {
                estado: 'CANCELADO',
                stockReversedItems,
                itemsCount: order.PedidoItem.length,
              },
            },
          });

          const cancelledOrder = await tx.pedido.findUniqueOrThrow({
            where: { id },
            include: { PedidoItem: true },
          });

          return {
            ...cancelledOrder,
            stockReversedItems,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      // PostgreSQL SERIALIZABLE can abort the losing concurrent cancellation
      // with SQLSTATE 40001 (Prisma P2034) before updateMany returns count=0.
      // This is an expected state conflict, not an internal server error.
      const lostRace =
        error instanceof ConcurrentCancellation ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034');
      if (lostRace) {
        // The winner reversed the stock; answer the same idempotent result a
        // repeated cancel gets, instead of an error.
        const current = await db.pedido.findUnique({
          where: { id },
          include: { PedidoItem: true },
        });
        if (current?.estado === 'CANCELADO') {
          return { ...current, stockReversedItems: 0 };
        }
        throw new ConflictException('El pedido cambió de estado mientras se cancelaba.');
      }
      throw error;
    }
  }

  /** OR-B4-049: confirming reserves; every product needs what the order asks for, free of others. */
  private async reserve(
    tx: CompanyScopedTx,
    companyId: string,
    orderId: string,
    items: OrderItem[],
  ) {
    const wanted = wantedOf(items);
    const productIds = [...wanted.keys()];
    const lots = await tx.lote.findMany({
      where: { empresaId: companyId, productoId: { in: productIds } },
      select: { productoId: true, cantidad: true },
    });
    const stock = new Map<string, number>();
    for (const lot of lots) {
      stock.set(lot.productoId, (stock.get(lot.productoId) ?? 0) + Number(lot.cantidad));
    }
    const reserved = await reservedByProduct(tx, productIds, orderId);
    for (const [productId, want] of wanted) {
      const available = round4((stock.get(productId) ?? 0) - (reserved.get(productId) ?? 0));
      if (available < want.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para «${want.nombre}»: disponible ${Math.max(0, available)}, pedido ${want.cantidad}.`,
        );
      }
    }
  }

  /** OR-B4-049: the stock exit. What the order has not taken out yet leaves FEFO/FIFO, with its cost. */
  private async takeOut(
    tx: CompanyScopedTx,
    companyId: string,
    orderId: string,
    items: OrderItem[],
    userId: string,
  ) {
    const out = await this.outOf(tx, companyId, orderId);
    for (const [productId, want] of wantedOf(items)) {
      const pending = round4(want.cantidad - (out.get(productId) ?? 0));
      if (pending > 0) {
        await this.inventoryService.deductStock(
          tx,
          companyId,
          productId,
          pending,
          'Venta',
          orderId,
          userId,
        );
      }
    }
  }

  /** What of the order is out of the business, per product: its exits minus what came back. */
  private async outOf(tx: CompanyScopedTx, companyId: string, orderId: string) {
    const movements = await tx.movimientoStock.findMany({
      where: { empresaId: companyId, referenciaId: orderId },
      select: { productoId: true, tipoMovimiento: true, cantidad: true },
    });
    const out = new Map<string, number>();
    for (const m of movements) {
      const sign = m.tipoMovimiento === 'Salida' ? 1 : -1;
      out.set(m.productoId, round4((out.get(m.productoId) ?? 0) + sign * Number(m.cantidad)));
    }
    return out;
  }

  /**
   * What of the order is out of the business comes back to the lots it left from, at the cost it
   * left with (ADR-DAT-009). Returns how many lots got something back.
   */
  private async bringBack(
    tx: CompanyScopedTx,
    companyId: string,
    orderId: string,
    userId: string | null,
    reason: string,
  ) {
    const movements = await tx.movimientoStock.findMany({
      where: { empresaId: companyId, referenciaId: orderId },
      orderBy: { createdAt: 'asc' },
      select: {
        productoId: true,
        loteId: true,
        tipoMovimiento: true,
        cantidad: true,
        costoUnitario: true,
      },
    });
    const byLot = new Map<
      string,
      { productoId: string; net: number; costo: Prisma.Decimal | null }
    >();
    for (const m of movements) {
      if (!m.loteId) continue;
      const entry = byLot.get(m.loteId) ?? { productoId: m.productoId, net: 0, costo: null };
      if (m.tipoMovimiento === 'Salida') {
        entry.net = round4(entry.net + Number(m.cantidad));
        entry.costo = entry.costo ?? m.costoUnitario;
      } else {
        entry.net = round4(entry.net - Number(m.cantidad));
      }
      byLot.set(m.loteId, entry);
    }

    let lots = 0;
    for (const [loteId, entry] of byLot) {
      if (entry.net <= 0) continue;
      await tx.movimientoStock.create({
        data: {
          empresaId: companyId,
          productoId: entry.productoId,
          loteId,
          tipoMovimiento: 'Entrada',
          cantidad: entry.net,
          motivo: reason,
          referenciaId: orderId,
          usuarioId: userId,
          loteVencidoAlMomento: false,
          costoUnitario: entry.costo,
        },
      });
      const added = await tx.lote.updateMany({
        where: { id: loteId, empresaId: companyId },
        data: { cantidad: { increment: entry.net } },
      });
      if (added.count !== 1) {
        throw new BadRequestException(`Lote ${loteId} no encontrado al devolver el stock.`);
      }
      lots += 1;
    }
    return lots;
  }
}

// Internal signal: a concurrent request cancelled the order first.
class ConcurrentCancellation extends Error {}
