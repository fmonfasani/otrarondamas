import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDevolucionDto,
  CreateDevolucionItemDto,
  ProcessRefundDto,
  RETURN_REASONS,
  ReceiveDevolucionDto,
} from './dto';
import { ReturnNotifierService } from './return-notifier.service';

/** OR-B4-034: a sale can be returned up to 10 days after it was made. */
export const RETURN_WINDOW_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const DESTINATION_NOTE = {
  REINGRESO: 'Destino: vuelve a la venta',
  DESCARTE: 'Destino: descarte',
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** OR-B4-035 rule 6 — the stored reason: the fixed label plus the comment, if any. */
export const reasonText = (item: Pick<CreateDevolucionItemDto, 'motivoCodigo' | 'motivo'>) => {
  const label = RETURN_REASONS[item.motivoCodigo];
  const comment = item.motivo?.trim();
  return comment ? `${label}: ${comment}` : label;
};

/**
 * OR-B4-035 — a return closed without a refund (cancelled, or rejected after inspection) is
 * stored as PROCESADA with a RECHAZADO refund whose result starts with one of these.
 */
export const CLOSED_PREFIX = { CANCEL: 'Cancelada', REJECT: 'Rechazada tras inspección' } as const;

/**
 * Customer returns (OR-B4-034), registered by the team from the original sale:
 *   SOLICITADA → AUTORIZADA → RECIBIDA (each product inspected: back on sale or discarded)
 *   → PROCESADA (refund by the method the sale was paid with).
 * A return never edits the Sale (workshop item 392). Stock moves only when a product is
 * received and inspected back on sale, into the lots the sale took it from. A cash refund
 * leaves the open register as a 'Devolucion' movement; other methods are recorded for the
 * team to return by hand (Wapsell does not move that money).
 * Every query is scoped by the Business explicitly.
 */
@Injectable()
export class DevolucionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: ReturnNotifierService,
  ) {}

  private readonly include = {
    Cliente: { select: { id: true, nombre: true } },
    Venta: { select: { id: true, numero: true, createdAt: true } },
    DevolucionClienteItem: {
      include: { VentaItem: { select: { Producto: { select: { nombre: true } } } } },
      orderBy: { createdAt: 'asc' as const },
    },
    Reembolso: true,
  } satisfies Prisma.DevolucionClienteInclude;

  private view(
    row: Prisma.DevolucionClienteGetPayload<{ include: DevolucionesService['include'] }>,
  ) {
    return {
      id: row.id,
      numero: row.numeroDevolucion,
      estado: row.estado,
      ventaId: row.ventaId,
      ventaNumero: row.Venta.numero,
      ventaFecha: row.ventaFecha,
      cliente: row.Cliente,
      motivo: row.motivo,
      observaciones: row.observaciones,
      montoReembolsable: row.montoReembolsable.toString(),
      fechaSolicitud: row.fechaSolicitud,
      fechaAutorizacion: row.fechaAutorizacion,
      fechaRecibida: row.fechaRecibida,
      fechaProcesada: row.fechaProcesada,
      items: row.DevolucionClienteItem.map((item) => ({
        id: item.id,
        ventaItemId: item.ventaItemId,
        productoId: item.productoId,
        producto: item.VentaItem.Producto.nombre,
        cantidad: Number(item.cantidad),
        precioDevuelto: item.precioDevuelto.toString(),
        monto: item.montoLineaDevuelto.toString(),
        motivo: item.motivo,
        destino: item.observaciones,
      })),
      reembolso: row.Reembolso
        ? {
            estado: row.Reembolso.estado,
            metodo: row.Reembolso.metodoReembolso,
            monto: row.Reembolso.montoActual.toString(),
            resultado: row.Reembolso.resultado,
          }
        : null,
    };
  }

  private async load(companyId: string, id: string) {
    const row = await this.prisma.devolucionCliente.findFirst({
      where: { id, empresaId: companyId },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Devolución no encontrada');
    return row;
  }

  /** What each line of the sale is worth per unit, after the customer's discount. */
  private unitNet(item: {
    precioUnitario: Prisma.Decimal;
    cantidad: Prisma.Decimal;
    descuentoItem: Prisma.Decimal;
    descuentoFidelizacionPorcentaje: Prisma.Decimal | null;
  }) {
    const qty = Number(item.cantidad);
    const pct = item.descuentoFidelizacionPorcentaje
      ? Number(item.descuentoFidelizacionPorcentaje)
      : 0;
    const lineTotal =
      Number(item.precioUnitario) * qty * (1 - pct / 100) - Number(item.descuentoItem);
    return qty > 0 ? lineTotal / qty : 0;
  }

  async create(companyId: string, userId: string, dto: CreateDevolucionDto, now = new Date()) {
    const sale = await this.prisma.venta.findFirst({
      where: { id: dto.ventaId, empresaId: companyId },
      include: { VentaItem: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.estado === 'ANULADA') throw new ConflictException('La venta está anulada');
    const days = Math.floor((now.getTime() - sale.createdAt.getTime()) / DAY_MS);
    if (days > RETURN_WINDOW_DAYS) {
      throw new ConflictException(
        `Pasaron ${days} días desde la venta: se aceptan devoluciones hasta ${RETURN_WINDOW_DAYS} días después.`,
      );
    }

    const clienteId = sale.clienteId ?? dto.clienteId;
    if (!clienteId) {
      throw new BadRequestException(
        'La venta fue a consumidor final: indicá a qué cliente corresponde la devolución.',
      );
    }
    const customer = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId: companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const returned = await this.prisma.devolucionClienteItem.groupBy({
      by: ['ventaItemId'],
      where: {
        DevolucionCliente: {
          ventaId: sale.id,
          empresaId: companyId,
          // A cancelled or rejected return (OR-B4-035) took nothing back.
          NOT: { Reembolso: { is: { estado: 'RECHAZADO' } } },
        },
      },
      _sum: { cantidad: true },
    });
    const returnedOf = new Map(returned.map((r) => [r.ventaItemId, Number(r._sum.cantidad ?? 0)]));
    const saleItemOf = new Map(sale.VentaItem.map((item) => [item.id, item]));
    const seen = new Set<string>();

    const lines = dto.items.map((item) => {
      const saleItem = saleItemOf.get(item.ventaItemId);
      if (!saleItem) throw new BadRequestException('Uno de los productos no es de esta venta');
      if (seen.has(item.ventaItemId))
        throw new BadRequestException('Un producto está repetido en la devolución');
      seen.add(item.ventaItemId);
      const available = Number(saleItem.cantidad) - (returnedOf.get(item.ventaItemId) ?? 0);
      if (item.cantidad > available) {
        throw new BadRequestException(
          available > 0
            ? `Se pueden devolver como máximo ${available} unidades de ese producto.`
            : 'Ese producto ya se devolvió completo.',
        );
      }
      const unit = round2(this.unitNet(saleItem));
      return {
        ventaItemId: saleItem.id,
        productoId: saleItem.productoId,
        cantidad: new Prisma.Decimal(item.cantidad),
        precioUnitarioOriginal: saleItem.precioUnitario,
        precioDevuelto: new Prisma.Decimal(unit),
        descuentoItem: new Prisma.Decimal(0),
        montoLineaDevuelto: new Prisma.Decimal(round2(unit * item.cantidad)),
        motivo: reasonText(item),
      };
    });
    const total = round2(lines.reduce((sum, l) => sum + Number(l.montoLineaDevuelto), 0));

    const created = await this.prisma.$transaction(
      async (tx) => {
        const last = await tx.devolucionCliente.aggregate({
          where: { empresaId: companyId },
          _max: { numeroDevolucion: true },
        });
        const row = await tx.devolucionCliente.create({
          data: {
            empresaId: companyId,
            clienteId,
            ventaId: sale.id,
            creadoPorId: userId,
            createdBy: userId,
            numeroDevolucion: (last._max.numeroDevolucion ?? 0) + 1,
            ventaFecha: sale.createdAt,
            diasDesdeVenta: days,
            montoTotal: new Prisma.Decimal(total),
            montoReembolsable: new Prisma.Decimal(total),
            motivo: dto.motivo_general?.trim() || lines.map((l) => l.motivo).join('; '),
            DevolucionClienteItem: { create: lines },
          },
        });
        await tx.auditLog.create({
          data: {
            empresaId: companyId,
            usuarioId: userId,
            accion: 'CREATE',
            entidadAfectada: 'DevolucionCliente',
            entidadId: row.id,
            valoresPosteriores: { ventaId: sale.id, total, items: lines.length },
            ventaId: sale.id,
          },
        });
        return row;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifier.notify(
      companyId,
      clienteId,
      created.id,
      'solicitada',
      `Registramos tu devolución #${created.numeroDevolucion} de la venta ${sale.numero ?? ''}. ` +
        'Te avisamos cuando la autoricemos.',
    );
    return this.view(await this.load(companyId, created.id));
  }

  async list(companyId: string, query: { estado?: string; limit?: number; offset?: number } = {}) {
    const where: Prisma.DevolucionClienteWhereInput = {
      empresaId: companyId,
      ...(query.estado
        ? { estado: query.estado as Prisma.EnumEstadoDevolucionFilter['equals'] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.devolucionCliente.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(query.limit) || 50, 100),
        skip: Number(query.offset) || 0,
      }),
      this.prisma.devolucionCliente.count({ where }),
    ]);
    return { items: rows.map((row) => this.view(row)), total };
  }

  async get(companyId: string, id: string) {
    return this.view(await this.load(companyId, id));
  }

  async authorize(companyId: string, id: string, userId: string, notes?: string) {
    const row = await this.load(companyId, id);
    if (row.estado !== 'SOLICITADA') throw new ConflictException('La devolución ya fue autorizada');
    await this.prisma.$transaction([
      this.prisma.devolucionCliente.updateMany({
        where: { id, empresaId: companyId, estado: 'SOLICITADA' },
        data: {
          estado: 'AUTORIZADA',
          fechaAutorizacion: new Date(),
          ...(notes?.trim() ? { observaciones: notes.trim() } : {}),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          accion: 'AUTORIZAR',
          entidadAfectada: 'DevolucionCliente',
          entidadId: id,
          ventaId: row.ventaId,
        },
      }),
    ]);
    await this.notifier.notify(
      companyId,
      row.clienteId,
      id,
      'autorizada',
      `Autorizamos tu devolución #${row.numeroDevolucion}. Acercanos los productos para revisarlos.`,
    );
    return this.view(await this.load(companyId, id));
  }

  /**
   * The products are back and inspected. Each one says where it goes: REINGRESO returns the
   * units to the lots the sale took them from (newest first); DESCARTE keeps them out of the
   * available stock (workshop items 394, 395, 420).
   */
  async receive(companyId: string, id: string, userId: string, dto: ReceiveDevolucionDto) {
    const row = await this.load(companyId, id);
    if (row.estado !== 'AUTORIZADA') {
      throw new ConflictException(
        row.estado === 'SOLICITADA'
          ? 'Primero hay que autorizar la devolución'
          : 'La devolución ya fue recibida',
      );
    }
    const destinationOf = new Map(dto.items.map((i) => [i.itemId, i.destino]));
    if (
      row.DevolucionClienteItem.some((item) => !destinationOf.has(item.id)) ||
      destinationOf.size !== row.DevolucionClienteItem.length
    ) {
      throw new BadRequestException('Indicá el destino de cada producto devuelto');
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (const item of row.DevolucionClienteItem) {
          const destino = destinationOf.get(item.id)!;
          await tx.devolucionClienteItem.update({
            where: { id: item.id },
            data: { observaciones: DESTINATION_NOTE[destino] },
          });
          if (destino === 'REINGRESO') {
            await this.restock(
              tx,
              companyId,
              row.ventaId,
              row.id,
              row.numeroDevolucion,
              item.productoId,
              Number(item.cantidad),
              userId,
            );
          }
        }
        const updated = await tx.devolucionCliente.updateMany({
          where: { id, empresaId: companyId, estado: 'AUTORIZADA' },
          data: {
            estado: 'RECIBIDA',
            fechaRecibida: new Date(),
            ...(dto.condition_check?.trim()
              ? {
                  observaciones: [row.observaciones, dto.condition_check.trim()]
                    .filter(Boolean)
                    .join(' · '),
                }
              : {}),
          },
        });
        if (updated.count !== 1)
          throw new ConflictException('La devolución cambió mientras se recibía');
        await tx.auditLog.create({
          data: {
            empresaId: companyId,
            usuarioId: userId,
            accion: 'RECIBIR',
            entidadAfectada: 'DevolucionCliente',
            entidadId: id,
            valoresPosteriores: Object.fromEntries(destinationOf),
            ventaId: row.ventaId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifier.notify(
      companyId,
      row.clienteId,
      id,
      'recibida',
      `Recibimos y revisamos los productos de tu devolución #${row.numeroDevolucion}. Falta el reembolso.`,
    );
    return this.view(await this.load(companyId, id));
  }

  /** Puts units back into the lots the sale deducted them from (newest movement first). */
  private async restock(
    tx: Prisma.TransactionClient,
    companyId: string,
    saleId: string,
    returnId: string,
    returnNumber: number | null,
    productId: string,
    quantity: number,
    userId: string,
  ) {
    const outflows = await tx.movimientoStock.findMany({
      where: {
        empresaId: companyId,
        productoId: productId,
        referenciaId: saleId,
        tipoMovimiento: 'Salida',
        loteId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    let remaining = quantity;
    const targets: Array<{ loteId: string; cantidad: number }> = [];
    for (const out of outflows) {
      if (remaining <= 0) break;
      const back = Math.min(remaining, Number(out.cantidad));
      targets.push({ loteId: out.loteId as string, cantidad: back });
      remaining -= back;
    }
    if (remaining > 0) {
      // The sale's movements cover less than what comes back (e.g. data loaded before
      // movements existed): the rest goes to the product's newest lot.
      const newest = await tx.lote.findFirst({
        where: { empresaId: companyId, productoId: productId },
        orderBy: { vencimiento: 'desc' },
      });
      if (!newest)
        throw new ConflictException('El producto no tiene lotes donde reingresar el stock');
      targets.push({ loteId: newest.id, cantidad: remaining });
    }
    for (const target of targets) {
      await tx.lote.updateMany({
        where: { id: target.loteId, empresaId: companyId },
        data: { cantidad: { increment: target.cantidad } },
      });
      await tx.movimientoStock.create({
        data: {
          empresaId: companyId,
          productoId: productId,
          loteId: target.loteId,
          tipoMovimiento: 'Entrada',
          cantidad: target.cantidad,
          motivo: `Devolución${returnNumber ? ` #${returnNumber}` : ''}`,
          referenciaId: returnId,
          usuarioId: userId,
        },
      });
    }
  }

  /**
   * Refund by the method the sale was paid with (workshop item 398), never more than what
   * was collected for the sale minus what other returns of it already refunded. Cash leaves
   * the open register; other methods are recorded as PENDIENTE_MANUAL for the team to
   * return through the bank or Mercado Pago.
   */
  async processRefund(companyId: string, id: string, userId: string, dto: ProcessRefundDto) {
    const row = await this.load(companyId, id);
    if (row.estado !== 'RECIBIDA') {
      throw new ConflictException(
        row.estado === 'PROCESADA'
          ? 'La devolución ya fue reembolsada'
          : 'Primero hay que recibir los productos',
      );
    }
    const payments = await this.prisma.pago.findMany({
      where: { empresaId: companyId, ventaId: row.ventaId, estado: 'APROBADO' },
      orderBy: { monto: 'desc' },
    });
    const collected = payments.reduce((sum, p) => sum + Number(p.monto), 0);
    const previous = await this.prisma.reembolso.aggregate({
      where: {
        empresaId: companyId,
        DevolucionCliente: { ventaId: row.ventaId },
        estado: { in: ['EXITO', 'PENDIENTE_MANUAL'] },
      },
      _sum: { montoActual: true },
    });
    const maximum = round2(
      Math.max(
        0,
        Math.min(Number(row.montoReembolsable), collected - Number(previous._sum.montoActual ?? 0)),
      ),
    );
    if (dto.amount !== undefined && round2(dto.amount) > maximum) {
      throw new BadRequestException(`Se pueden devolver como máximo ${money(maximum)}.`);
    }
    const amount = dto.amount === undefined ? maximum : round2(dto.amount);
    const partial = amount < maximum;
    const method = payments[0]?.medio ?? null;
    const notes = dto.notes?.trim();

    await this.prisma.$transaction(
      async (tx) => {
        let estado: 'EXITO' | 'PENDIENTE_MANUAL' = 'EXITO';
        let resultado: string;
        if (amount === 0) {
          resultado = 'La venta no tenía cobros: no hay dinero para devolver';
        } else if (method === 'efectivo') {
          const register = await tx.caja.findUnique({ where: { empresaId: companyId } });
          const opening = register
            ? await tx.aperturaCaja.findFirst({
                where: { cajaId: register.id, fechaCierre: null },
                orderBy: { fechaApertura: 'desc' },
              })
            : null;
          if (!register || !opening) throw new ConflictException('CAJA_CERRADA');
          await tx.movimientoCaja.create({
            data: {
              cajaId: register.id,
              aperturaCajaId: opening.id,
              usuarioId: userId,
              tipo: 'Devolucion',
              monto: new Prisma.Decimal(amount),
              descripcion: `Devolución${row.numeroDevolucion ? ` #${row.numeroDevolucion}` : ''} de la venta ${row.Venta.numero ?? row.ventaId}`,
              referenciaId: row.id,
            },
          });
          resultado = partial
            ? 'Devuelto en parte, en efectivo desde la caja'
            : 'Devuelto en efectivo desde la caja';
        } else {
          estado = 'PENDIENTE_MANUAL';
          resultado = `Devolver${partial ? ' en parte' : ''} por ${method ?? 'el medio original'} fuera de Wapsell`;
        }
        await tx.reembolso.create({
          data: {
            devolucionClienteId: row.id,
            empresaId: companyId,
            estado,
            montoReembolsable: row.montoReembolsable,
            montoActual: new Prisma.Decimal(amount),
            metodoReembolso: method,
            resultado: notes ? `${resultado} · ${notes}` : resultado,
            procesadoEn: estado === 'EXITO' ? new Date() : null,
          },
        });
        const updated = await tx.devolucionCliente.updateMany({
          where: { id, empresaId: companyId, estado: 'RECIBIDA' },
          data: { estado: 'PROCESADA', fechaProcesada: new Date() },
        });
        if (updated.count !== 1)
          throw new ConflictException('La devolución cambió mientras se reembolsaba');
        await tx.auditLog.create({
          data: {
            empresaId: companyId,
            usuarioId: userId,
            accion: 'REEMBOLSO',
            entidadAfectada: 'DevolucionCliente',
            entidadId: id,
            valoresPosteriores: { monto: amount, maximo: maximum, metodo: method, estado },
            ventaId: row.ventaId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifier.notify(
      companyId,
      row.clienteId,
      id,
      'reembolsada',
      this.refundNotice(row.numeroDevolucion, amount, method),
    );
    return this.view(await this.load(companyId, id));
  }

  private refundNotice(numero: number | null, amount: number, method: string | null) {
    if (amount === 0) return `Tu devolución #${numero} terminó.`;
    if (method === 'efectivo') {
      return `Tu devolución #${numero} terminó: te devolvimos ${money(amount)} en efectivo.`;
    }
    return `Tu devolución #${numero} terminó: te devolvemos ${money(amount)} por ${method ?? 'el medio con que pagaste'}.`;
  }

  /**
   * OR-B4-035 rule 10 — cancel, with a reason, while nothing moved yet (SOLICITADA or
   * AUTORIZADA): no stock, no money.
   */
  async cancel(companyId: string, id: string, userId: string, motivo: string) {
    const row = await this.load(companyId, id);
    if (row.estado !== 'SOLICITADA' && row.estado !== 'AUTORIZADA') {
      throw new ConflictException('Solo se puede cancelar antes de recibir los productos');
    }
    const reason = motivo.trim();
    await this.close(companyId, row, userId, 'CANCELAR', `${CLOSED_PREFIX.CANCEL}: ${reason}`);
    await this.notifier.notify(
      companyId,
      row.clienteId,
      id,
      'cancelada',
      `Cancelamos tu devolución #${row.numeroDevolucion}. Motivo: ${reason}`,
    );
    return this.view(await this.load(companyId, id));
  }

  /**
   * OR-B4-035 rule 3 — after inspecting the products the Business rejects the return: no
   * money, the products go back to the customer, so the stock does not move.
   */
  async reject(companyId: string, id: string, userId: string, motivo: string) {
    const row = await this.load(companyId, id);
    if (row.estado !== 'AUTORIZADA') {
      throw new ConflictException(
        row.estado === 'SOLICITADA'
          ? 'Primero hay que autorizar la devolución'
          : 'La devolución ya fue recibida',
      );
    }
    const reason = motivo.trim();
    await this.close(companyId, row, userId, 'RECHAZAR', `${CLOSED_PREFIX.REJECT}: ${reason}`);
    await this.notifier.notify(
      companyId,
      row.clienteId,
      id,
      'rechazada',
      `Revisamos los productos de tu devolución #${row.numeroDevolucion} y no podemos aceptarla: ${reason}. Te los devolvemos.`,
    );
    return this.view(await this.load(companyId, id));
  }

  /** Closes a return without refunding it: PROCESADA plus a RECHAZADO refund of 0. */
  private async close(
    companyId: string,
    row: Awaited<ReturnType<DevolucionesService['load']>>,
    userId: string,
    accion: 'CANCELAR' | 'RECHAZAR',
    resultado: string,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.devolucionCliente.updateMany({
          where: { id: row.id, empresaId: companyId, estado: row.estado },
          data: { estado: 'PROCESADA', fechaProcesada: new Date() },
        });
        if (updated.count !== 1) throw new ConflictException('La devolución cambió mientras tanto');
        await tx.reembolso.create({
          data: {
            devolucionClienteId: row.id,
            empresaId: companyId,
            estado: 'RECHAZADO',
            montoReembolsable: row.montoReembolsable,
            montoActual: new Prisma.Decimal(0),
            resultado,
          },
        });
        await tx.auditLog.create({
          data: {
            empresaId: companyId,
            usuarioId: userId,
            accion,
            entidadAfectada: 'DevolucionCliente',
            entidadId: row.id,
            valoresPosteriores: { resultado },
            ventaId: row.ventaId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
