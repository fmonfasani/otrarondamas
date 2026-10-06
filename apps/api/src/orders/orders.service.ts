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

    if (dto.estado === 'CANCELADO') {
      return db.pedido.update({
        where: { id },
        data: { estado: 'CANCELADO', usuarioId: userId },
      });
    }

    // CONFIRMADO: deducts stock reusing the same mechanism as SalesService
    // (INV-DISP-01/INV-INV-04) — never a second parallel deduction path.
    // All in one transaction: if stock is not enough for any item, the whole
    // confirmation is rolled back (the order stays RECIBIDO, it is not left
    // 'half confirmed').
    return db.$transaction(async (tx) => {
      const confirmedOrder = await tx.pedido.update({
        where: { id },
        data: { estado: 'CONFIRMADO', usuarioId: userId },
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
