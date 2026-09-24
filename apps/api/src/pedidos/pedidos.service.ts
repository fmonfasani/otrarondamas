import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { ActualizarEstadoPedidoDto } from './dto/actualizar-estado-pedido.dto';

/**
 * Fase 4 de Tienda Online (RF-06): contrapartida del vendedor — la
 * bandeja donde ve y gestiona lo que entró por la tienda pública
 * (tienda.controller.ts, canalOrigen='web') o, en el futuro, por
 * WhatsApp (RF-07, canalOrigen='WhatsApp'). Sin este módulo, un pedido
 * de tienda online queda RECIBIDO sin que nadie del panel lo vea.
 *
 * Solo dos transiciones implementadas hoy (ver ActualizarEstadoPedidoDto):
 * RECIBIDO -> CONFIRMADO (toma el pedido, descuenta stock) o CANCELADO
 * (libera el pedido sin tocar stock). El resto del ciclo de vida
 * (preparación, asignación, entrega) es RF-13, no implementado.
 */
@Injectable()
export class PedidosService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly inventarioService: InventarioService,
  ) {}

  async listar(empresaId: string, estado?: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.pedido.findMany({
      where: estado ? { estado: estado as never } : {},
      include: {
        cliente: { select: { nombre: true, email: true, telefono: true } },
        pedidoItems: { include: { producto: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(id: string, empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const pedido = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        pedidoItems: { include: { producto: { select: { nombre: true } } } },
      },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return pedido;
  }

  async actualizarEstado(
    id: string,
    empresaId: string,
    dto: ActualizarEstadoPedidoDto,
    usuarioId: string,
  ) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const pedido = await db.pedido.findUnique({
      where: { id },
      include: { pedidoItems: true },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // Solo se gestionan pedidos todavía sin tomar — evita que dos
    // vendedores confirmen/cancelen el mismo pedido dos veces (ej. ya
    // CONFIRMADO no vuelve a descontar stock por un segundo click).
    if (pedido.estado !== 'RECIBIDO') {
      throw new BadRequestException(
        `El pedido está en estado ${pedido.estado}, no se puede pasar a ${dto.estado} desde ahí.`,
      );
    }

    if (dto.estado === 'CANCELADO') {
      return db.pedido.update({
        where: { id },
        data: { estado: 'CANCELADO', usuarioId },
      });
    }

    // CONFIRMADO: descuenta stock reusando el mismo mecanismo que
    // VentasService (INV-DISP-01/INV-INV-04) — nunca un segundo camino
    // de descuento en paralelo. Todo en una transacción: si el stock no
    // alcanza para algún ítem, la confirmación entera se revierte (el
    // pedido queda RECIBIDO, no queda "a medio confirmar").
    return db.$transaction(async (tx) => {
      const pedidoConfirmado = await tx.pedido.update({
        where: { id },
        data: { estado: 'CONFIRMADO', usuarioId },
        include: { pedidoItems: true },
      });

      for (const item of pedidoConfirmado.pedidoItems) {
        // motivo 'Venta': confirmar un pedido de tienda online ES una
        // venta real, solo que se originó por ese canal — no se inventa
        // un motivo nuevo (ver InventarioService.descontarStock()).
        await this.inventarioService.descontarStock(
          tx,
          empresaId,
          item.productoId,
          Number(item.cantidad),
          'Venta',
          pedidoConfirmado.id,
          usuarioId,
        );
      }

      return pedidoConfirmado;
    });
  }
}
