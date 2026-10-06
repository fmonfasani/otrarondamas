import { ForbiddenException } from '@nestjs/common';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { MembershipService } from '../../src/membership/membership.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PurchasesController } from '../../src/purchases/purchases.controller';
import { PurchasesService } from '../../src/purchases/purchases.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('S-V1-05 — BusinessContext en Purchases (integración, BD real)', () => {
  let prisma: PrismaService;
  let prismaFactory: CompanyScopedPrismaService;
  let businessContext: BusinessContextService;
  let purchases: PurchasesController;
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
  let supplierA: { id: string };
  let supplierB: { id: string };

  const sessionOf = (userId: string, tokenCompanyId: string): AuthenticatedUser => ({
    id: userId,
    email: `s-v1-05-p-${userId}@example.test`,
    nombre: 'S V1-05 P',
    empresaId: tokenCompanyId,
    permisos: ['compras.gestionar'],
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
    nombre: `S-V1-05 P Prod ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: familyId,
    subfamiliaId: subfamilyId,
    tipoId: typeId,
    subtipoId: subtypeId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new CompanyScopedPrismaService(prisma);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    purchases = new PurchasesController(new PurchasesService(prismaFactory), businessContext);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-05 P A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-05 P B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUser = async (companyId: string, label: string) => {
      const usuario = await prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S V1-05 P ${label}`,
          email: `s-v1-05-p-${label}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });
      const user = await prisma.user.create({
        data: {
          email: `s-v1-05-P-user-${label}-${suffix}@example.test`,
          nombre: `S V1-05 P ${label}`,
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
        nombre: 'S V1-05 P Susp',
        email: `s-v1-05-P-susp-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const suspendedUserResult = await prisma.user.create({
      data: {
        email: `s-v1-05-P-user-susp-${suffix}@example.test`,
        nombre: 'S V1-05 P Susp',
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
        nombre: 'S V1-05 P NoMemb',
        email: `s-v1-05-P-nomemb-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const noMembUserResult = await prisma.user.create({
      data: {
        email: `s-v1-05-P-user-nomemb-${suffix}@example.test`,
        nombre: 'S V1-05 P NoMemb',
        usuarioId: noMembUsuario.id,
      },
      select: { id: true },
    });
    userWithoutMemberships = noMembUserResult;

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `S-V1-05 P Fam A ${suffix}`, prefijo: 'P5A' },
      select: { id: true },
    });
    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `S-V1-05 P Sub A ${suffix}`,
        prefijo: 'P5B',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `S-V1-05 P Tipo A ${suffix}`,
        prefijo: 'P5C',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `S-V1-05 P Subtipo A ${suffix}`,
        prefijo: 'P5D',
      },
      select: { id: true },
    });

    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `S-V1-05 P Fam B ${suffix}`, prefijo: 'P5E' },
      select: { id: true },
    });
    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `S-V1-05 P Sub B ${suffix}`,
        prefijo: 'P5F',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `S-V1-05 P Tipo B ${suffix}`,
        prefijo: 'P5G',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `S-V1-05 P Subtipo B ${suffix}`,
        prefijo: 'P5H',
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
        `P5A${suffix}`,
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
        `P5B${suffix}`,
      ),
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `S-V1-05 P Prov A ${suffix}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `S-V1-05 P Prov B ${suffix}` },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.devolucionProveedorItem.deleteMany({
      where: { productoId: { in: [productA.id, productB.id] } },
    });
    await prisma.devolucionProveedor.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pagoProveedor.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.compraItem.deleteMany({
      where: { productoId: { in: [productA.id, productB.id] } },
    });
    await prisma.compra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.proveedor.deleteMany({ where: { empresaId: { in: companies } } });
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

  it('BC-01: listSuppliers resolves empresaId from Membership, not JWT', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await purchases.listSuppliers(session);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: supplierA.id })]));
    expect(result.find((s) => s.id === supplierB.id)).toBeUndefined();
  });

  it('BC-02: createSupplier resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await purchases.createSupplier(
      { nombre: `S-V1-05 P New Prov ${suffix}` },
      session,
    );
    expect(result.empresaId).toBe(companyA.id);
  });

  it('BC-03: listPurchases resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await purchases.listPurchases(session);
    expect(Array.isArray(result)).toBe(true);
  });

  it('BC-04: createPurchase resolves empresaId from Membership', async () => {
    const session = sessionOf(usuarioA.id, companyB.id);
    const result = await purchases.createPurchase(
      {
        proveedorId: supplierA.id,
        items: [{ productoId: productA.id, cantidadPedida: 5, costoUnitario: 10 }],
      },
      session,
    );
    expect(result.empresaId).toBe(companyA.id);
    expect(result.estado).toBe('BORRADOR');
  });

  it('BC-05: SUSPENDED membership fails closed with ForbiddenException', async () => {
    const session = sessionOf(suspendedUsuario.id, companyA.id);
    await expect(purchases.listSuppliers(session)).rejects.toThrow(ForbiddenException);
    await expect(purchases.listPurchases(session)).rejects.toThrow(ForbiddenException);
    await expect(purchases.createSupplier({ nombre: 'test' }, session)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('BC-06: user without Membership fails closed', async () => {
    const session = sessionOf(noMembUsuario.id, companyA.id);
    await expect(purchases.listSuppliers(session)).rejects.toThrow(ForbiddenException);
  });

  it('BC-07: cross-tenant supplier access is blocked', async () => {
    const session = sessionOf(usuarioA.id, companyA.id);
    await expect(
      purchases.createPurchase(
        {
          proveedorId: supplierB.id,
          items: [{ productoId: productA.id, cantidadPedida: 1, costoUnitario: 10 }],
        },
        session,
      ),
    ).rejects.toThrow();
  });

  it('BC-08: userB cannot access companyA suppliers', async () => {
    const session = sessionOf(usuarioB.id, companyB.id);
    const result = await purchases.listSuppliers(session);
    expect(result.find((s) => s.id === supplierA.id)).toBeUndefined();
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: supplierB.id })]));
  });
});
