import { OrderNoticeService } from '../customer-notices/order-notice.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { currentOffers } from '../offers/current-offers';
import { sellingPrice } from '../offers/offer-price';
import { bestLinePrice } from '../offers/best-price';

// Same pattern as sales.service.ts/inventory.service.ts: the client of
// CompanyScopedPrismaService.forCompany() is a dynamic type from Prisma
// Client Extensions, it does not fit the base Prisma.TransactionClient.
type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];

/**
 * OR-B4-054, fase 2b — how the customer receives the order, already checked against the store
 * (pickup offered; delivery inside the radius, fee computed by the server). The fee is all the
 * courier's and stays apart from `total`, which is still what the products cost.
 */
export type OrderDelivery = {
  tipoEntrega: 'RETIRO' | 'ENVIO';
  direccionEntrega: string | null;
  indicacionesEntrega: string | null;
  latEntrega: number | null;
  lngEntrega: number | null;
  kmEntrega: number | null;
  costoEnvio: number;
};

/** An order's total from its lines: unit price x quantity, less the line's loyalty %. */
export function orderTotal(
  lines: Array<{
    precioUnitario: string | number | Prisma.Decimal;
    cantidad: string | number | Prisma.Decimal;
    descuentoFidelizacionPorcentaje?: string | number | Prisma.Decimal | null;
  }>,
): number {
  const total = lines.reduce((acc, line) => {
    const gross = Number(line.precioUnitario) * Number(line.cantidad);
    const loyalty = line.descuentoFidelizacionPorcentaje
      ? Number(line.descuentoFidelizacionPorcentaje)
      : 0;
    return acc + gross * (1 - loyalty / 100);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * The online store of each Business (RF-06), reached by its public slug (`/:slug/tienda`) or from
 * the chat. The Business is always explicit: the single-store mode (TIENDA_EMPRESA_ID) is gone
 * (Owner, 2026-11-25).
 */
@Injectable()
export class StoreService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
    private readonly loyaltyService: LoyaltyService,
    private readonly customersService: CustomersService,
    @Optional() private readonly orderNotices?: OrderNoticeService,
  ) {}

  private companyId(explicitCompanyId?: string): string {
    // Fails closed: the store never guesses a Business.
    if (!explicitCompanyId) {
      throw new InternalServerErrorException('Falta el negocio de la tienda');
    }
    return explicitCompanyId;
  }

  /**
   * Public catalog — reuses InventoryService.consolidatedStock() for
   * availability (RF-06: 'availability will be updated according to the
   * system stock'), without duplicating that computation. It adds the price,
   * which that method does not expose (designed for the internal panel,
   * where the price is already seen elsewhere).
   *
   * familiaId/subfamiliaId (Online Store design spec): category navigation
   * in addition to the text search — passed as is to consolidatedStock(),
   * which already knows how to filter by them.
   *
   * OR-B4-046: the store shows only the Catálogo (published products), featured
   * first. A published product without stock shows «Sin stock», unless the
   * Business chose to hide those (`hideOutOfStock`, from its settings).
   */
  async catalog(
    search?: string,
    familyId?: string,
    subfamilyId?: string,
    companyId?: string,
    options: { hideOutOfStock?: boolean } = {},
  ) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);
    const listed = await this.inventoryService.consolidatedStock(
      resolvedCompanyId,
      search,
      undefined,
      familyId,
      subfamilyId,
      { publishedOnly: true },
    );
    // OR-B4-049: the store offers what is available (what confirmed orders reserved is promised).
    const stock = options.hideOutOfStock ? listed.filter((s) => s.disponible > 0) : listed;

    const products = await db.producto.findMany({
      where: { id: { in: stock.map((s) => s.productoId) } },
      select: { id: true, familiaId: true, precioMinorista: true, descuentoPorcentaje: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    // OR-B4-046 §4.4, stage C3: the store sees every offer in force.
    const offers = await currentOffers(db, products, 'tienda');

    // Cost, stockMinimo or any other internal field is never exposed —
    // consolidatedStock() already filters to activo=true, here only the public
    // price is added. Phase 6 (RF-06/RF-04): single, global discount over
    // precioMinorista, without quantity/customer rules (D-01/D-02 are still
    // undefined).
    return stock.map((item) => {
      const product = productById.get(item.productoId);
      const price = sellingPrice(
        product?.precioMinorista ?? new Prisma.Decimal(0),
        product?.descuentoPorcentaje ?? null,
        offers.get(item.productoId) ?? [],
      );
      return {
        productoId: item.productoId,
        nombre: item.nombre,
        codigoInterno: item.codigoInterno,
        familiaId: item.familiaId,
        subfamiliaId: item.subfamiliaId,
        tipoId: item.tipoId,
        subtipoId: item.subtipoId,
        unidadBase: item.unidadBase,
        destacado: item.destacado,
        ...price,
        disponible: item.disponible > 0,
        stockTotal: item.disponible,
      };
    });
  }

  /**
   * Active Familia/Subfamilia, to build the filter chips of the public
   * catalog (Online Store design spec) — same criterion as
   * CatalogHierarchyController (internal panel), but without Tipo/Subtipo
   * (the store filter only goes down to Subfamilia) and without auth.
   */
  async hierarchy(companyId?: string) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);
    const [families, subfamilies] = await Promise.all([
      db.familia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.subfamilia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    ]);
    return { familias: families, subfamilias: subfamilies };
  }

  /**
   * Creates an online store Pedido (RECIBIDO): the customer's intent. OR-B4-049 / R8-ORD-002:
   * it neither reserves nor deducts stock. The Business confirming it reserves the stock, and the
   * stock leaves when the order goes on its way or is delivered. Here it only validates that the
   * units are available at the time of ordering (without what confirmed orders reserved).
   */
  async createOrder(
    dto: CreateOrderDto,
    companyId?: string,
    channelOrigen = 'web',
    idempotencyKey?: string,
    { catalogOnly = true, delivery }: { catalogOnly?: boolean; delivery?: OrderDelivery } = {},
  ) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);

    // C3: a retry of the same request returns the order it already placed or grew.
    if (idempotencyKey) {
      const repeated = await db.pedido.findFirst({
        where: { empresaId: resolvedCompanyId, idempotencyKey },
        include: { PedidoItem: true },
      });
      if (repeated) return { ...repeated, sumado: false };
    }

    // Phase 5 of the Loyalty roadmap, extended to the Online Store: the Cliente
    // is identified by email BEFORE the transaction (unlike before, when it
    // was only resolved inside) — its loyalty level is needed to compute the
    // discounts of each item, and CustomersService.calculateLevel() queries
    // with its own prismaFactory.forCompany(), which would not see a Cliente
    // created inside a transaction not yet committed. A customer that does
    // not exist yet is, by definition, NUEVO (0 purchases) — same criterion
    // already used in CustomersService.create().
    const existingCustomer = await db.cliente.findFirst({ where: { email: dto.email } });

    // OR-B4-053 — one open order per customer, like an ERP's open sales order: until the Business
    // confirms it (RECIBIDO), what the customer orders again is added to that same order instead
    // of opening another. Lines already in it keep their frozen price; a product ordered again is
    // re-priced with its new total quantity.
    const openOrder = existingCustomer
      ? await db.pedido.findFirst({
          where: { clienteId: existingCustomer.id, estado: 'RECIBIDO' },
          orderBy: { createdAt: 'desc' },
          include: { PedidoItem: true },
        })
      : null;
    const requested = new Map<string, number>();
    for (const item of dto.items) {
      requested.set(item.productoId, (requested.get(item.productoId) ?? 0) + item.cantidad);
    }
    const toPrice = [...requested].map(([productoId, cantidad]) => {
      const already = openOrder?.PedidoItem.find((line) => line.productoId === productoId);
      return { productoId, cantidad: cantidad + (already ? Number(already.cantidad) : 0) };
    });

    const productIds = toPrice.map((i) => i.productoId);
    // OR-B4-046 rule 2: the store sells the Catálogo (published products). A signed-in customer
    // may also order what the Business shared in the chat (createCustomerOrder passes
    // catalogOnly: false), since the chat sells every active product.
    const products = await db.producto.findMany({
      where: { id: { in: productIds }, activo: true, ...(catalogOnly ? { publicado: true } : {}) },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of toPrice) {
      if (!productById.has(item.productoId)) {
        throw new BadRequestException(`Producto ${item.productoId} no disponible`);
      }
    }

    // Validate stock availability (no deduction and no reservation: see above).
    const productsWithStock = await this.inventoryService.consolidatedStock(resolvedCompanyId);
    for (const item of toPrice) {
      const product = productsWithStock.find((p) => p.productoId === item.productoId);
      if (!product || product.disponible < item.cantidad) {
        const available = product?.disponible ?? 0;
        throw new BadRequestException(
          `Stock insuficiente para ${item.productoId}: disponible ${available}, solicitado ${item.cantidad}`,
        );
      }
    }

    const customerLevel = existingCustomer
      ? await this.customersService.calculateLevel(resolvedCompanyId, existingCustomer.id)
      : 'NUEVO';
    const activeRules = await this.loyaltyService.listActiveRules(resolvedCompanyId);
    // OR-B4-046 §4.4, stage C3: the store (web) sees every offer in force; an order taken in the
    // chat skips the «solo tienda» ones. The product's discount and the offer never add up.
    const offers = await currentOffers(
      db,
      products,
      channelOrigen === 'web' ? 'tienda' : 'mostrador',
    );

    // Price frozen from the catalog at the time of the order — same criterion
    // as SalesService (INV-12): a price sent by the client is never accepted.
    // OR-B4-051 rule 2 replaces the earlier owner confirmation that the loyalty % stacked on top of
    // the product's discount: now every discount competes and the lowest price wins (D5).
    const itemsWithPrice = toPrice.map((item) => {
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
      // OR-B4-051 (D5, D6): the product's discount, the offer, a wholesale customer's price and the
      // loyalty discount compete; the lowest wins and nothing adds up (no payment-method discount
      // in orders: rule 1 keeps it at the counter).
      const price = bestLinePrice({
        list: product.precioMinorista,
        productDiscount: product.descuentoPorcentaje,
        offers: offers.get(product.id) ?? [],
        wholesale: existingCustomer?.esMayorista ? product.precioMayorista : null,
        loyalty: loyaltyDiscount
          ? { reglaId: loyaltyDiscount.reglaId, porcentaje: loyaltyDiscount.descuentoPorcentaje }
          : null,
      });
      return {
        ...item,
        precioUnitario: price.precioUnitario.toFixed(2),
        ofertaId: price.ofertaId,
        origenPrecio: price.origen,
        descuentoFidelizacionPorcentaje: price.descuentoFidelizacionPorcentaje,
        reglaFidelizacionId: price.reglaFidelizacionId,
      };
    });

    const lineData = (item: (typeof itemsWithPrice)[number]) => ({
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      ofertaId: item.ofertaId,
      origenPrecio: item.origenPrecio,
      descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje,
      reglaFidelizacionId: item.reglaFidelizacionId,
    });

    const placed = await db.$transaction(async (tx: CompanyScopedTx) => {
      // Confirmed decision: an online store order ALWAYS creates/reuses a
      // Cliente by email (within the company), it never stores loose contact
      // data in Pedido — it avoids duplicating what Cliente already models and
      // leaves repeated purchases from the same email recognizable under the
      // same Cliente (useful for RF-10 later).
      //
      // findFirst + create/update instead of upsert: companyScopeExtension
      // (INV-01) only has explicit isolation handling for a fixed set of
      // operations — upsert is not in that list (same reason as groupBy in
      // inventory.service.ts) and fails loudly instead of letting it through
      // without scope. findFirst with `where` is covered.
      //
      // It is searched again here (existingCustomer from above is not reused)
      // because the source of truth for whether to create or update is the
      // transaction itself, not a read done before opening it.
      const existingCustomerTx = await tx.cliente.findFirst({ where: { email: dto.email } });
      /* eslint-disable indent -- known false positive of the base `indent`
         rule with a ternary returning a call with a nested object
         (same pattern as catalog.controller.ts) */
      const customer = existingCustomerTx
        ? await tx.cliente.update({
            where: { id: existingCustomerTx.id },
            data: { nombre: dto.nombre, telefono: dto.telefono },
          })
        : await tx.cliente.create({
            data: {
              empresaId: resolvedCompanyId,
              nombre: dto.nombre,
              email: dto.email,
              telefono: dto.telefono,
            } satisfies Prisma.ClienteUncheckedCreateInput,
          });
      /* eslint-enable indent */

      if (openOrder) {
        // Still open? The Business may have confirmed or cancelled it a moment ago.
        const stillOpen = await tx.pedido.updateMany({
          where: { id: openOrder.id, estado: 'RECIBIDO' },
          data: { idempotencyKey: idempotencyKey ?? openOrder.idempotencyKey },
        });
        if (stillOpen.count !== 1) {
          throw new ConflictException(
            'Tu pedido anterior acaba de cambiar de estado. Volvé a enviarlo y va como un pedido nuevo.',
          );
        }
        // Read the lines again under the order's row lock, so two quick sends never duplicate one.
        const current = await tx.pedidoItem.findMany({ where: { pedidoId: openOrder.id } });
        for (const item of itemsWithPrice) {
          const line = current.find((l) => l.productoId === item.productoId);
          if (line) {
            await tx.pedidoItem.update({ where: { id: line.id }, data: lineData(item) });
          } else {
            await tx.pedidoItem.create({
              data: {
                empresaId: resolvedCompanyId,
                pedidoId: openOrder.id,
                productoId: item.productoId,
                ...lineData(item),
              },
            });
          }
        }
        const lines = await tx.pedidoItem.findMany({ where: { pedidoId: openOrder.id } });
        // The customer's latest choice of delivery or pickup is the order's (one fee per order).
        return tx.pedido.update({
          where: { id: openOrder.id },
          data: { total: orderTotal(lines), ...delivery },
          include: { PedidoItem: true },
        });
      }

      // usuarioId stays null: nobody has managed this order yet (see comment in
      // schema.prisma) — it is populated when a seller takes it from the orders
      // inbox (Phase 4 of the roadmap). The database assigns its number (OR-B4-053).
      return tx.pedido.create({
        data: {
          empresaId: resolvedCompanyId,
          clienteId: customer.id,
          usuarioId: null,
          estado: 'RECIBIDO',
          canalOrigen: channelOrigen,
          total: orderTotal(itemsWithPrice),
          idempotencyKey: idempotencyKey ?? null,
          ...delivery,
          PedidoItem: {
            create: itemsWithPrice.map((item) => ({
              productoId: item.productoId,
              ...lineData(item),
            })),
          },
        } satisfies Prisma.PedidoUncheckedCreateInput,
        include: { PedidoItem: true },
      });
    });
    // OR-B4-037 / OR-B4-053: the customer's chat shows the order as one card that follows it;
    // ordering again while it is open adds a short line to the chat instead of a second card.
    if (openOrder) {
      await this.orderNotices?.added(resolvedCompanyId, placed, requested.size);
    } else {
      await this.orderNotices?.received(resolvedCompanyId, placed);
    }
    return { ...placed, sumado: Boolean(openOrder) };
  }

  /**
   * OR-B4-053 — what one unit costs this customer today when they order it from the store
   * (the chat's product card shows it): the same competition of discounts as an order.
   */
  async customerUnitPrice(companyId: string, productoId: string, customerId: string | null) {
    const db = this.prismaFactory.forCompany(companyId);
    const product = await db.producto.findFirst({ where: { id: productoId, activo: true } });
    if (!product) return null;
    const customer = customerId
      ? await db.cliente.findFirst({ where: { id: customerId }, select: { esMayorista: true } })
      : null;
    const level = customer
      ? await this.customersService.calculateLevel(companyId, customerId as string)
      : 'NUEVO';
    const rules = await this.loyaltyService.listActiveRules(companyId);
    const loyalty = this.loyaltyService.calculateApplicableDiscount(rules, level, {
      familiaId: product.familiaId,
      subfamiliaId: product.subfamiliaId,
      tipoId: product.tipoId,
      subtipoId: product.subtipoId,
      marca: product.marca,
      cantidad: 1,
    });
    const offers = await currentOffers(db, [product], 'tienda');
    const price = bestLinePrice({
      list: product.precioMinorista,
      productDiscount: product.descuentoPorcentaje,
      offers: offers.get(product.id) ?? [],
      wholesale: customer?.esMayorista ? product.precioMayorista : null,
      loyalty: loyalty
        ? { reglaId: loyalty.reglaId, porcentaje: loyalty.descuentoPorcentaje }
        : null,
    });
    return orderTotal([
      {
        precioUnitario: price.precioUnitario.toFixed(2),
        cantidad: 1,
        descuentoFidelizacionPorcentaje: price.descuentoFidelizacionPorcentaje,
      },
    ]).toFixed(2);
  }

  /**
   * Tracking without login: anyone with the order id can query its status.
   * It does not expose another customer's data (the id is an unguessable
   * UUID, there is no public order listing) nor internal fields like
   * usuarioId.
   */
  /**
   * STORE-V1-03 — order placed by a signed-in store customer. Same rules as createOrder
   * (catalog prices, stock check, loyalty); the contact data is the customer's own, so
   * the order is filed under their account and nobody can order in their name.
   */
  async createCustomerOrder(
    customerId: string,
    items: CreateOrderDto['items'],
    companyId: string,
    delivery?: OrderDelivery,
  ) {
    const db = this.prismaFactory.forCompany(companyId);
    const customer = await db.cliente.findFirst({
      where: { id: customerId },
      select: { nombre: true, email: true, telefono: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (!customer.email) {
      throw new BadRequestException('Tu cuenta no tiene email; pedile al comercio que lo cargue.');
    }
    return this.createOrder(
      {
        nombre: customer.nombre,
        email: customer.email,
        telefono: customer.telefono ?? undefined,
        items,
      },
      companyId,
      'web',
      undefined,
      // Products shared in the chat can be ordered even when they are not in the Catálogo.
      { catalogOnly: false, delivery },
    );
  }

  /** STORE-V1-03 — the customer's latest orders in this Business, newest first. */
  async customerOrders(customerId: string, companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const orders = await db.pedido.findMany({
      where: { clienteId: customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        PedidoItem: { include: { Producto: { select: { nombre: true } } } },
        Pago: { where: { estado: 'APROBADO' }, select: { monto: true } },
      },
    });
    return orders.map((order) => ({
      id: order.id,
      numero: order.numero,
      estado: order.estado,
      total: order.total,
      // OR-B4-032: approved payments so far; the store offers to pay the rest once confirmed.
      pagado: order.Pago.reduce((sum, pago) => sum + Number(pago.monto), 0).toFixed(2),
      // OR-B4-054: delivery or pickup, and the courier's fee (apart from the products).
      tipoEntrega: order.tipoEntrega,
      direccionEntrega: order.direccionEntrega,
      costoEnvio: order.costoEnvio,
      createdAt: order.createdAt,
      items: order.PedidoItem.map((i) => ({
        producto: i.Producto.nombre,
        cantidad: Number(i.cantidad),
      })),
    }));
  }

  async tracking(orderId: string, companyId?: string) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);
    const order = await db.pedido.findUnique({
      where: { id: orderId },
      include: { PedidoItem: { include: { Producto: { select: { nombre: true } } } } },
    });
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }
    // No `numero` here: anyone with the link reads this, and the number tells how many orders
    // the Business has. The customer's own list (customerOrders) carries it.
    return {
      id: order.id,
      estado: order.estado,
      total: order.total,
      createdAt: order.createdAt,
      items: order.PedidoItem.map((i) => ({
        producto: i.Producto.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
    };
  }
}
