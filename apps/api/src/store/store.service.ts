import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Same pattern as sales.service.ts/inventory.service.ts: the client of
// CompanyScopedPrismaService.forCompany() is a dynamic type from Prisma
// Client Extensions, it does not fit the base  any.
// type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
// type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];

/**
 * Phase 1-3 of the Online Store (RF-06). PUBLIC surface (no login) — see
 * store.controller.ts, everything here marked @Public().
 *
 * Without a session there is no AuthenticatedUser.empresaId to take the
 * multi-company scope from (see company-scoped-prisma.service.ts). It is
 * resolved by reading TIENDA_EMPRESA_ID from a fixed env var — same
 * pattern already used for the automatic Google OAuth sign-up (see
 * GOOGLE_SIGNUP_EMPRESA_ID in auth.google.service.ts): a single public
 * store per deploy, without inventing which company an anonymous visitor
 * belongs to. If more than one public store is ever needed, that is a
 * separate redesign (resolving the company by the request's
 * domain/subdomain), not something to anticipate without a real case.
 */
@Injectable()
export class StoreService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
    private readonly loyaltyService: LoyaltyService,
    private readonly customersService: CustomersService,
  ) {}

  private companyId(explicitCompanyId?: string): string {
    if (explicitCompanyId) return explicitCompanyId;
    const companyId = process.env.TIENDA_EMPRESA_ID;
    if (!companyId) {
      // The company is not guessed: without this variable, the public store is
      // effectively disabled (fails explicitly, it does not show the catalog of
      // 'any' company).
      throw new InternalServerErrorException(
        'TIENDA_EMPRESA_ID no configurado: la tienda pública está deshabilitada',
      );
    }
    return companyId;
  }

  /**
   * Phase 6 (RF-06/RF-04): applies the product's single, global discount (if
   * it has one) over precioMinorista. The SDD limits the store to 'a single
   * base price, with the possibility of applying discounts' — there are no
   * quantity/customer rules (D-01/D-02 are still undefined). Rounded to 2
   * decimals (currency), a price with more precision than makes sense to
   * show/charge is never returned.
   */
  private priceWithDiscount(
    retailPrice: any,
    discountPercentage: any,
  ): string {
    if (!discountPercentage || discountPercentage.isZero()) {
      return retailPrice.toFixed(2);
    }
    const factor = (1 as any).minus(discountPercentage.dividedBy(100));
    return retailPrice.times(factor).toFixed(2);
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
   */
  async catalog(search?: string, familyId?: string, subfamilyId?: string, companyId?: string) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);
    const stock = await this.inventoryService.consolidatedStock(
      resolvedCompanyId,
      search,
      undefined,
      familyId,
      subfamilyId,
    );

    const products = await db.producto.findMany({
      where: { id: { in: stock.map((s) => s.productoId) } },
      select: { id: true, precioMinorista: true, descuentoPorcentaje: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    // Cost, stockMinimo or any other internal field is never exposed —
    // consolidatedStock() already filters to activo=true, here only the public
    // price is added. Phase 6 (RF-06/RF-04): single, global discount over
    // precioMinorista, without quantity/customer rules (D-01/D-02 are still
    // undefined).
    return stock.map((item) => {
      const product = productById.get(item.productoId) as any;
      const basePrice = product?.precioMinorista ?? 0;
      const discountPercentage = product?.descuentoPorcentaje ?? null;
      return {
        productoId: item.productoId,
        nombre: item.nombre,
        codigoInterno: item.codigoInterno,
        familiaId: item.familiaId,
        subfamiliaId: item.subfamiliaId,
        tipoId: item.tipoId,
        subtipoId: item.subtipoId,
        unidadBase: item.unidadBase,
        precio: this.priceWithDiscount(basePrice, discountPercentage),
        precioSinDescuento:
          discountPercentage && !discountPercentage.isZero() ? basePrice.toFixed(2) : null,
        descuentoPorcentaje: discountPercentage?.toNumber() ?? null,
        disponible: item.stockTotal > 0,
        stockTotal: item.stockTotal,
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
   * Creates an online store Pedido. Without stock reservation (confirmed
   * owner decision, see roadmap): this does NOT deduct stock by default — the
   * deduction only happens when a seller confirms the order from the panel
   * (Phase 4) or when the payment is confirmed (Phase 5). Here it only
   * validates that there is stock available at the time of ordering, without
   * setting it aside.
   *
   * Phase 3 (/store/order): deductStock = true → deducts atomically.
   * Phase 1-3 (legacy /tienda/pedidos): deductStock = false → validates only.
   */
  async createOrder(
    dto: CreateOrderDto,
    companyId?: string,
    channelOrigen = 'web',
    idempotencyKey?: string,
    deductStock = false,
  ) {
    const resolvedCompanyId = this.companyId(companyId);
    const db = this.prismaFactory.forCompany(resolvedCompanyId);

    const productIds = [...new Set(dto.items.map((i) => i.productoId))];
    const products = await db.producto.findMany({
      where: { id: { in: productIds }, activo: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!productById.has(item.productoId)) {
        throw new BadRequestException(`Producto ${item.productoId} no disponible`);
      }
    }

    // Validate stock availability (always validate, deduction only if deductStock=true).
    // Phase 1-3 (/tienda/pedidos, deductStock=false): validate only, no deduction.
    // Phase 3 (/store/order, deductStock=true): validate + deduct atomically in transaction.
    const productsWithStock = await this.inventoryService.consolidatedStock(resolvedCompanyId);
    for (const item of dto.items) {
      const product = productsWithStock.find((p) => p.productoId === item.productoId);
      if (!product || product.stockTotal < item.cantidad) {
        const available = product?.stockTotal ?? 0;
        throw new BadRequestException(
          `Stock insuficiente para ${item.productoId}: disponible ${available}, solicitado ${item.cantidad}`,
        );
      }
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
    const customerLevel = existingCustomer
      ? await this.customersService.calculateLevel(resolvedCompanyId, existingCustomer.id)
      : 'NUEVO';
    const activeRules = await this.loyaltyService.listActiveRules(resolvedCompanyId);

    // Price frozen from the catalog at the time of the order — same criterion
    // as SalesService (INV-12): a price sent by the client is never accepted.
    // Phase 6: the frozen price ALREADY includes the product's discount if it
    // had one. Phase 5 of Loyalty: the automatic % is applied ON TOP of that
    // already discounted price (confirmed with the owner: both discounts are
    // combined, the larger one is not chosen).
    const itemsWithPrice = dto.items.map((item) => {
      const product = productById.get(item.productoId)! as any;
      const unitPrice = this.priceWithDiscount(
        product.precioMinorista,
        product.descuentoPorcentaje,
      );
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
        precioUnitario: unitPrice,
        descuentoFidelizacionPorcentaje: loyaltyDiscount?.descuentoPorcentaje ?? null,
        reglaFidelizacionId: loyaltyDiscount?.reglaId ?? null,
      };
    });

    const total = itemsWithPrice.reduce((acc, item) => {
      const gross = Number(item.precioUnitario) * item.cantidad;
      const net = item.descuentoFidelizacionPorcentaje
        ? gross * (1 - item.descuentoFidelizacionPorcentaje / 100)
        : gross;
      return acc + net;
    }, 0);

    return db.$transaction(async (tx: any) => {
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
            } as any,
          });
      /* eslint-enable indent */

      // usuarioId stays null: nobody has managed this order yet (see comment in
      // schema.prisma) — it is populated when a seller takes it from the orders
      // inbox (Phase 4 of the roadmap).

      // C3: Idempotency — if an idempotencyKey is provided, check for an existing
      // order with that key and return it (prevents duplicate orders on reintent).
      // Idempotencykey is unique in the database, so a second create with the same
      // key will fail with constraint error if it wasn't caught here. This handles
      // the case where the first request succeeded but the response was lost.
      if (idempotencyKey) {
        const existingOrder = await tx.pedido.findFirst({
          where: {
            empresaId: resolvedCompanyId,
            idempotencyKey,
          },
          include: { PedidoItem: true },
        });
        if (existingOrder) {
          // Order already created with this key; return it idempotently.
          return existingOrder;
        }
      }

      const order = await tx.pedido.create({
        data: {
          empresaId: resolvedCompanyId,
          clienteId: customer.id,
          usuarioId: null,
          estado: 'RECIBIDO',
          canalOrigen: channelOrigen,
          total,
          idempotencyKey: idempotencyKey ?? null,
          PedidoItem: {
            create: itemsWithPrice.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje,
              reglaFidelizacionId: item.reglaFidelizacionId,
            })),
          },
        } as any,
        include: { PedidoItem: true },
      });

      // C5A: Deduct stock for each item in the order (within same transaction).
      // Only if deductStock flag is true (Phase 3 /store/order).
      // Ensures atomic order creation + stock deduction: either both succeed or
      // both roll back on conflict/insufficient stock.
      if (deductStock) {
        for (const item of order.PedidoItem) {
          await this.inventoryService.deductStock(
            tx,
            resolvedCompanyId,
            item.productoId,
            Number(item.cantidad),
            'Orden comercial', // reason
            order.id, // referenceId
            null, // userId (not yet assigned, Phase 4 of roadmap)
          );
        }
      }

      return order;
    });
  }

  /**
   * Tracking without login: anyone with the order id can query its status.
   * It does not expose another customer's data (the id is an unguessable
   * UUID, there is no public order listing) nor internal fields like
   * usuarioId.
   */
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
