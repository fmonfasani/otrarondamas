import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuoteSaleDto } from './dto/quote-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { ListSalesDto } from './dto/list-sales.dto';

/**
 * RF-05 (in-person sales).
 *
 * Inc-1: integrity validations (RN-VTA-06, 07, 11, 18, INV-VTA-07).
 * Inc-2: computation with Prisma.Decimal and rounding to 2 decimals per
 *        line (RN-VTA-02).
 * Inc-3: sequential commercial number (D-VTA-10), POST /ventas/:id/pagos
 *        with montoRecibido/vuelto/referencia (RF-VTA-14-15-16), cash
 *        blocked with closed cash register (D-VTA-07/A), derived balance
 *        in GET /ventas/:id.
 */
@Injectable()
export class SalesService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
    private readonly loyaltyService: LoyaltyService,
    private readonly customersService: CustomersService,
  ) {}

  // Inc-2: subtotal per line with Decimal, round half up to 2 decimals.
  private calculateLineSubtotal(
    unitPrice: Prisma.Decimal,
    quantity: Prisma.Decimal,
    loyaltyDiscountPercentage: Prisma.Decimal | null,
    itemDiscount: Prisma.Decimal,
  ): Prisma.Decimal {
    const gross = unitPrice.times(quantity);
    const afterLoyalty = loyaltyDiscountPercentage
      ? gross.times(new Prisma.Decimal(1).minus(loyaltyDiscountPercentage.dividedBy(100)))
      : gross;
    return afterLoyalty.minus(itemDiscount).toDecimalPlaces(2);
  }

  private async resolveItems(
    companyId: string,
    items: Array<{ productoId: string; cantidad: number; descuentoItem?: number }>,
    customerId?: string,
  ) {
    const db = this.prismaFactory.forCompany(companyId);

    const productIds = [...new Set(items.map((i) => i.productoId))];
    const products = await db.producto.findMany({ where: { id: { in: productIds } } });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productById.get(item.productoId);
      if (!product) throw new NotFoundException('PRODUCTO_NO_ENCONTRADO');
      if (!product.activo) throw new UnprocessableEntityException('PRODUCTO_INACTIVO');
      if (item.descuentoItem && item.descuentoItem > 0)
        throw new ForbiddenException('DESCUENTO_NO_AUTORIZADO');
    }

    const customerLevel = customerId
      ? await this.customersService.calculateLevel(companyId, customerId)
      : null;
    const activeRules = customerLevel ? await this.loyaltyService.listActiveRules(companyId) : [];

    return items.map((item) => {
      const product = productById.get(item.productoId)!;
      const loyaltyDiscount = this.loyaltyService.calculateApplicableDiscount(
        activeRules,
        customerLevel,
        {
          familiaId: product.familiaId,
          subfamiliaId: product.subfamiliaId,
          tipoId: product.tipoId,
          subtipoId: product.subtipoId,
          marca: product.marca,
          cantidad: item.cantidad,
        },
      );
      return {
        ...item,
        precioUnitario: product.precioMinorista,
        descuentoFidelizacionPorcentaje: loyaltyDiscount?.descuentoPorcentaje ?? null,
        reglaFidelizacionId: loyaltyDiscount?.reglaId ?? null,
      };
    });
  }

  // Inc-3 (D-VTA-07/A): checks whether there is a current cash register
  // opening. The company may have no cash register configured (initial
  // startup) — in that case it is treated as a closed cash register.
  private async isCashRegisterOpen(companyId: string): Promise<boolean> {
    const db = this.prismaFactory.forCompany(companyId);
    const cashRegister = await db.caja.findUnique({ where: { empresaId: companyId } });
    if (!cashRegister) return false;
    const opening = await db.aperturaCaja.findFirst({
      where: { cajaId: cashRegister.id, fechaCierre: null },
    });
    return !!opening;
  }

  async create(dto: CreateSaleDto, companyId: string, userId: string) {
    // Inc-1: idempotencia
    if (dto.idempotencyKey) {
      const db = this.prismaFactory.forCompany(companyId);
      const existing = await db.venta.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { ventaItems: true, pagos: true },
      });
      if (existing) {
        const totalPaid = existing.pagos
          .filter((p) => p.estado === 'APROBADO')
          .reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));
        const balance = new Prisma.Decimal(existing.total.toString()).minus(totalPaid);
        return { ...existing, saldo: balance.toString(), advertenciasStockVencido: [] };
      }
    }

    // Inc-1: valid customer for this company
    if (dto.clienteId) {
      const customer = await this.customersService.get(companyId, dto.clienteId);
      if (!customer.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsWithPrice = await this.resolveItems(companyId, dto.items, dto.clienteId);

    // Inc-2: total with Decimal
    const total = itemsWithPrice.reduce((acc, item) => {
      const subtotal = this.calculateLineSubtotal(
        new Prisma.Decimal(item.precioUnitario.toString()),
        new Prisma.Decimal(item.cantidad),
        item.descuentoFidelizacionPorcentaje
          ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
          : null,
        new Prisma.Decimal(item.descuentoItem ?? 0),
      );
      return acc.plus(subtotal);
    }, new Prisma.Decimal(0));

    const db = this.prismaFactory.forCompany(companyId);

    return db.$transaction(async (tx) => {
      // Inc-3 (D-VTA-10/A): sequential number per company inside the
      // transaction — SELECT MAX + 1 with implicit row locking in Postgres's
      // serializable transaction.
      const maxNumber = await tx.venta.aggregate({
        where: { empresaId: companyId },
        _max: { numero: true },
      });
      const sequenceNumber = (maxNumber._max.numero ?? 0) + 1;

      const sale = await tx.venta.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          clienteId: dto.clienteId,
          canal: dto.canal,
          total,
          numero: sequenceNumber,
          estado: 'CONFIRMADA',
          idempotencyKey: dto.idempotencyKey ?? null,
          ventaItems: {
            create: itemsWithPrice.map((item) => ({
              productoId: item.productoId,
              cantidad: new Prisma.Decimal(item.cantidad),
              precioUnitario: new Prisma.Decimal(item.precioUnitario.toString()),
              descuentoItem: new Prisma.Decimal(item.descuentoItem ?? 0),
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje
                ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
                : null,
              reglaFidelizacionId: item.reglaFidelizacionId,
            })),
          },
        },
        include: { ventaItems: true },
      });

      // Inc-1: AuditLog in the same transaction
      await tx.auditLog.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          accion: 'CREATE',
          entidadAfectada: 'Venta',
          entidadId: sale.id,
          valoresPosteriores: {
            numero: sequenceNumber,
            total: total.toString(),
            canal: dto.canal,
            items: dto.items.length,
          },
          ventaId: sale.id,
        },
      });

      const productsWithExpiredBatch = new Set<string>();
      for (const item of itemsWithPrice) {
        const hasExpiredBatchNow = await this.inventoryService.deductStock(
          tx,
          companyId,
          item.productoId,
          item.cantidad,
          'Venta',
          sale.id,
          userId,
        );
        if (hasExpiredBatchNow) {
          productsWithExpiredBatch.add(item.productoId);
        }
      }

      return {
        ...sale,
        saldo: total.toString(),
        advertenciasStockVencido: [...productsWithExpiredBatch],
      };
    });
  }

  // Inc-2: preliminary quote without creating the sale
  async quote(dto: QuoteSaleDto, companyId: string) {
    if (dto.clienteId) {
      const customer = await this.customersService.get(companyId, dto.clienteId);
      if (!customer.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsWithPrice = await this.resolveItems(companyId, dto.items, dto.clienteId);

    const lines = itemsWithPrice.map((item) => {
      const priceDecimal = new Prisma.Decimal(item.precioUnitario.toString());
      const quantityDecimal = new Prisma.Decimal(item.cantidad);
      const loyaltyPct = item.descuentoFidelizacionPorcentaje
        ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
        : null;
      const manualDiscount = new Prisma.Decimal(item.descuentoItem ?? 0);
      const subtotal = this.calculateLineSubtotal(
        priceDecimal,
        quantityDecimal,
        loyaltyPct,
        manualDiscount,
      );
      return {
        productoId: item.productoId,
        precioUnitario: priceDecimal.toString(),
        cantidad: quantityDecimal.toString(),
        descuentoFidelizacionPorcentaje: loyaltyPct?.toString() ?? null,
        reglaFidelizacionId: item.reglaFidelizacionId ?? null,
        descuentoItem: manualDiscount.toString(),
        subtotal: subtotal.toString(),
      };
    });

    const total = lines
      .reduce((acc, l) => acc.plus(new Prisma.Decimal(l.subtotal)), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    return { lineas: lines, total: total.toString() };
  }

  // Inc-3 (RF-VTA-14, RF-VTA-15, RF-VTA-16): record a payment on a sale.
  // D-VTA-07/A: block cash if the cash register is closed.
  // D-VTA-04/B: leaving with a balance is allowed — the derived balance is
  // computed by findOne().
  async createPayment(
    saleId: string,
    dto: CreateSalePaymentDto,
    companyId: string,
    userId: string,
  ) {
    const db = this.prismaFactory.forCompany(companyId);

    const sale = await db.venta.findUnique({
      where: { id: saleId },
      include: { pagos: { where: { estado: 'APROBADO' } } },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.empresaId !== companyId) throw new NotFoundException('Venta no encontrada');
    if (sale.estado === 'ANULADA') throw new ConflictException('VENTA_ANULADA');

    const totalPaid = sale.pagos.reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));
    const balance = new Prisma.Decimal(sale.total.toString()).minus(totalPaid);

    if (balance.lessThanOrEqualTo(0)) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    const amountDecimal = new Prisma.Decimal(dto.monto);
    if (amountDecimal.greaterThan(balance.plus(new Prisma.Decimal('0.001')))) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    // Inc-3 D-VTA-07/A: efectivo requiere caja abierta
    if (dto.medio === 'efectivo') {
      const open = await this.isCashRegisterOpen(companyId);
      if (!open) throw new ConflictException('CAJA_CERRADA');

      // RN-VTA-12: in cash, montoRecibido may exceed the amount
      const received = dto.montoRecibido ? new Prisma.Decimal(dto.montoRecibido) : amountDecimal;
      if (received.lessThan(amountDecimal)) {
        throw new BadRequestException('MONTO_RECIBIDO_INSUFICIENTE');
      }
    }

    return db.$transaction(async (tx) => {
      const receivedAmount =
        dto.medio === 'efectivo' && dto.montoRecibido
          ? new Prisma.Decimal(dto.montoRecibido)
          : null;
      const change = receivedAmount ? receivedAmount.minus(amountDecimal).toDecimalPlaces(2) : null;

      const payment = await tx.pago.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          ventaId: saleId,
          monto: amountDecimal,
          medio: dto.medio,
          estado: 'APROBADO',
          montoRecibido: receivedAmount,
          vuelto: change,
          referencia: dto.referencia ?? null,
        },
      });

      // Inc-1 (RN-VTA-18): AuditLog of the collection
      await tx.auditLog.create({
        data: {
          empresaId: companyId,
          usuarioId: userId,
          accion: 'PAGO',
          entidadAfectada: 'Pago',
          entidadId: payment.id,
          valoresPosteriores: {
            ventaId: saleId,
            monto: amountDecimal.toString(),
            medio: dto.medio,
            vuelto: change?.toString() ?? null,
          },
          ventaId: saleId,
        },
      });

      const newBalance = balance.minus(amountDecimal).toDecimalPlaces(2);
      return { pago: payment, saldo: newBalance.toString() };
    });
  }

  private calculateCollectionStatus(
    balance: Prisma.Decimal,
    total: Prisma.Decimal,
  ): 'PENDIENTE' | 'PARCIAL' | 'COBRADA' {
    if (balance.equals(total)) return 'PENDIENTE';
    if (balance.isZero()) return 'COBRADA';
    return 'PARCIAL';
  }

  async findAll(companyId: string, dto: ListSalesDto = {}) {
    const {
      desde: from,
      hasta: until,
      estadoCobro: collectionStatus,
      usuarioId: userId,
      clienteId: customerId,
      numero: sequenceNumber,
      page = 1,
      pageSize = 25,
    } = dto;

    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      from || until
        ? { ...(from ? { gte: new Date(from) } : {}), ...(until ? { lte: new Date(until) } : {}) }
        : undefined;

    const where: Prisma.VentaWhereInput = {
      empresaId: companyId,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(userId ? { usuarioId: userId } : {}),
      ...(customerId ? { clienteId: customerId } : {}),
      ...(sequenceNumber ? { numero: sequenceNumber } : {}),
    };

    const [sales, total] = await Promise.all([
      this.prismaFactory.forCompany(companyId).venta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          usuario: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, nombre: true } },
          pagos: { where: { estado: 'APROBADO' }, select: { monto: true, medio: true } },
          _count: { select: { pagos: true } },
        },
      }),
      this.prismaFactory.forCompany(companyId).venta.count({ where }),
    ]);

    // Compute balance and estadoCobro for filtering and the response
    const rows = sales.map((v) => {
      const totalDecimal = new Prisma.Decimal(v.total);
      const paymentsSum = v.pagos.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.monto)),
        new Prisma.Decimal(0),
      );
      const balanceDecimal = totalDecimal.minus(paymentsSum);
      const ec = this.calculateCollectionStatus(balanceDecimal, totalDecimal);
      const formattedNumber = v.numero ? `#${String(v.numero).padStart(8, '0')}` : null;
      return {
        ...v,
        saldo: balanceDecimal.toDecimalPlaces(2).toString(),
        estadoCobro: ec,
        numeroFormateado: formattedNumber,
        medios: [...new Set(v.pagos.map((p) => p.medio))],
      };
    });

    // Filter by estadoCobro in memory (it is derived, not in the DB)
    const filteredRows = collectionStatus
      ? rows.filter((f) => f.estadoCobro === collectionStatus)
      : rows;

    return { data: filteredRows, total, page, pageSize };
  }

  async findOne(id: string, companyId: string) {
    const sale = await this.prismaFactory.forCompany(companyId).venta.findFirst({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
        ventaItems: {
          include: { producto: { select: { id: true, nombre: true, codigoInterno: true } } },
        },
        pagos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalDecimal = new Prisma.Decimal(sale.total);
    const paymentsSum = sale.pagos
      .filter((p) => p.estado === 'APROBADO')
      .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.monto)), new Prisma.Decimal(0));
    const balanceDecimal = totalDecimal.minus(paymentsSum);
    const collectionStatus = this.calculateCollectionStatus(balanceDecimal, totalDecimal);
    const formattedNumber = sale.numero ? `#${String(sale.numero).padStart(8, '0')}` : null;

    return {
      ...sale,
      saldo: balanceDecimal.toDecimalPlaces(2).toString(),
      estadoCobro: collectionStatus,
      numeroFormateado: formattedNumber,
      ventaItems: sale.ventaItems.map((item) => ({
        ...item,
        nombre: item.producto?.nombre ?? item.productoId,
        codigoInterno: item.producto?.codigoInterno ?? null,
      })),
    };
  }

  async getReceipt(id: string, companyId: string) {
    const sale = await this.findOne(id, companyId);
    // Returns the same structure as findOne — the frontend formats it for
    // printing
    return sale;
  }

  // Inc-1: product search for the POS
  async searchProducts(companyId: string, search: string) {
    if (!search || search.length < 2) {
      throw new BadRequestException('El término de búsqueda debe tener al menos 2 caracteres');
    }

    const db = this.prismaFactory.forCompany(companyId);
    const products = await db.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { codigoInterno: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { equals: search } },
        ],
      },
      take: 50,
      include: {
        familia: { select: { id: true, nombre: true } },
        subfamilia: { select: { id: true, nombre: true } },
        lotes: { select: { cantidad: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoInterno: p.codigoInterno,
      codigoBarras: p.codigoBarras,
      marca: p.marca,
      precioMinorista: p.precioMinorista,
      unidadBase: p.unidadBase,
      activo: p.activo,
      familia: p.familia,
      subfamilia: p.subfamilia,
      stockDisponible: p.lotes.reduce((sum, l) => sum + Number(l.cantidad), 0),
      stockMinimo: Number(p.stockMinimo),
    }));
  }
}
