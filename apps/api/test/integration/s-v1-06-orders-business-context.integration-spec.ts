import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { MembershipService } from '../../src/membership/membership.service';
import { OrdersController } from '../../src/orders/orders.controller';
import { OrdersService } from '../../src/orders/orders.service';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('S-V1-06 — BusinessContext en Orders (integración, BD real)', () => {
  let prisma: PrismaService;
  let businessContext: BusinessContextService;
  let orders: OrdersController;
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
  let productA: { id: string };
  let productB: { id: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;

  const sessionOf = (
    usuarioId: string,
    tokenCompanyId: string,
    overrides: Partial<AuthenticatedUser> = {},
  ): AuthenticatedUser => ({
    id: usuarioId,
    email: `s-v1-06-${usuarioId}@example.test`,
    nombre: 'S V1-06',
    empresaId: tokenCompanyId,
    permisos: ['pedidos.gestionar'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
    ...overrides,
  });

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `S-V1-06 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-06 Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-06 Tipo ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-06 Subtipo ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  const mkProduct = async (companyId: string, hier: Awaited<ReturnType<typeof mkHierarchy>>) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-06 Prod ${counter} ${suffix}`,
        codigoInterno: `SV6-${counter}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
  };

  const mkBatch = async (companyId: string, productId: string, quantity: number) => {
    counter += 1;
    return prisma.lote.create({
      data: {
        empresaId: companyId,
        productoId: productId,
        numeroLote: `S6-LOTE-${counter}-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: quantity,
      },
      select: { id: true },
    });
  };

  const mkOrder = (
    companyId: string,
    customerId: string,
    items: { productId: string; quantity: number }[],
    status: 'RECIBIDO' | 'CONFIRMADO' | 'CANCELADO' = 'RECIBIDO',
  ) =>
    prisma.pedido.create({
      data: {
        empresaId: companyId,
        clienteId: customerId,
        estado: status,
        canalOrigen: 'web',
        total: 10,
        pedidoItems: {
          create: items.map((i) => ({
            productoId: i.productId,
            cantidad: i.quantity,
            precioUnitario: 10,
          })),
        },
      },
      select: { id: true },
    });

  const batchQuantity = async (batchId: string) =>
    Number((await prisma.lote.findUniqueOrThrow({ where: { id: batchId } })).cantidad);

  const mkLegacyUser = async (companyId: string, label: string) => {
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: companyId,
        nombre: `S V1-06 ${label}`,
        email: `s-v1-06-${label}-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: `s-v1-06-user-${label}-${suffix}@example.test`,
        nombre: `S V1-06 ${label}`,
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
    orders = new OrdersController(
      new OrdersService(prismaFactory, new InventoryService(prismaFactory)),
      businessContext,
    );
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-06 A ${suffix}`, slug: `s-v1-06-orders-ctx-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-06 B ${suffix}`, slug: `s-v1-06-orders-ctx-b-${suffix}`, configuracion: {} },
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
    const hierB = await mkHierarchy(companyB.id, 'B');
    productA = await mkProduct(companyA.id, hierA);
    productB = await mkProduct(companyB.id, hierB);

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-06 Cli A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `S-V1-06 Cli B ${suffix}` },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
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

  it('OBC-01: list resolves empresaId from Membership, not JWT', async () => {
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    const result = await orders.list(sessionOf(usuarioA.id, companyB.id));

    const ids = result.map((o) => o.id);
    expect(ids).toContain(orderA.id);
    expect(ids).not.toContain(orderB.id);
    expect(result.every((o) => o.empresaId === companyA.id)).toBe(true);
  });

  it('OBC-02: list with estado filter respects tenant and state simultaneously', async () => {
    const received = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const cancelled = await mkOrder(
      companyA.id,
      customerA.id,
      [{ productId: productA.id, quantity: 1 }],
      'CANCELADO',
    );
    const receivedB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    const result = await orders.list(sessionOf(usuarioA.id, companyB.id), 'RECIBIDO');

    const ids = result.map((o) => o.id);
    expect(ids).toContain(received.id);
    expect(ids).not.toContain(cancelled.id);
    expect(ids).not.toContain(receivedB.id);
    expect(result.every((o) => o.empresaId === companyA.id && o.estado === 'RECIBIDO')).toBe(true);
  });

  it('OBC-03: get resolves empresaId from Membership, not JWT', async () => {
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 2 },
    ]);

    const result = await orders.get(orderA.id, sessionOf(usuarioA.id, companyB.id));

    expect(result.id).toBe(orderA.id);
    expect(result.empresaId).toBe(companyA.id);
    expect(result.pedidoItems).toHaveLength(1);
    expect(result.cliente.id).toBe(customerA.id);
  });

  it('OBC-04: get of another tenant order fails closed, even with JWT claim of that tenant', async () => {
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    await expect(orders.get(orderB.id, sessionOf(usuarioA.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );
    // The JWT claim pointing to B does not grant access to B either.
    await expect(orders.get(orderB.id, sessionOf(usuarioA.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('OBC-05: updateStatus of another tenant order fails closed and leaves it intact', async () => {
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 3 },
    ]);

    await expect(
      orders.updateStatus(orderB.id, { estado: 'CONFIRMADO' }, sessionOf(usuarioA.id, companyB.id)),
    ).rejects.toThrow(NotFoundException);

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderB.id } });
    expect(row.estado).toBe('RECIBIDO');
    expect(row.usuarioId).toBeNull();
    expect(await batchQuantity(batchB.id)).toBe(10);
    expect(await prisma.movimientoStock.count({ where: { referenciaId: orderB.id } })).toBe(0);
  });

  it('OBC-06: confirm (RECIBIDO→CONFIRMADO) deducts stock and creates MovimientoStock in A only', async () => {
    const freshProduct = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, freshProduct.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: freshProduct.id, quantity: 4 },
    ]);

    const result = await orders.updateStatus(
      orderA.id,
      { estado: 'CONFIRMADO' },
      sessionOf(usuarioA.id, companyB.id),
    );

    expect(result.estado).toBe('CONFIRMADO');
    expect(result.empresaId).toBe(companyA.id);
    expect(result.usuarioId).toBe(usuarioA.id);
    expect(await batchQuantity(batchA.id)).toBe(6);
    expect(await batchQuantity(batchB.id)).toBe(10);

    const movements = await prisma.movimientoStock.findMany({
      where: { referenciaId: orderA.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      empresaId: companyA.id,
      productoId: freshProduct.id,
      loteId: batchA.id,
      tipoMovimiento: 'Salida',
      motivo: 'Venta',
      usuarioId: usuarioA.id,
    });
    expect(Number(movements[0].cantidad)).toBe(4);
  });

  it('OBC-07: insufficient stock → BadRequest, order stays RECIBIDO, no partial effects', async () => {
    const freshProduct = await mkProduct(companyA.id, hierA);
    const freshProduct2 = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, freshProduct.id, 10);
    const batchA2 = await mkBatch(companyA.id, freshProduct2.id, 1);
    // First item is satisfiable, second is not: the whole transaction must roll back.
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: freshProduct.id, quantity: 2 },
      { productId: freshProduct2.id, quantity: 999 },
    ]);
    const before = await batchQuantity(batchA.id);

    await expect(
      orders.updateStatus(orderA.id, { estado: 'CONFIRMADO' }, sessionOf(usuarioA.id, companyA.id)),
    ).rejects.toThrow(BadRequestException);

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
    expect(row.usuarioId).toBeNull();
    expect(await batchQuantity(batchA.id)).toBe(before);
    expect(await batchQuantity(batchA2.id)).toBe(1);
    expect(await prisma.movimientoStock.count({ where: { referenciaId: orderA.id } })).toBe(0);
  });

  it('OBC-08: cancel (RECIBIDO→CANCELADO) sets usuarioId and does not touch stock', async () => {
    const freshProduct = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, freshProduct.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: freshProduct.id, quantity: 3 },
    ]);
    const before = await batchQuantity(batchA.id);

    const result = await orders.updateStatus(
      orderA.id,
      { estado: 'CANCELADO' },
      sessionOf(usuarioA.id, companyB.id),
    );

    expect(result.estado).toBe('CANCELADO');
    expect(result.empresaId).toBe(companyA.id);
    expect(result.usuarioId).toBe(usuarioA.id);
    expect(await batchQuantity(batchA.id)).toBe(before);
    expect(await prisma.movimientoStock.count({ where: { referenciaId: orderA.id } })).toBe(0);
  });

  it('OBC-09: double confirmation → BadRequest, no second deduction or movement', async () => {
    const freshProduct = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, freshProduct.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: freshProduct.id, quantity: 2 },
    ]);
    const session = sessionOf(usuarioA.id, companyA.id);
    const before = await batchQuantity(batchA.id);

    await orders.updateStatus(orderA.id, { estado: 'CONFIRMADO' }, session);
    await expect(orders.updateStatus(orderA.id, { estado: 'CONFIRMADO' }, session)).rejects.toThrow(
      BadRequestException,
    );

    expect(await batchQuantity(batchA.id)).toBe(before - 2);
    expect(await prisma.movimientoStock.count({ where: { referenciaId: orderA.id } })).toBe(1);
  });

  it('OBC-10: no ACTIVE Membership (none / SUSPENDED) fails closed on the three handlers', async () => {
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);

    for (const usuarioId of [noMembUsuario.id, suspendedUsuario.id]) {
      const session = sessionOf(usuarioId, companyA.id);
      await expect(orders.list(session)).rejects.toThrow(ForbiddenException);
      await expect(orders.get(orderA.id, session)).rejects.toThrow(ForbiddenException);
      await expect(
        orders.updateStatus(orderA.id, { estado: 'CANCELADO' }, session),
      ).rejects.toThrow(ForbiddenException);
    }

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
  });

  it('OBC-11: token type=cliente fails closed on the three handlers', async () => {
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const session = sessionOf(usuarioA.id, companyA.id, { type: 'cliente' });

    await expect(orders.list(session)).rejects.toThrow(ForbiddenException);
    await expect(orders.get(orderA.id, session)).rejects.toThrow(ForbiddenException);
    await expect(orders.updateStatus(orderA.id, { estado: 'CANCELADO' }, session)).rejects.toThrow(
      ForbiddenException,
    );

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
  });

  it('OBC-12: pedidos.gestionar is still required on the three handlers (PermissionsGuard intact)', () => {
    const guard = new PermissionsGuard(new Reflector());
    const contextFor = (
      handler: (...args: never[]) => unknown,
      user: AuthenticatedUser,
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => OrdersController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as unknown as ExecutionContext;

    const proto = OrdersController.prototype;
    for (const handler of [proto.list, proto.get, proto.updateStatus]) {
      expect(() =>
        guard.canActivate(
          contextFor(handler, sessionOf(usuarioA.id, companyA.id, { permisos: [] })),
        ),
      ).toThrow(ForbiddenException);
      expect(guard.canActivate(contextFor(handler, sessionOf(usuarioA.id, companyA.id)))).toBe(
        true,
      );
    }
  });

  it('OBC-13 (J1, characterization): usuarioId keeps the legacy user.id even when it belongs to another empresa', async () => {
    const freshProduct = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, freshProduct.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: freshProduct.id, quantity: 2 },
    ]);
    // The legacy Usuario behind this session belongs to company B, but its
    // User holds the ACTIVE Membership of company A.
    const legacy = await prisma.usuario.findUniqueOrThrow({ where: { id: crossUsuario.id } });
    expect(legacy.empresaId).toBe(companyB.id);

    const result = await orders.updateStatus(
      orderA.id,
      { estado: 'CONFIRMADO' },
      sessionOf(crossUsuario.id, companyB.id),
    );

    expect(result.empresaId).toBe(companyA.id);
    expect(result.estado).toBe('CONFIRMADO');
    // ORD-006-01: user.id is kept as the legacy value, not corrected.
    expect(result.usuarioId).toBe(crossUsuario.id);
    expect(await batchQuantity(batchA.id)).toBe(8);
    const movements = await prisma.movimientoStock.findMany({
      where: { referenciaId: orderA.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].empresaId).toBe(companyA.id);
    expect(movements[0].usuarioId).toBe(crossUsuario.id);
  });

  it('OBC-14: a member of B only sees B orders (symmetric isolation)', async () => {
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    const result = await orders.list(sessionOf(usuarioB.id, companyB.id));

    const ids = result.map((o) => o.id);
    expect(ids).toContain(orderB.id);
    expect(ids).not.toContain(orderA.id);
    await expect(orders.get(orderA.id, sessionOf(usuarioB.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );
  });
});
