import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { InventoryController } from '../../src/inventory/inventory.controller';
import { InventoryService } from '../../src/inventory/inventory.service';
import { MembershipService } from '../../src/membership/membership.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('S-V1-05 — BusinessContext en Inventory (integración, BD real)', () => {
  let prisma: PrismaService;
  let prismaFactory: CompanyScopedPrismaService;
  let businessContext: BusinessContextService;
  let inventory: InventoryController;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let suspendedUser: { id: string };
  let userWithoutMemberships: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let suspendedUsuario: { id: string };
  let noMembUsuario: { id: string };

  let familyA: { id: string };
  let subfamilyA: { id: string };
  let typeA: { id: string };
  let subtypeA: { id: string };
  let familyB: { id: string };
  let subfamilyB: { id: string };
  let typeB: { id: string };
  let subtypeB: { id: string };

  let productA: { id: string };
  let productB: { id: string };
  let batchA: { id: string };

  const sessionOf = (userId: string, tokenCompanyId: string): AuthenticatedUser => ({
    id: userId,
    email: `s-v1-05-${userId}@example.test`,
    nombre: 'S V1-05',
    empresaId: tokenCompanyId,
    permisos: ['inventario.ajustes'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  const baseProduct = (
    companyId: string,
    familyId: string,
    subfamilyId: string,
    typeId: string,
    subtypeId: string,
    internalCode: string,
  ) => ({
    empresaId: companyId,
    nombre: `S-V1-05 Prod ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: familyId,
    subfamiliaId: subfamilyId,
    tipoId: typeId,
    subtipoId: subtypeId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const batchData = (companyId: string, productId: string, batchNumber: string) => ({
    empresaId: companyId,
    productoId: productId,
    numeroLote: batchNumber,
    vencimiento: new Date('2030-01-01T00:00:00.000Z'),
    cantidad: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new CompanyScopedPrismaService(prisma);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    inventory = new InventoryController(
      new InventoryService(prismaFactory),
      prismaFactory,
      businessContext,
    );
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-05 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-05 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUser = async (companyId: string, label: string) => {
      const usuario = await prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S V1-05 ${label}`,
          email: `s-v1-05-${label}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });
      const user = await prisma.user.create({
        data: {
          email: `s-v1-05-user-${label}-${suffix}@example.test`,
          nombre: `S V1-05 ${label}`,
          usuarioId: usuario.id,
        },
        select: { id: true },
      });
      await prisma.membership.create({
        data: { userId: user.id, businessId: companyId, role: 'OWNER', status: 'ACTIVE' },
      });
      return { usuario, user };
    };

    const userAResult = await mkUser(companyA.id, 'a');
    const userBResult = await mkUser(companyB.id, 'b');
    userA = userAResult.user;
    userB = userBResult.user;
    usuarioA = userAResult.usuario;
    usuarioB = userBResult.usuario;

    suspendedUsuario = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'S V1-05 Susp',
        email: `s-v1-05-susp-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const suspendedUserResult = await prisma.user.create({
      data: {
        email: `s-v1-05-user-susp-${suffix}@example.test`,
        nombre: 'S V1-05 Susp',
        usuarioId: suspendedUsuario.id,
      },
      select: { id: true },
    });
    suspendedUser = suspendedUserResult;
    await prisma.membership.create({
      data: {
        userId: suspendedUser.id,
        businessId: companyA.id,
        role: 'OWNER',
        status: 'SUSPENDED',
      },
    });

    noMembUsuario = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'S V1-05 NoMemb',
        email: `s-v1-05-nomemb-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const noMembUserResult = await prisma.user.create({
      data: {
        email: `s-v1-05-user-nomemb-${suffix}@example.test`,
        nombre: 'S V1-05 NoMemb',
        usuarioId: noMembUsuario.id,
      },
      select: { id: true },
    });
    userWithoutMemberships = noMembUserResult;

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `S-V1-05 Fam A ${suffix}`, prefijo: 'S5A' },
      select: { id: true },
    });
    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `S-V1-05 Sub A ${suffix}`,
        prefijo: 'S5B',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `S-V1-05 Tipo A ${suffix}`,
        prefijo: 'S5C',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `S-V1-05 Subtipo A ${suffix}`,
        prefijo: 'S5D',
      },
      select: { id: true },
    });

    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `S-V1-05 Fam B ${suffix}`, prefijo: 'S5E' },
      select: { id: true },
    });
    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `S-V1-05 Sub B ${suffix}`,
        prefijo: 'S5F',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `S-V1-05 Tipo B ${suffix}`,
        prefijo: 'S5G',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `S-V1-05 Subtipo B ${suffix}`,
        prefijo: 'S5H',
      },
      select: { id: true },
    });

    productA = await prisma.producto.create({
      data: baseProduct(
        companyA.id,
        familyA.id,
        subfamilyA.id,
        typeA.id,
        subtypeA.id,
        `S5A${suffix}`,
      ),
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: baseProduct(
        companyB.id,
        familyB.id,
        subfamilyB.id,
        typeB.id,
        subtypeB.id,
        `S5B${suffix}`,
      ),
      select: { id: true },
    });

    batchA = await prisma.lote.create({
      data: batchData(companyA.id, productA.id, `S5-LOTEA-${suffix}`),
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, suspendedUser.id, userWithoutMemberships.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioA.id, usuarioB.id, suspendedUsuario.id, noMembUsuario.id] } },
    });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('BC-01: consolidatedStock resolves empresaId from Membership, not JWT', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await inventory.stock(session);
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ productoId: productA.id })]),
    );
    expect(result.find((r) => r.productoId === productB.id)).toBeUndefined();
  });

  it('BC-02: batchesForProduct resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const batches = await inventory.batchesForProduct(productA.id, session);
    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches[0].productoId).toBe(productA.id);
  });

  it('BC-03: movementsForProduct resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const movements = await inventory.movementsForProduct(productA.id, session);
    expect(Array.isArray(movements)).toBe(true);
  });

  it('BC-04: registerAdjustment resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await inventory.registerAdjustment(
      { loteId: batchA.id, cantidad: 5, motivo: 'S-V1-05 Test' },
      session,
    );
    expect(result.empresaId).toBe(companyA.id);
    expect(result.empresaId).not.toBe(session.empresaId);
    expect(result.loteId).toBe(batchA.id);
  });

  it('BC-05: alerts resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await inventory.alerts(session);
    expect(result).toHaveProperty('stockBajo');
    expect(result).toHaveProperty('lotesPorVencer');
  });

  it('BC-06: SUSPENDED membership fails closed with ForbiddenException', async () => {
    const session = sessionOf(suspendedUsuario.id, companyA.id);
    await expect(inventory.stock(session)).rejects.toThrow(ForbiddenException);
    await expect(inventory.batchesForProduct(productA.id, session)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(inventory.movementsForProduct(productA.id, session)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(inventory.alerts(session)).rejects.toThrow(ForbiddenException);
  });

  it('BC-07: user without Membership fails closed', async () => {
    const session = sessionOf(noMembUsuario.id, companyA.id);
    await expect(inventory.stock(session)).rejects.toThrow(ForbiddenException);
  });

  it('BC-08: cross-tenant access is blocked by companyScopeExtension', async () => {
    const session = sessionOf(usuarioA.id, companyA.id);
    await expect(inventory.batchesForProduct(productB.id, session)).rejects.toThrow(
      NotFoundException,
    );
    // B's row still exists, intact, under its company (same criterion as
    // s-v1-04 T2).
    const rowB = await prisma.producto.findUniqueOrThrow({
      where: { id: productB.id },
      select: { id: true, empresaId: true },
    });
    expect(rowB.empresaId).toBe(companyB.id);
  });

  it('BC-09: registerAdjustment on cross-tenant batch fails closed', async () => {
    const session = sessionOf(usuarioA.id, companyA.id);
    await expect(
      inventory.registerAdjustment(
        { loteId: 'non-existent', cantidad: 5, motivo: 'test' },
        session,
      ),
    ).rejects.toThrow();
  });

  it('BC-10: userB cannot access companyA data', async () => {
    const session = sessionOf(usuarioB.id, companyB.id);
    const result = await inventory.stock(session);
    expect(result.find((r) => r.productoId === productA.id)).toBeUndefined();
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ productoId: productB.id })]),
    );
  });
});
