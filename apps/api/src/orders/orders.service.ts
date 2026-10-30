import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

/**
 * Phase 4 of the Online Store (RF-06): the seller's counterpart — the
 * inbox where they view and manage what came in through the public store
 * (store.controller.ts, canalOrigen='web') or, in the future, through
 * WhatsApp (RF-07, canalOrigen='WhatsApp'). Without this module, an online
 * store order stays RECIBIDO without anyone in the panel seeing it.
 *
 * Only two transitions implemented today (see UpdateOrderStatusDto):
 * RECIBIDO -> CONFIRMADO (takes the order, deducts stock) or CANCELADO
 * (releases the order without touching stock). The rest of the lifecycle
 * (preparation, assignment, delivery) is RF-13, not implemented.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async list(businessId: string, status?: string) {
    const db = this.prismaFactory.forCompany(businessId);
    return db.pedido.findMany({
      where: status ? { estado: status as never } : {},
      include: {
        Cliente: { select: { nombre: true, email: true, telefono: true } },
        PedidoItem: { include: { Producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);
    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        Cliente: true,
        PedidoItem: { include: { Producto: { select: { nombre: true } } } },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return order;
  }

  async updateStatus(id: string, businessId: string, dto: UpdateOrderStatusDto, userId: string) {
    const db = this.prismaFactory.forCompany(businessId);
    const order = await db.pedido.findUnique({
      where: { id },
      include: { PedidoItem: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // Only orders not yet taken are managed — prevents two sellers from
    // confirming/cancelling the same order twice (e.g. an already CONFIRMADO
    // order does not deduct stock again on a second click).
    if (order.estado !== 'RECIBIDO') {
      throw new BadRequestException(
        `El pedido está en estado ${order.estado}, no se puede pasar a ${dto.estado} desde ahí.`,
      );
    }

    // State transitions must be claimed atomically. The earlier read above
    // is useful for a clear error, but cannot prevent two concurrent requests
    // from both observing RECIBIDO. updateMany with the current state as a
    // predicate makes exactly one request win; the loser never deducts stock.
    if (dto.estado === 'CANCELADO') {
      const transition = await db.pedido.updateMany({
        where: { id, estado: 'RECIBIDO' },
        data: { estado: 'CANCELADO', usuarioId: userId },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('El pedido ya fue gestionado por otro usuario.');
      }
      const order = await db.pedido.findUniqueOrThrow({
        where: { id },
        include: { PedidoItem: true },
      });
      return order;
    }

    // CONFIRMADO: atomically update with Prisma SERIALIZABLE isolation +
    // conditional updateMany. The updateMany will fail (count=0) if the order
    // is not RECIBIDO, ensuring exactly one concurrent request succeeds.
    try {
      return await db.$transaction(
        async (tx) => {
          // Atomic: only transition if estado is RECIBIDO. This is the gate.
          const updated = await tx.pedido.updateMany({
            where: { id, estado: 'RECIBIDO' },
            data: { estado: 'CONFIRMADO', usuarioId: userId },
          });

          if (updated.count === 0) {
            throw new BadRequestException('El pedido ya fue gestionado por otro usuario.');
          }

          const confirmedOrder = await tx.pedido.findUniqueOrThrow({
            where: { id },
            include: { PedidoItem: true },
          });

          for (const item of confirmedOrder.PedidoItem) {
            await this.inventoryService.deductStock(
              tx,
              companyId,
              item.productoId,
              Number(item.cantidad),
              'Venta',
              confirmedOrder.id,
              userId,
            );
          }

          return confirmedOrder;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      // PostgreSQL SERIALIZABLE can abort the losing concurrent confirmation
      // with SQLSTATE 40001 (Prisma P2034) before updateMany returns count=0.
      // This is an expected state conflict, not an internal server error.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException('El pedido ya fue gestionado por otro usuario.');
      }
      throw error;
    }
  }

  /**
   * P2-3: Cancel an order with stock reversal and audit logging.
   *
   * Allowed preconditions: RECIBIDO, CONFIRMADO, ENTREGA_FALLIDA
   * Blocked states: EN_PREPARACION, LISTO, ASIGNADO, EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO
   *
   * Stock reversal algorithm (if CONFIRMADO):
   * - Find all MovimientoStock entries of type 'Salida' (EGRESO) for this order
   * - For each EGRESO: create matching ENTRADA in same batch with same quantity
   * - Update Lote.cantidad: qty += EGRESO.cantidad (stock reversal)
   * - Validate: stock never goes negative after reversal
   * - Idempotent: Multiple cancellations = safe (no double-reversal because estado=CANCELADO)
   *
   * Audit logging:
   * - Event type: CANCELAR_ORDEN
   * - Logged fields: actor, timestamp, order state, stock reversed items count, refund status
   * - Link to order: entidadId=order.id, entidadAfectada=Pedido
   *
   * Concurrency safety:
   * - SERIALIZABLE isolation level prevents race conditions
   * - Only one concurrent cancellation succeeds (others get P2034)
   * - Failed cancellations throw BadRequestException cleanly (not 500)
   *
   * Error handling:
   * - 404 Not Found: Order not found
   * - 409 Conflict: Order in non-cancellable state (EN_PREP+)
   * - 422 Unprocessable: Stock reversal would violate constraints
   */
  async cancelOrder(id: string, businessId: string, userId: string, motivo?: string): Promise<Record<string, unknown>> {
    const db = this.prismaFactory.forCompany(businessId);

    try {
      return await db.$transaction(
        async (tx) => {
          // Initial read to validate order exists and check state
          const order = await tx.pedido.findUnique({
            where: { id },
            include: { PedidoItem: true },
          });

          if (!order) {
            throw new NotFoundException('Pedido no encontrado');
          }

          // Check if order is in a cancellable state
          const cancellableStates = ['RECIBIDO', 'CONFIRMADO', 'ENTREGA_FALLIDA'];
          if (!cancellableStates.includes(order.estado)) {
            throw new ConflictException(
              `El pedido está en estado ${order.estado} y no puede ser cancelado. Solo se pueden cancelar pedidos en estados: RECIBIDO, CONFIRMADO o ENTREGA_FALLIDA.`,
            );
          }

          // If already CANCELADO, idempotency: return success (no-op)
          if (order.estado === 'CANCELADO') {
            return {
              ...order,
              stockReversedItems: 0,
            };
          }

          // Atomic state transition: only transition if not yet CANCELADO
          // This ensures exactly one concurrent cancellation succeeds
          const transition = await tx.pedido.updateMany({
            where: { id, estado: { not: 'CANCELADO' } },
            data: { estado: 'CANCELADO', usuarioId: userId, updatedAt: new Date() },
          });

          if (transition.count === 0) {
            // Another concurrent request already cancelled it (or it transitioned out)
            throw new BadRequestException('El pedido ya fue cancelado por otro usuario.');
          }

          // Stock reversal: if order was CONFIRMADO, reverse all EGRESO movements
          let stockReversedItems = 0;
          if (order.estado === 'CONFIRMADO') {
            // Find all EGRESO movements for this order
            const egressos = await tx.movimientoStock.findMany({
              where: {
                businessId: businessId,
                referenciaId: id,
                tipoMovimiento: 'Salida',
              },
              include: { Lote: true },
            });

            // Create matching ENTRADA for each EGRESO to reverse stock
            for (const egreso of egressos) {
              // Verify batch still exists and get current state
              const batch = await tx.lote.findUnique({
                where: { id: egreso.loteId },
              });

              if (!batch) {
                throw new BadRequestException(
                  `Lote ${egreso.loteId} no encontrado durante reversión de stock.`,
                );
              }

              // Create ENTRADA to reverse the EGRESO
              await tx.movimientoStock.create({
                data: {
                  businessId: businessId,
                  productoId: egreso.productoId,
                  loteId: egreso.loteId,
                  tipoMovimiento: 'Entrada',
                  cantidad: egreso.cantidad,
                  motivo: `Reversión por cancelación de pedido: ${motivo || 'sin motivo especificado'}`,
                  referenciaId: id,
                  usuarioId: userId,
                  loteVencidoAlMomento: false, // Reversing stock, not expired
                },
              });

              // Update batch quantity: add back the reversed amount
              await tx.lote.update({
                where: { id: egreso.loteId },
                data: { cantidad: { increment: egreso.cantidad } },
              });

              stockReversedItems += 1;
            }
          }

          // Create audit log entry
          await tx.auditLog.create({
            data: {
              businessId: businessId,
              usuarioId: userId,
              accion: 'CANCELAR_ORDEN',
              entidadAfectada: 'Pedido',
              entidadId: id,
              motivo: motivo || undefined,
              valoresPosteriores: {
                estado: 'CANCELADO',
                stockReversedItems,
                itemsCount: order.PedidoItem.length,
              },
            },
          });

          // Return the cancelled order with cancellation metadata
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException('El pedido ya fue cancelado por otro usuario.');
      }
      throw error;
    }
  }
}
