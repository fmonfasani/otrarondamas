import { currentOffers } from '../offers/current-offers';
import { bestLinePrice } from '../offers/best-price';
import { sellingPrice } from '../offers/offer-price';
import { paymentDiscountFor, pricingSettingsOf } from '../negocio/pricing-settings';
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
import { reservedByProduct } from '../inventory/reservations';
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
    paymentMethod?: string,
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
    // OR-B4-046 §4.4 (C3): the offers in force at the counter (not «solo tienda»).
    const offers = await currentOffers(db, products, 'mostrador');
    // OR-B4-051 (C4): a wholesale customer's price (D6) and the payment-method discount compete
    // with the rest; nothing adds up (D5).
    const wholesale = customerId
      ? ((await db.cliente.findFirst({ where: { id: customerId }, select: { esMayorista: true } }))
          ?.esMayorista ?? false)
      : false;
    const settings = pricingSettingsOf(
      (await db.empresa.findUnique({ where: { id: companyId }, select: { configuracion: true } }))
        ?.configuracion ?? null,
    );
    const paymentDiscount = paymentDiscountFor(settings, paymentMethod);

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
      const price = bestLinePrice({
        list: product.precioMinorista,
        productDiscount: product.descuentoPorcentaje,
        offers: offers.get(product.id) ?? [],
        wholesale: wholesale ? product.precioMayorista : null,
        paymentDiscount,
        loyalty: loyaltyDiscount
          ? { reglaId: loyaltyDiscount.reglaId, porcentaje: loyaltyDiscount.descuentoPorcentaje }
          : null,
      });
      return {
        ...item,
        precioUnitario: price.precioUnitario,
        ofertaId: price.ofertaId,
        origenPrecio: price.origen,
        descuentoFidelizacionPorcentaje: price.descuentoFidelizacionPorcentaje,
        reglaFidelizacionId: price.reglaFidelizacionId,
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
        include: { VentaItem: true, Pago: true },
      });
      if (existing) {
        const totalPaid = existing.Pago.filter((p) => p.estado === 'APROBADO').reduce(
          (s, p) => s.plus(p.monto),
          new Prisma.Decimal(0),
        );
        const balance = new Prisma.Decimal(existing.total.toString()).minus(totalPaid);
        return { ...existing, saldo: balance.toString(), advertenciasStockVencido: [] };
      }
    }

    // Inc-1: valid customer for this company
    if (dto.clienteId) {
      const customer = await this.customersService.get(companyId, dto.clienteId);
      if (!customer.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsWithPrice = await this.resolveItems(
      companyId,
      dto.items,
      dto.clienteId,
      dto.medioPago,
    );
    // OR-B4-051 rule 1: a sale priced with a payment-method discount must be paid with that method.
    const discountedMethod = itemsWithPrice.some((item) => item.origenPrecio === 'MEDIO_PAGO')
      ? (dto.medioPago ?? null)
      : null;

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
          medioPagoDescuento: discountedMethod,
          VentaItem: {
            create: itemsWithPrice.map((item) => ({
              productoId: item.productoId,
              cantidad: new Prisma.Decimal(item.cantidad),
              precioUnitario: new Prisma.Decimal(item.precioUnitario.toString()),
              descuentoItem: new Prisma.Decimal(item.descuentoItem ?? 0),
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje
                ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
                : null,
              reglaFidelizacionId: item.reglaFidelizacionId,
              ofertaId: item.ofertaId,
              origenPrecio: item.origenPrecio,
            })),
          },
        },
        include: { VentaItem: true },
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

      // OR-B4-049: the counter cannot sell what confirmed orders reserved.
      const reserved = await reservedByProduct(
        tx,
        itemsWithPrice.map((item) => item.productoId),
      );
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
          reserved.get(item.productoId) ?? 0,
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

    const itemsWithPrice = await this.resolveItems(
      companyId,
      dto.items,
      dto.clienteId,
      dto.medioPago,
    );

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
        // OR-B4-051: which discount won, so the counter can say why each line costs what it costs.
        origenPrecio: item.origenPrecio,
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
  async findPaymentsBySale(saleId: string, companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const sale = await db.venta.findUnique({ where: { id: saleId } });
    if (!sale || sale.empresaId !== companyId) {
      throw new NotFoundException('Venta no encontrada');
    }
    return db.pago.findMany({
      where: { ventaId: saleId, empresaId: companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPayment(
    saleId: string,
    dto: CreateSalePaymentDto,
    companyId: string,
    userId: string,
  ) {
    const db = this.prismaFactory.forCompany(companyId);

    const sale = await db.venta.findUnique({
      where: { id: saleId },
      include: { Pago: { where: { estado: 'APROBADO' } } },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.empresaId !== companyId) throw new NotFoundException('Venta no encontrada');
    if (sale.estado === 'ANULADA') throw new ConflictException('VENTA_ANULADA');
    // OR-B4-051 rule 1: the payment-method discount holds only if the sale is paid with that method.
    if (sale.medioPagoDescuento && dto.medio !== sale.medioPagoDescuento) {
      throw new ConflictException('MEDIO_PAGO_DEL_DESCUENTO');
    }

    const totalPaid = sale.Pago.reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));
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

      // RF-09: every cash sale collection must be reflected in the active
      // cash opening in the same transaction as Pago. Record the amount
      // collected (not montoRecibido, which includes change returned).
      if (dto.medio === 'efectivo') {
        const cashRegister = await tx.caja.findUnique({ where: { empresaId: companyId } });
        if (!cashRegister) throw new ConflictException('CAJA_CERRADA');
        const opening = await tx.aperturaCaja.findFirst({
          where: { cajaId: cashRegister.id, fechaCierre: null },
          orderBy: { fechaApertura: 'desc' },
        });
        if (!opening) throw new ConflictException('CAJA_CERRADA');

        await tx.movimientoCaja.create({
          data: {
            empresaId: companyId,
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
          Usuario: { select: { id: true, nombre: true } },
          Cliente: { select: { id: true, nombre: true } },
          Pago: { where: { estado: 'APROBADO' }, select: { monto: true, medio: true } },
          _count: { select: { Pago: true } },
        },
      }),
      this.prismaFactory.forCompany(companyId).venta.count({ where }),
    ]);

    // Compute balance and estadoCobro for filtering and the response
    const rows = sales.map((v) => {
      const totalDecimal = new Prisma.Decimal(v.total);
      const paymentsSum = v.Pago.reduce(
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
        medios: [...new Set(v.Pago.map((p) => p.medio))],
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
        Usuario: { select: { id: true, nombre: true } },
        Cliente: { select: { id: true, nombre: true } },
        VentaItem: {
          include: { Producto: { select: { id: true, nombre: true, codigoInterno: true } } },
        },
        Pago: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    const totalDecimal = new Prisma.Decimal(sale.total);
    const paymentsSum = sale.Pago.filter((p) => p.estado === 'APROBADO').reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.monto)),
      new Prisma.Decimal(0),
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
        Familia: { select: { id: true, nombre: true } },
        Subfamilia: { select: { id: true, nombre: true } },
        Lote: { select: { cantidad: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    const offers = await currentOffers(db, products, 'mostrador');

    return products.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoInterno: p.codigoInterno,
      codigoBarras: p.codigoBarras,
      marca: p.marca,
      precioMinorista: p.precioMinorista,
      // Stage C3: what the counter charges today, and the offer behind it.
      ...(({ precio, oferta }) => ({ precioVenta: precio, oferta }))(
        // OR-B4-051 rule 3: the product's own discount applies at the counter too.
        sellingPrice(p.precioMinorista, p.descuentoPorcentaje, offers.get(p.id) ?? []),
      ),
      unidadBase: p.unidadBase,
      activo: p.activo,
      familia: p.Familia,
      subfamilia: p.Subfamilia,
      stockDisponible: p.Lote.reduce((sum, l) => sum + Number(l.cantidad), 0),
      stockMinimo: Number(p.stockMinimo),
    }));
  }
}
