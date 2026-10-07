import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { CustomersService } from '../../src/customers/customers.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { MembershipService } from '../../src/membership/membership.service';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import { SalesController } from '../../src/sales/sales.controller';
import { SalesService } from '../../src/sales/sales.service';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-07 — Sales + Payments: tenant boundary through BusinessContext.
// Controller-level tests against the real database. The tests prove that the
// legacy JWT `empresaId` claim is NOT the tenant authority and CHARACTERIZE
// the current (AS-IS) behavior of Sales and Payments; they do not adopt any
// accidental behavior as TO-BE (see S-V1-07 SAL-007-*).
describe('S-V1-07 — BusinessContext en Sales y Payments (integración, BD real)', () => {
  let prisma: PrismaService;
  let businessContext: BusinessContextService;
  let sales: SalesController;
  let payments: PaymentsController;
  let suffix: number;
  let counter = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let suspendedUsuario: { id: string };
  let noMembUsuario: { id: string };
  // Legacy Usuario of company B linked to a User whose ACTIVE Membership is
  // in company A (the J1 divergence: legacy ownership != Membership business).
  let crossUsuario: { id: string };
  let userIds: string[];
  let usuarioIds: string[];

  let customerA: { id: string };
  let customerB: { id: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;
  let hierB: Awaited<ReturnType<typeof mkHierarchy>>;
  let cashRegisterA: { id: string };
  let openingA: { id: string };

  const sessionOf = (
    usuarioId: string,
    tokenCompanyId: string,
    overrides: Partial<AuthenticatedUser> = {},
  ): AuthenticatedUser => ({
    id: usuarioId,
    email: `s-v1-07-${usuarioId}@example.test`,
    nombre: 'S V1-07',
    empresaId: tokenCompanyId,
    permisos: ['ventas.crear', 'ventas.ver'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
    ...overrides,
  });

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `S-V1-07 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-07 Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-07 Tipo ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-07 Subtipo ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  // A fresh product per scenario keeps per-batch assertions deterministic
  // (FIFO deduction spans every batch of the same product).
  const mkProduct = async (
    companyId: string,
    hier: Awaited<ReturnType<typeof mkHierarchy>>,
    extra: { marca?: string; activo?: boolean } = {},
  ) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-07 Prod ${counter} ${suffix}`,
        codigoInterno: `SV7-${counter}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
        ...extra,
      },
      select: { id: true, nombre: true },
    });
  };

  const mkBatch = async (companyId: string, productId: string, quantity: number) => {
    counter += 1;
    return prisma.lote.create({
      data: {
        empresaId: companyId,
        productoId: productId,
        numeroLote: `S7-LOTE-${counter}-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: quantity,
      },
      select: { id: true },
    });
  };

  // Direct DB sale (bypasses the controller) to seed tenant-owned rows.
  const mkSale = async (
    companyId: string,
    usuarioId: string,
    productId: string,
    options: { total?: number; estado?: 'CONFIRMADA' | 'ANULADA'; clienteId?: string } = {},
  ) => {
    const total = options.total ?? 20;
    counter += 1;
    return prisma.venta.create({
      data: {
        empresaId: companyId,
        usuarioId,
        clienteId: options.clienteId,
        canal: 'presencial',
        total,
        numero: 900000 + counter,
        estado: options.estado ?? 'CONFIRMADA',
        ventaItems: { create: [{ productoId: productId, cantidad: 2, precioUnitario: 10 }] },
      },
      select: { id: true },
    });
  };

  const batchQuantity = async (batchId: string) =>
    Number((await prisma.lote.findUniqueOrThrow({ where: { id: batchId } })).cantidad);

  const setCashOpen = (open: boolean) =>
    prisma.aperturaCaja.update({
      where: { id: openingA.id },
      data: { fechaCierre: open ? null : new Date() },
    });

  const cashMovements = (paymentId: string) =>
    prisma.movimientoCaja.findMany({ where: { referenciaId: paymentId } });

  const mkLegacyUser = async (companyId: string, label: string) => {
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: companyId,
        nombre: `S V1-07 ${label}`,
        email: `s-v1-07-${label}-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `s-v1-07-user-${label}-${suffix}@example.test`,
        nombre: `S V1-07 ${label}`,
        usuarioId: usuario.id,
      },
      select: { id: true },
    });
    return { usuario, user };
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const prismaFactory = new CompanyScopedPrismaService(prisma);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    sales = new SalesController(
      new SalesService(
        prismaFactory,
        new InventoryService(prismaFactory),
        new LoyaltyService(prismaFactory),
        new CustomersService(prismaFactory),
      ),
      businessContext,
    );
    payments = new PaymentsController(new PaymentsService(prismaFactory), businessContext);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-07 A ${suffix}`, slug: `s-v1-07-sales-ctx-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-07 B ${suffix}`, slug: `s-v1-07-sales-ctx-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const a = await mkLegacyUser(companyA.id, 'a');
    const b = await mkLegacyUser(companyB.id, 'b');
    const susp = await mkLegacyUser(companyA.id, 'susp');
    const noMemb = await mkLegacyUser(companyA.id, 'nomemb');
    const cross = await mkLegacyUser(companyB.id, 'cross');
    usuarioA = a.usuario;
    usuarioB = b.usuario;
    suspendedUsuario = susp.usuario;
    noMembUsuario = noMemb.usuario;
    crossUsuario = cross.usuario;
    userIds = [a.user.id, b.user.id, susp.user.id, noMemb.user.id, cross.user.id];
    usuarioIds = [a.usuario.id, b.usuario.id, susp.usuario.id, noMemb.usuario.id, cross.usuario.id];

    await prisma.membership.create({
      data: { userId: a.user.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: b.user.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: susp.user.id, businessId: companyA.id, role: 'OWNER', status: 'SUSPENDED' },
    });
    // noMemb deliberately has no Membership.
    await prisma.membership.create({
      data: { userId: cross.user.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-07 Cli A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `S-V1-07 Cli B ${suffix}` },
      select: { id: true },
    });

    cashRegisterA = await prisma.caja.create({
      data: { empresaId: companyA.id, fondoFijo: 0 },
      select: { id: true },
    });
    openingA = await prisma.aperturaCaja.create({
      data: { cajaId: cashRegisterA.id, usuarioId: usuarioA.id, montoInicial: 0 },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.movimientoCaja.deleteMany({ where: { cajaId: cashRegisterA.id } });
    await prisma.aperturaCaja.deleteMany({ where: { cajaId: cashRegisterA.id } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pago.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------- Sales

  it('SBC-01: searchProducts resolves empresaId from Membership, not JWT', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);

    const result = await sales.searchProducts('S-V1-07 Prod', sessionOf(usuarioA.id, companyB.id));

    const ids = result.map((p) => p.id);
    expect(ids).toContain(productA.id);
    expect(ids).not.toContain(productB.id);
  });

  it('SBC-02: quote prices with A catalog; a B product is PRODUCTO_NO_ENCONTRADO even with the B claim', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);

    const quote = await sales.quote(
      { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 3 }] },
      sessionOf(usuarioA.id, companyB.id),
    );
    expect(quote.total).toBe('30');

    await expect(
      sales.quote(
        { canal: 'presencial', items: [{ productoId: productB.id, cantidad: 1 }] },
        sessionOf(usuarioA.id, companyB.id),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('SBC-03: create with claim B + Membership A creates the sale in A, deducts A stock, leaves B intact', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);

    const sale = await sales.create(
      { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 4 }] },
      sessionOf(usuarioA.id, companyB.id),
    );

    expect(sale.empresaId).toBe(companyA.id);
    expect(sale.usuarioId).toBe(usuarioA.id);
    expect(sale.estado).toBe('CONFIRMADA');
    expect(sale.total.toString()).toBe('40');
    expect(sale.saldo).toBe('40');
    expect(sale.numero).toEqual(expect.any(Number));
    expect(await batchQuantity(batchA.id)).toBe(6);
    expect(await batchQuantity(batchB.id)).toBe(10);

    const movements = await prisma.movimientoStock.findMany({ where: { referenciaId: sale.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      empresaId: companyA.id,
      productoId: productA.id,
      loteId: batchA.id,
      tipoMovimiento: 'Salida',
      motivo: 'Venta',
      usuarioId: usuarioA.id,
    });
    expect(Number(movements[0].cantidad)).toBe(4);

    const audit = await prisma.auditLog.findMany({
      where: { entidadId: sale.id, accion: 'CREATE' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ empresaId: companyA.id, usuarioId: usuarioA.id });
  });

  it('SBC-04: create with a B product or a B customer fails closed (404) and persists nothing', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const keyProduct = randomUUID();
    const keyCustomer = randomUUID();

    await expect(
      sales.create(
        {
          canal: 'presencial',
          items: [{ productoId: productB.id, cantidad: 1 }],
          idempotencyKey: keyProduct,
        },
        sessionOf(usuarioA.id, companyB.id),
      ),
    ).rejects.toThrow(NotFoundException);
    await expect(
      sales.create(
        {
          canal: 'presencial',
          clienteId: customerB.id,
          items: [{ productoId: productA.id, cantidad: 1 }],
          idempotencyKey: keyCustomer,
        },
        sessionOf(usuarioA.id, companyB.id),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(
      await prisma.venta.count({ where: { idempotencyKey: { in: [keyProduct, keyCustomer] } } }),
    ).toBe(0);
    expect(await batchQuantity(batchA.id)).toBe(10);
    expect(await batchQuantity(batchB.id)).toBe(10);
  });

  it('SBC-05: insufficient stock → BadRequest, the whole transaction rolls back', async () => {
    const productOk = await mkProduct(companyA.id, hierA);
    const productShort = await mkProduct(companyA.id, hierA);
    const batchOk = await mkBatch(companyA.id, productOk.id, 10);
    const batchShort = await mkBatch(companyA.id, productShort.id, 1);
    const key = randomUUID();

    await expect(
      sales.create(
        {
          canal: 'presencial',
          items: [
            { productoId: productOk.id, cantidad: 2 },
            { productoId: productShort.id, cantidad: 999 },
          ],
          idempotencyKey: key,
        },
        sessionOf(usuarioA.id, companyA.id),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await batchQuantity(batchOk.id)).toBe(10);
    expect(await batchQuantity(batchShort.id)).toBe(1);
    expect(
      await prisma.movimientoStock.count({
        where: { productoId: { in: [productOk.id, productShort.id] } },
      }),
    ).toBe(0);
  });

  it('SBC-06: idempotencyKey replays the same sale within the tenant and deducts stock once', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const key = randomUUID();
    const dto = {
      canal: 'presencial' as const,
      items: [{ productoId: productA.id, cantidad: 2 }],
      idempotencyKey: key,
    };

    const first = await sales.create(dto, sessionOf(usuarioA.id, companyB.id));
    const second = await sales.create(dto, sessionOf(usuarioA.id, companyB.id));

    expect(second.id).toBe(first.id);
    expect(second.advertenciasStockVencido).toEqual([]);
    expect(await batchQuantity(batchA.id)).toBe(8);
    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await prisma.movimientoStock.count({ where: { referenciaId: first.id } })).toBe(1);
  });

  it('SBC-07: customer + loyalty rule of A apply; a higher rule of B never does', async () => {
    const marca = `S7MARCA-${suffix}`;
    const productA = await mkProduct(companyA.id, hierA, { marca });
    const productB = await mkProduct(companyB.id, hierB, { marca });
    await mkBatch(companyA.id, productA.id, 10);
    await mkBatch(companyB.id, productB.id, 10);
    await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-07 regla A ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        marca,
      },
    });
    await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-07 regla B ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 50,
        marca,
      },
    });

    const sale = await sales.create(
      {
        canal: 'presencial',
        clienteId: customerA.id,
        items: [{ productoId: productA.id, cantidad: 2 }],
      },
      sessionOf(usuarioA.id, companyB.id),
    );

    expect(sale.clienteId).toBe(customerA.id);
    // 2 x 10 with the 10% rule of A (the 50% rule of B is invisible).
    expect(sale.total.toString()).toBe('18');
    const item = await prisma.ventaItem.findFirstOrThrow({ where: { ventaId: sale.id } });
    expect(Number(item.descuentoFidelizacionPorcentaje)).toBe(10);
    expect(item.reglaFidelizacionId).not.toBeNull();
  });

  it('SBC-08: a non-zero descuentoItem is 403 DESCUENTO_NO_AUTORIZADO and persists nothing', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const key = randomUUID();

    await expect(
      sales.create(
        {
          canal: 'presencial',
          items: [{ productoId: productA.id, cantidad: 1, descuentoItem: 5 }],
          idempotencyKey: key,
        },
        sessionOf(usuarioA.id, companyA.id),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await batchQuantity(batchA.id)).toBe(10);
  });

  it('SBC-09: an inactive product is 422 PRODUCTO_INACTIVO', async () => {
    const productA = await mkProduct(companyA.id, hierA, { activo: false });
    await mkBatch(companyA.id, productA.id, 10);

    await expect(
      sales.create(
        { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] },
        sessionOf(usuarioA.id, companyA.id),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('SBC-10: findAll is tenant-scoped (claim B + Membership A) and filters keep working', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const filterCustomer = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-07 Cli filtro ${suffix}` },
      select: { id: true },
    });
    const withCustomer = await mkSale(companyA.id, usuarioA.id, productA.id, {
      clienteId: filterCustomer.id,
    });
    const plain = await mkSale(companyA.id, usuarioA.id, productA.id);
    const saleB = await mkSale(companyB.id, usuarioB.id, productB.id, { clienteId: customerB.id });
    const session = sessionOf(usuarioA.id, companyB.id);

    const all = await sales.findAll({ pageSize: 50 }, session);
    const ids = all.data.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([withCustomer.id, plain.id]));
    expect(ids).not.toContain(saleB.id);
    expect(all.data.every((s) => s.empresaId === companyA.id)).toBe(true);

    const byCustomer = await sales.findAll({ clienteId: filterCustomer.id }, session);
    expect(byCustomer.data.map((s) => s.id)).toEqual([withCustomer.id]);
    // A B customer filter yields nothing inside A (no leak, no error).
    const byCustomerB = await sales.findAll({ clienteId: customerB.id }, session);
    expect(byCustomerB.data).toEqual([]);

    const byUser = await sales.findAll({ usuarioId: usuarioA.id, pageSize: 50 }, session);
    expect(byUser.data.every((s) => s.usuarioId === usuarioA.id)).toBe(true);
    const byUserB = await sales.findAll({ usuarioId: usuarioB.id }, session);
    expect(byUserB.data).toEqual([]);

    const pending = await sales.findAll({ estadoCobro: 'PENDIENTE', pageSize: 50 }, session);
    expect(pending.data.map((s) => s.id)).toContain(plain.id);
    const paid = await sales.findAll({ estadoCobro: 'COBRADA', pageSize: 50 }, session);
    expect(paid.data.map((s) => s.id)).not.toContain(plain.id);
  });

  it('SBC-11: findOne / getReceipt of an A sale work with claim B; a B sale is 404 with either claim', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);
    const saleB = await mkSale(companyB.id, usuarioB.id, productB.id);

    const detail = await sales.findOne(saleA.id, sessionOf(usuarioA.id, companyB.id));
    expect(detail.id).toBe(saleA.id);
    expect(detail.empresaId).toBe(companyA.id);
    expect(detail.saldo).toBe('20');
    expect(detail.estadoCobro).toBe('PENDIENTE');
    expect(detail.numeroFormateado).toMatch(/^#\d{8}$/);
    expect(detail.ventaItems).toHaveLength(1);
    expect(detail.ventaItems[0].nombre).toBe(productA.nombre);

    const receipt = await sales.getReceipt(saleA.id, sessionOf(usuarioA.id, companyB.id));
    expect(receipt.id).toBe(saleA.id);

    for (const claim of [companyA.id, companyB.id]) {
      await expect(sales.findOne(saleB.id, sessionOf(usuarioA.id, claim))).rejects.toThrow(
        NotFoundException,
      );
      await expect(sales.getReceipt(saleB.id, sessionOf(usuarioA.id, claim))).rejects.toThrow(
        NotFoundException,
      );
    }
  });

  // ----------------------------------------------- Sales payments (Sales handler)

  it('SBC-12: Sales.createPayment (transfer) on an A sale with claim B → PAGO audit, no MovimientoCaja', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);

    const result = await sales.createPayment(
      saleA.id,
      { medio: 'transferencia', monto: 5, referencia: 'REF-1' },
      sessionOf(usuarioA.id, companyB.id),
    );

    expect(result.saldo).toBe('15');
    expect(result.pago).toMatchObject({
      empresaId: companyA.id,
      usuarioId: usuarioA.id,
      ventaId: saleA.id,
      medio: 'transferencia',
      estado: 'APROBADO',
      referencia: 'REF-1',
    });
    const audit = await prisma.auditLog.findMany({
      where: { entidadId: result.pago.id, accion: 'PAGO' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].empresaId).toBe(companyA.id);
    expect(await cashMovements(result.pago.id)).toHaveLength(0);
  });

  it('SBC-13: Sales.createPayment cash — open register: Pago + vuelto, still NO MovimientoCaja; closed: 409 CAJA_CERRADA', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);

    await setCashOpen(true);
    const paid = await sales.createPayment(
      saleA.id,
      { medio: 'efectivo', monto: 10, montoRecibido: 15 },
      sessionOf(usuarioA.id, companyA.id),
    );
    expect(paid.saldo).toBe('10');
    expect(Number(paid.pago.vuelto)).toBe(5);
    // Characterization: the Sales handler (the one winning the route) never
    // creates MovimientoCaja. Not corrected here (SAL-007-05).
    expect(await cashMovements(paid.pago.id)).toHaveLength(0);

    await expect(
      sales.createPayment(
        saleA.id,
        { medio: 'efectivo', monto: 5, montoRecibido: 1 },
        sessionOf(usuarioA.id, companyA.id),
      ),
    ).rejects.toThrow(BadRequestException);

    await setCashOpen(false);
    try {
      await expect(
        sales.createPayment(
          saleA.id,
          { medio: 'efectivo', monto: 5 },
          sessionOf(usuarioA.id, companyA.id),
        ),
      ).rejects.toThrow(ConflictException);
    } finally {
      await setCashOpen(true);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(1);
  });

  it('SBC-14: Sales.createPayment overpay → 400, annulled sale → 409', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);
    const annulled = await mkSale(companyA.id, usuarioA.id, productA.id, { estado: 'ANULADA' });
    const session = sessionOf(usuarioA.id, companyA.id);

    await expect(
      sales.createPayment(saleA.id, { medio: 'transferencia', monto: 21 }, session),
    ).rejects.toThrow(BadRequestException);
    await expect(
      sales.createPayment(annulled.id, { medio: 'transferencia', monto: 1 }, session),
    ).rejects.toThrow(ConflictException);
    expect(await prisma.pago.count({ where: { ventaId: { in: [saleA.id, annulled.id] } } })).toBe(
      0,
    );
  });

  it('SBC-15: Sales.createPayment on a B sale fails closed (404) and leaves B intact', async () => {
    const productB = await mkProduct(companyB.id, hierB);
    const saleB = await mkSale(companyB.id, usuarioB.id, productB.id);

    await expect(
      sales.createPayment(
        saleB.id,
        { medio: 'transferencia', monto: 5 },
        sessionOf(usuarioA.id, companyB.id),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(await prisma.pago.count({ where: { ventaId: saleB.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { ventaId: saleB.id } })).toBe(0);
  });

  // ---------------------------------------------- Payments controller (Payments handler)

  it('SBC-16: Payments.create cash — open register creates MovimientoCaja tipo Venta; closed register still registers the Pago without movement', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);

    await setCashOpen(true);
    const withCash = await payments.create(
      saleA.id,
      { medio: 'efectivo', monto: 8 },
      sessionOf(usuarioA.id, companyB.id),
    );
    expect(withCash).toMatchObject({
      empresaId: companyA.id,
      usuarioId: usuarioA.id,
      ventaId: saleA.id,
    });
    const movements = await cashMovements(withCash.id);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      cajaId: cashRegisterA.id,
      aperturaCajaId: openingA.id,
      tipo: 'Venta',
      usuarioId: usuarioA.id,
    });
    expect(Number(movements[0].monto)).toBe(8);

    await setCashOpen(false);
    try {
      const closed = await payments.create(
        saleA.id,
        { medio: 'efectivo', monto: 2 },
        sessionOf(usuarioA.id, companyA.id),
      );
      expect(closed.estado).toBe('APROBADO');
      expect(await cashMovements(closed.id)).toHaveLength(0);
    } finally {
      await setCashOpen(true);
    }

    const transfer = await payments.create(
      saleA.id,
      { medio: 'transferencia', monto: 2 },
      sessionOf(usuarioA.id, companyA.id),
    );
    expect(await cashMovements(transfer.id)).toHaveLength(0);
  });

  it('SBC-17: Payments.create overpay → 400; B sale → 404 and B intact; findAll is tenant-scoped', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);
    const saleB = await mkSale(companyB.id, usuarioB.id, productB.id);
    const session = sessionOf(usuarioA.id, companyB.id);

    await expect(
      payments.create(saleA.id, { medio: 'transferencia', monto: 999 }, session),
    ).rejects.toThrow(BadRequestException);
    await expect(
      payments.create(saleB.id, { medio: 'transferencia', monto: 5 }, session),
    ).rejects.toThrow(NotFoundException);
    expect(await prisma.pago.count({ where: { ventaId: saleB.id } })).toBe(0);

    await payments.create(saleA.id, { medio: 'transferencia', monto: 5 }, session);
    const list = await payments.findAll(saleA.id, session);
    expect(list).toHaveLength(1);
    expect(list[0].empresaId).toBe(companyA.id);

    for (const claim of [companyA.id, companyB.id]) {
      await expect(payments.findAll(saleB.id, sessionOf(usuarioA.id, claim))).rejects.toThrow(
        NotFoundException,
      );
    }
  });

  // ------------------------------------------------------------ fail-closed

  it('SBC-18: no ACTIVE Membership (none / SUSPENDED) fails closed (403) on every Sales and Payments handler', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);

    for (const usuarioId of [noMembUsuario.id, suspendedUsuario.id]) {
      const session = sessionOf(usuarioId, companyA.id);
      await expect(sales.searchProducts('S-V1-07', session)).rejects.toThrow(ForbiddenException);
      await expect(
        sales.quote(
          { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] },
          session,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        sales.create(
          { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] },
          session,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(sales.findAll({}, session)).rejects.toThrow(ForbiddenException);
      await expect(sales.findOne(saleA.id, session)).rejects.toThrow(ForbiddenException);
      await expect(sales.getReceipt(saleA.id, session)).rejects.toThrow(ForbiddenException);
      await expect(
        sales.createPayment(saleA.id, { medio: 'transferencia', monto: 1 }, session),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        payments.create(saleA.id, { medio: 'transferencia', monto: 1 }, session),
      ).rejects.toThrow(ForbiddenException);
      await expect(payments.findAll(saleA.id, session)).rejects.toThrow(ForbiddenException);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });

  it('SBC-19: token type=cliente fails closed (403) on every Sales and Payments handler', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);
    const session = sessionOf(usuarioA.id, companyA.id, { type: 'cliente' });

    await expect(sales.searchProducts('S-V1-07', session)).rejects.toThrow(ForbiddenException);
    await expect(
      sales.quote(
        { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] },
        session,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      sales.create(
        { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] },
        session,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(sales.findAll({}, session)).rejects.toThrow(ForbiddenException);
    await expect(sales.findOne(saleA.id, session)).rejects.toThrow(ForbiddenException);
    await expect(sales.getReceipt(saleA.id, session)).rejects.toThrow(ForbiddenException);
    await expect(
      sales.createPayment(saleA.id, { medio: 'transferencia', monto: 1 }, session),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      payments.create(saleA.id, { medio: 'transferencia', monto: 1 }, session),
    ).rejects.toThrow(ForbiddenException);
    await expect(payments.findAll(saleA.id, session)).rejects.toThrow(ForbiddenException);
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });

  // --------------------------------------------------------- authorization

  it('SBC-20: permissions are unchanged (PermissionsGuard intact): ventas.crear / ventas.ver / none', () => {
    const guard = new PermissionsGuard(new Reflector());
    const contextFor = (
      controller: new (...args: never[]) => unknown,
      handler: (...args: never[]) => unknown,
      user: AuthenticatedUser,
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => controller,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as unknown as ExecutionContext;
    const session = (permisos: string[]) => sessionOf(usuarioA.id, companyA.id, { permisos });

    const sp = SalesController.prototype;
    const pp = PaymentsController.prototype;
    const requiresCreate: [
      typeof SalesController | typeof PaymentsController,
      (...args: never[]) => unknown,
    ][] = [
      [SalesController, sp.quote],
      [SalesController, sp.create],
      [SalesController, sp.createPayment],
      [PaymentsController, pp.create],
    ];
    for (const [controller, handler] of requiresCreate) {
      expect(() => guard.canActivate(contextFor(controller, handler, session([])))).toThrow(
        ForbiddenException,
      );
      expect(() =>
        guard.canActivate(contextFor(controller, handler, session(['ventas.ver']))),
      ).toThrow(ForbiddenException);
      expect(guard.canActivate(contextFor(controller, handler, session(['ventas.crear'])))).toBe(
        true,
      );
    }

    for (const handler of [sp.findAll, sp.findOne, sp.getReceipt]) {
      expect(() => guard.canActivate(contextFor(SalesController, handler, session([])))).toThrow(
        ForbiddenException,
      );
      // `ventas.crear` alone does NOT grant read (the seeded users hold only it).
      expect(() =>
        guard.canActivate(contextFor(SalesController, handler, session(['ventas.crear']))),
      ).toThrow(ForbiddenException);
      expect(guard.canActivate(contextFor(SalesController, handler, session(['ventas.ver'])))).toBe(
        true,
      );
    }

    // No @RequirePermission: searchProducts and Payments.findAll.
    expect(guard.canActivate(contextFor(SalesController, sp.searchProducts, session([])))).toBe(
      true,
    );
    expect(guard.canActivate(contextFor(PaymentsController, pp.findAll, session([])))).toBe(true);
  });

  it('SBC-21 (ventas.ver, characterization): the permission is required by the code but absent from the seed catalog', () => {
    const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8');
    const controllerSource = readFileSync(
      join(__dirname, '../../src/sales/sales.controller.ts'),
      'utf8',
    );

    expect(controllerSource).toMatch(/@RequirePermission\(.ventas\.ver.\)/);
    expect(seed).not.toContain('ventas.ver');
    // The seeded catalog only knows ventas.crear / ventas.anular for sales.
    expect(seed).toMatch(/.ventas\.crear./);
    expect(seed).toMatch(/.ventas\.anular./);
  });

  // ------------------------------------------------------ J1 / idempotency

  it('SBC-22 (J1, characterization): usuarioId keeps the legacy user.id even when it belongs to another empresa', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const legacy = await prisma.usuario.findUniqueOrThrow({ where: { id: crossUsuario.id } });
    expect(legacy.empresaId).toBe(companyB.id);

    const sale = await sales.create(
      { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 2 }] },
      sessionOf(crossUsuario.id, companyB.id),
    );

    expect(sale.empresaId).toBe(companyA.id);
    expect(sale.usuarioId).toBe(crossUsuario.id);
    expect(await batchQuantity(batchA.id)).toBe(8);
    const movements = await prisma.movimientoStock.findMany({ where: { referenciaId: sale.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].empresaId).toBe(companyA.id);
    expect(movements[0].usuarioId).toBe(crossUsuario.id);

    const payment = await sales.createPayment(
      sale.id,
      { medio: 'transferencia', monto: 5 },
      sessionOf(crossUsuario.id, companyB.id),
    );
    expect(payment.pago.empresaId).toBe(companyA.id);
    expect(payment.pago.usuarioId).toBe(crossUsuario.id);
  });

  it('SBC-23 (idempotency cross-tenant, characterization): the key is globally unique — B reusing A key fails with P2002 and nothing leaks', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const key = randomUUID();

    const saleA = await sales.create(
      {
        canal: 'presencial',
        items: [{ productoId: productA.id, cantidad: 1 }],
        idempotencyKey: key,
      },
      sessionOf(usuarioA.id, companyA.id),
    );

    // Existing dependency (global @unique idempotencyKey): the scoped lookup
    // does not see A's sale, the INSERT then collides. Not corrected here.
    await expect(
      sales.create(
        {
          canal: 'presencial',
          items: [{ productoId: productB.id, cantidad: 1 }],
          idempotencyKey: key,
        },
        sessionOf(usuarioB.id, companyB.id),
      ),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(1);
    expect((await prisma.venta.findUniqueOrThrow({ where: { idempotencyKey: key } })).id).toBe(
      saleA.id,
    );
    expect(await batchQuantity(batchA.id)).toBe(9);
    expect(await batchQuantity(batchB.id)).toBe(10);
  });

  it('SBC-24: a member of B only sees B (symmetric isolation) and cannot touch A sales', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const saleA = await mkSale(companyA.id, usuarioA.id, productA.id);
    const saleB = await mkSale(companyB.id, usuarioB.id, productB.id);
    const session = sessionOf(usuarioB.id, companyA.id);

    const list = await sales.findAll({ pageSize: 50 }, session);
    const ids = list.data.map((s) => s.id);
    expect(ids).toContain(saleB.id);
    expect(ids).not.toContain(saleA.id);
    expect((await sales.findOne(saleB.id, session)).empresaId).toBe(companyB.id);
    await expect(sales.findOne(saleA.id, session)).rejects.toThrow(NotFoundException);
    await expect(
      sales.createPayment(saleA.id, { medio: 'transferencia', monto: 5 }, session),
    ).rejects.toThrow(NotFoundException);
    await expect(
      payments.create(saleA.id, { medio: 'transferencia', monto: 5 }, session),
    ).rejects.toThrow(NotFoundException);
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });
});
