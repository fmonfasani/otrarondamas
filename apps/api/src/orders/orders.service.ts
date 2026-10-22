import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(companyId: string, status?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    return db.pedido.findMany({
      where: status ? { estado: status as never } : {},
      include: {
        cliente: { select: { nombre: true, email: true, telefono: true } },
        pedidoItems: { include: { producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        pedidoItems: { include: { producto: { select: { nombre: true } } } },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return order;
  }

  async updateStatus(id: string, companyId: string, dto: UpdateOrderStatusDto, userId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const order = await db.pedido.findUnique({
      where: { id },
      include: { pedidoItems: true },
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
      return db.pedido.findUniqueOrThrow({ where: { id } });
    }

    // CONFIRMADO: the conditional update is inside the same transaction as
    // stock deduction. If any item lacks stock, the whole transaction rolls
    // back and the order remains RECIBIDO.
    return db.$transaction(async (tx) => {
      const transition = await tx.pedido.updateMany({
        where: { id, estado: 'RECIBIDO' },
        data: { estado: 'CONFIRMADO', usuarioId: userId },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('El pedido ya fue gestionado por otro usuario.');
      }

      const confirmedOrder = await tx.pedido.findUniqueOrThrow({
        where: { id },
        include: { pedidoItems: true },
      });

      for (const item of confirmedOrder.pedidoItems) {
        // reason 'Venta': confirming an online store order IS a real sale, it
        // just originated through that channel — no new reason is invented (see
        // InventoryService.deductStock()).
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
    });
  }
}
