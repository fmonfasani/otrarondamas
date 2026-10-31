import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuoteSaleDto } from './dto/quote-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { ListSalesDto } from './dto/list-sales.dto';

/**
 * P5A: Sales Service Multi-Tenant Refactoring
 *
 * All methods now require businessId parameter for multi-tenant isolation.
 * CompanyScopedPrismaService.forCompany(businessId) automatically scopes
 * all Prisma queries to the given businessId via company-scope.extension.ts.
 *
 * Stock deduction uses SERIALIZABLE transaction isolation (SV6-H-10b)
 * to prevent concurrent race conditions in order confirmation.
 *
 * Venta.numero sequencing is per-business via SELECT MAX(numero) + 1
 * within the SERIALIZABLE transaction.
 */

/**
 * RF-05 (in-person sales) — Multi-Tenant Edition (P5A)
 *
 * All methods now require explicit businessId parameter. The
 * CompanyScopedPrismaService.forCompany(businessId) ensures all queries
 * are automatically filtered to the given business via Prisma extension.
 *
 * Invariants:
 * - Inc-1: integrity validations (RN-VTA-06, 07, 11, 18, INV-VTA-07).
 * - Inc-2: computation with any and rounding to 2 decimals per
 *          line (RN-VTA-02).
 * - Inc-3: sequential commercial number (D-VTA-10), POST /ventas/:id/pagos
 *          with montoRecibido/vuelto/referencia (RF-VTA-14-15-16), cash
 *          blocked with closed cash register (D-VTA-07/A), derived balance
 *          in GET /ventas/:id.
 * - P5A: All queries scoped to businessId via CompanyScopedPrismaService.
 *        SERIALIZABLE isolation on stock deduction (SV6-H-10b).
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
    unitPrice: any,
    quantity: any,
    loyaltyDiscountPercentage: any | null,
    itemDiscount: any,
  ): any {
    const gross = unitPrice.times(quantity);
    const afterLoyalty = loyaltyDiscountPercentage
      ? gross.times(new any(1).minus(loyaltyDiscountPercentage.dividedBy(100)))
      : gross;
    return afterLoyalty.minus(itemDiscount).toDecimalPlaces(2);
  }

  private async resolveItems(
    businessId: string,
    items: Array<{ productoId: string; cantidad: number; descuentoItem?: number }>,
    customerId?: string,
  ) {
    const db = this.prismaFactory.forCompany(businessId);

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
      ? await this.customersService.calculateLevel(businessId, customerId)
      : null;
    const activeRules = customerLevel ? await this.loyaltyService.listActiveRules(businessId) : [];

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
  // opening. The business may have no cash register configured (initial
  // startup) — in that case it is treated as a closed cash register.
  // P5A: businessId explicit; CompanyScopedPrismaService auto-filters
  private async isCashRegisterOpen(businessId: string): Promise<boolean> {
    const db = this.prismaFactory.forCompany(businessId);
    const cashRegister = await db.caja.findUnique({ where: { empresaId: businessId } });
    if (!cashRegister) return false;
    const opening = await db.aperturaCaja.findFirst({
      where: { cajaId: cashRegister.id, fechaCierre: null },
    });
    return !!opening;
  }

  async create(dto: CreateSaleDto, businessId: string, userId: string) {
    // P5A: All queries now scoped via businessId through CompanyScopedPrismaService
    const db = this.prismaFactory.forCompany(businessId);

    // Inc-1: idempotencia — scope automatically filters to businessId
    if (dto.idempotencyKey) {
      const existing = await db.venta.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { VentaItem: true, Pago: true },
      });
      if (existing) {
        const totalPaid = existing.Pago.filter((p) => p.estado === 'APROBADO').reduce(
          (s, p) => s.plus(p.monto),
          new any(0),
        );
        const balance = new any(existing.total.toString()).minus(totalPaid);
        return { ...existing, saldo: balance.toString(), advertenciasStockVencido: [] };
      }
    }

    // Inc-1: valid customer for this business (P5A: businessId explicit)
    if (dto.clienteId) {
      const customer = await this.customersService.get(businessId, dto.clienteId);
      if (!customer.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsWithPrice = await this.resolveItems(businessId, dto.items, dto.clienteId);

    // Inc-2: total with Decimal
    const total = itemsWithPrice.reduce((acc, item) => {
      const subtotal = this.calculateLineSubtotal(
        new any(item.precioUnitario.toString()),
        new any(item.cantidad),
        item.descuentoFidelizacionPorcentaje
          ? new any(item.descuentoFidelizacionPorcentaje.toString())
          : null,
        new any(item.descuentoItem ?? 0),
      );
      return acc.plus(subtotal);
    }, new any(0));

    // P5A: SERIALIZABLE isolation for stock deduction (SV6-H-10b)
    return db.$transaction(
      async (tx) => {
        // Inc-3 (D-VTA-10/A): sequential number per business inside the
        // transaction — SELECT MAX + 1 with implicit row locking in Postgres's
        // SERIALIZABLE transaction prevents race conditions.
        const maxNumber = await tx.venta.aggregate({
          where: { empresaId: businessId },
          _max: { numero: true },
        });
        const sequenceNumber = (maxNumber._max.numero ?? 0) + 1;

        const sale = await tx.venta.create({
          data: {
            empresaId: businessId,
            usuarioId: userId,
            clienteId: dto.clienteId,
            canal: dto.canal,
            total,
            numero: sequenceNumber,
            estado: 'CONFIRMADA',
            idempotencyKey: dto.idempotencyKey ?? null,
            VentaItem: {
              create: itemsWithPrice.map((item) => ({
                productoId: item.productoId,
                cantidad: new any(item.cantidad),
                precioUnitario: new any(item.precioUnitario.toString()),
                descuentoItem: new any(item.descuentoItem ?? 0),
                descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje
                  ? new any(item.descuentoFidelizacionPorcentaje.toString())
                  : null,
                reglaFidelizacionId: item.reglaFidelizacionId,
              })),
            },
          },
          include: { VentaItem: true },
        });

        // Inc-1: AuditLog in the same SERIALIZABLE transaction
        await tx.auditLog.create({
          data: {
            empresaId: businessId,
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
          // P5A: SERIALIZABLE isolation prevents race on concurrent stock deduction
          const hasExpiredBatchNow = await this.inventoryService.deductStock(
            tx,
            businessId,
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
      },
      { isolationLevel: 'Serializable' }, // P5A: SV6-H-10b
    );
  }

  // Inc-2: preliminary quote without creating the sale (P5A: businessId explicit)
  async quote(dto: QuoteSaleDto, businessId: string) {
    if (dto.clienteId) {
      const customer = await this.customersService.get(businessId, dto.clienteId);
      if (!customer.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsWithPrice = await this.resolveItems(businessId, dto.items, dto.clienteId);

    const lines = itemsWithPrice.map((item) => {
      const priceDecimal = new any(item.precioUnitario.toString());
      const quantityDecimal = new any(item.cantidad);
      const loyaltyPct = item.descuentoFidelizacionPorcentaje
        ? new any(item.descuentoFidelizacionPorcentaje.toString())
        : null;
      const manualDiscount = new any(item.descuentoItem ?? 0);
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
      .reduce((acc, l) => acc.plus(new any(l.subtotal)), new any(0))
      .toDecimalPlaces(2);

    return { lineas: lines, total: total.toString() };
  }

  // Inc-3 (RF-VTA-14, RF-VTA-15, RF-VTA-16): record a payment on a sale.
  // D-VTA-07/A: block cash if the cash register is closed.
  // D-VTA-04/B: leaving with a balance is allowed — the derived balance is
  // computed by findOne().
  // P5A: businessId explicit; CompanyScopedPrismaService auto-filters
  async findPaymentsBySale(saleId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);
    const sale = await db.venta.findUnique({ where: { id: saleId } });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return db.pago.findMany({
      where: { ventaId: saleId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPayment(
    saleId: string,
    dto: CreateSalePaymentDto,
    businessId: string,
    userId: string,
  ) {
    const db = this.prismaFactory.forCompany(businessId);

    // P5A: CompanyScopedPrismaService automatically filters to businessId
    const sale = await db.venta.findUnique({
      where: { id: saleId },
      include: { Pago: { where: { estado: 'APROBADO' } } },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.estado === 'ANULADA') throw new ConflictException('VENTA_ANULADA');

    const totalPaid = sale.Pago.reduce((s, p) => s.plus(p.monto), new any(0));
    const balance = new any(sale.total.toString()).minus(totalPaid);

    if (balance.lessThanOrEqualTo(0)) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    const amountDecimal = new any(dto.monto);
    if (amountDecimal.greaterThan(balance.plus(new any('0.001')))) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    // Inc-3 D-VTA-07/A: efectivo requiere caja abierta (P5A: businessId explicit)
    if (dto.medio === 'efectivo') {
      const open = await this.isCashRegisterOpen(businessId);
      if (!open) throw new ConflictException('CAJA_CERRADA');

      // RN-VTA-12: in cash, montoRecibido may exceed the amount
      const received = dto.montoRecibido ? new any(dto.montoRecibido) : amountDecimal;
      if (received.lessThan(amountDecimal)) {
        throw new BadRequestException('MONTO_RECIBIDO_INSUFICIENTE');
      }
    }

    // P5A: SERIALIZABLE isolation for payment transaction
    return db.$transaction(
      async (tx) => {
        const receivedAmount =
          dto.medio === 'efectivo' && dto.montoRecibido
            ? new any(dto.montoRecibido)
            : null;
        const change = receivedAmount ? receivedAmount.minus(amountDecimal).toDecimalPlaces(2) : null;

        const payment = await tx.pago.create({
          data: {
            empresaId: businessId,
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

        // RF-09: every cash sale collection must be reflected in the active
        // cash opening in the same transaction as Pago. Record the amount
        // collected (not montoRecibido, which includes change returned).
        if (dto.medio === 'efectivo') {
          const cashRegister = await tx.caja.findUnique({ where: { empresaId: businessId } });
          if (!cashRegister) throw new ConflictException('CAJA_CERRADA');
          const opening = await tx.aperturaCaja.findFirst({
            where: { cajaId: cashRegister.id, fechaCierre: null },
            orderBy: { fechaApertura: 'desc' },
          });
          if (!opening) throw new ConflictException('CAJA_CERRADA');

          await tx.movimientoCaja.create({
            data: {
              cajaId: cashRegister.id,
              aperturaCajaId: opening.id,
              usuarioId: userId,
              tipo: 'Venta',
              monto: amountDecimal,
              descripcion: `Cobro en efectivo de venta ${sale.numero ?? saleId}`,
              referenciaId: payment.id,
            },
          });
        }

        // Inc-1 (RN-VTA-18): AuditLog of the collection in same transaction
        await tx.auditLog.create({
          data: {
            empresaId: businessId,
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
      },
      { isolationLevel: 'Serializable' }, // P5A: SV6-H-10b
    );
  }

  private calculateCollectionStatus(
    balance: any,
    total: any,
  ): 'PENDIENTE' | 'PARCIAL' | 'COBRADA' {
    if (balance.equals(total)) return 'PENDIENTE';
    if (balance.isZero()) return 'COBRADA';
    return 'PARCIAL';
  }

  async findAll(businessId: string, dto: ListSalesDto = {}) {
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

    const createdAtFilter:  any | undefined =
      from || until
        ? { ...(from ? { gte: new Date(from) } : {}), ...(until ? { lte: new Date(until) } : {}) }
        : undefined;

    // P5A: CompanyScopedPrismaService auto-filters empresaId; don't add it to where
    const where:  any = {
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(userId ? { usuarioId: userId } : {}),
      ...(customerId ? { clienteId: customerId } : {}),
      ...(sequenceNumber ? { numero: sequenceNumber } : {}),
    };

    const db = this.prismaFactory.forCompany(businessId);
    const [sales, total] = await Promise.all([
      db.venta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          Usuario: { select: { id: true, nombre: true } },
          Cliente: { select: { id: true, nombre: true } },
          Pago: { where: { estado: 'APROBADO' }, select: { monto: true, medio: true } },
          _count: { select: { Pago: true } },
        },
      }),
      db.venta.count({ where }),
    ]);

    // Compute balance and estadoCobro for filtering and the response
    const rows = sales.map((v) => {
      const totalDecimal = new any(v.total);
      const paymentsSum = v.Pago.reduce(
        (acc, p) => acc.plus(new any(p.monto)),
        new any(0),
      );
      const balanceDecimal = totalDecimal.minus(paymentsSum);
      const ec = this.calculateCollectionStatus(balanceDecimal, totalDecimal);
      const formattedNumber = v.numero ? `#${String(v.numero).padStart(8, '0')}` : null;
      return {
        ...v,
        saldo: balanceDecimal.toDecimalPlaces(2).toString(),
        estadoCobro: ec,
        numeroFormateado: formattedNumber,
        medios: [...new Set(v.Pago.map((p) => p.medio))],
      };
    });

    // Filter by estadoCobro in memory (it is derived, not in the DB)
    const filteredRows = collectionStatus
      ? rows.filter((f) => f.estadoCobro === collectionStatus)
      : rows;

    return { data: filteredRows, total, page, pageSize };
  }

  async findOne(id: string, businessId: string) {
    // P5A: CompanyScopedPrismaService auto-filters to businessId
    const sale = await this.prismaFactory.forCompany(businessId).venta.findFirst({
      where: { id },
      include: {
        Usuario: { select: { id: true, nombre: true } },
        Cliente: { select: { id: true, nombre: true } },
        VentaItem: {
          include: { Producto: { select: { id: true, nombre: true, codigoInterno: true } } },
        },
        Pago: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalDecimal = new any(sale.total);
    const paymentsSum = sale.Pago.filter((p) => p.estado === 'APROBADO').reduce(
      (acc, p) => acc.plus(new any(p.monto)),
      new any(0),
    );
    const balanceDecimal = totalDecimal.minus(paymentsSum);
    const collectionStatus = this.calculateCollectionStatus(balanceDecimal, totalDecimal);
    const formattedNumber = sale.numero ? `#${String(sale.numero).padStart(8, '0')}` : null;

    return {
      ...sale,
      saldo: balanceDecimal.toDecimalPlaces(2).toString(),
      estadoCobro: collectionStatus,
      numeroFormateado: formattedNumber,
      ventaItems: sale.VentaItem.map((item) => ({
        ...item,
        nombre: item.Producto?.nombre ?? item.productoId,
        codigoInterno: item.Producto?.codigoInterno ?? null,
      })),
    };
  }

  async getReceipt(id: string, businessId: string) {
    // P5A: businessId explicit, auto-filtered via CompanyScopedPrismaService
    const sale = await this.findOne(id, businessId);
    // Returns the same structure as findOne — the frontend formats it for
    // printing
    return sale;
  }

  // Inc-1: product search for the POS (P5A: businessId explicit)
  async searchProducts(businessId: string, search: string) {
    if (!search || search.length < 2) {
      throw new BadRequestException('El término de búsqueda debe tener al menos 2 caracteres');
    }

    const db = this.prismaFactory.forCompany(businessId);
    // P5A: CompanyScopedPrismaService auto-filters producto to businessId
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
        Familia: { select: { id: true, nombre: true } },
        Subfamilia: { select: { id: true, nombre: true } },
        Lote: { select: { cantidad: true } },
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
      familia: p.Familia,
      subfamilia: p.Subfamilia,
      stockDisponible: p.Lote.reduce((sum, l) => sum + Number(l.cantidad), 0),
      stockMinimo: Number(p.stockMinimo),
    }));
  }
}
