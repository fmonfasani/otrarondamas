import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { MembershipStatus } from '@prisma/client';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { CatalogController } from '../../src/catalog/catalog.controller';
import { CatalogHierarchyController } from '../../src/catalog/catalog-hierarchy.controller';
import type { CreateProductDto } from '../../src/catalog/dto/create-product.dto';
import type { UpdateProductDto } from '../../src/catalog/dto/update-product.dto';
import { MembershipService } from '../../src/membership/membership.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-04 — First BusinessContext integration in the CATALOG domain.
// Everything runs against a disposable DB; no Prisma mocks.
//
// The REAL controllers are exercised (same constructor as production) with
// the REAL BusinessContextService on top of the REAL MembershipService. The
// guards are not executed here — that is the responsibility of the HTTP spec
// s-v1-04-catalog-http.integration-spec.ts, which runs against the compiled
// stack.
//
// Chain tested on every call:
//   AuthenticatedUser → BusinessContextService → User → Membership ACTIVE
//   → businessId → resolveCompanyId() → CompanyScopedPrismaService
//   → forCompany() → companyScopeExtension (+ B3 relation ownership)
describe('S-V1-04 — BusinessContext en Catálogo (integración, BD real)', () => {
  let prisma: PrismaService;
  let prismaFactory: CompanyScopedPrismaService;
  let businessContext: BusinessContextService;
  let catalog: CatalogController;
  let hierarchy: CatalogHierarchyController;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let userWithoutMemberships: { id: string };
  let userWithoutUser: { id: string };
  let suspendedUser: { id: string };

  // Hierarchy A: Familia → Subfamilia → Tipo → Subtipo (+ a second
  // Subfamilia/Tipo/Subtipo of A to test hierarchical incoherence).
  let familyA: { id: string };
  let subfamilyA: { id: string };
  let typeA: { id: string };
  let subtypeA: { id: string };
  let subfamilyA2: { id: string };
  let typeA2: { id: string };
  let subtypeA2: { id: string };
  // Complete, coherent hierarchy B (for cross-tenant).
  let familyB: { id: string };
  let subfamilyB: { id: string };
  let typeB: { id: string };
  let subtypeB: { id: string };

  let productA: { id: string };
  let productB: { id: string };

  // Session with the LEGACY JWT shape. `empresaId` comes from the token and is
  // knowledge of the HTTP client, not an authority: T15 proves it.
  const sessionOf = (userId: string, tokenCompanyId: string): AuthenticatedUser => ({
    id: userId,
    email: `s-v1-04-${userId}@example.test`,
    nombre: 'S V1-04',
    empresaId: tokenCompanyId,
    permisos: ['productos.gestionar'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  const dtoOfA = (tag: string): CreateProductDto =>
    ({
      nombre: `S-V1-04 Prod A ${tag}`,
      codigoInterno: `SV4A${tag}`,
      familiaId: familyA.id,
      subfamiliaId: subfamilyA.id,
      tipoId: typeA.id,
      subtipoId: subtypeA.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 2,
    }) as CreateProductDto;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new CompanyScopedPrismaService(prisma);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    catalog = new CatalogController(prismaFactory, businessContext);
    hierarchy = new CatalogHierarchyController(prismaFactory, businessContext);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-04 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-04 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkHierarchy = async (companyId: string, tag: string) => {
      const family = await prisma.familia.create({
        data: { empresaId: companyId, nombre: `S-V1-04 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
        select: { id: true },
      });
      const subfamily = await prisma.subfamilia.create({
        data: {
          empresaId: companyId,
          familiaId: family.id,
          nombre: `S-V1-04 Sub ${tag} ${suffix}`,
          prefijo: `S${tag}`,
        },
        select: { id: true },
      });
      const type = await prisma.tipo.create({
        data: {
          empresaId: companyId,
          subfamiliaId: subfamily.id,
          nombre: `S-V1-04 Tip ${tag} ${suffix}`,
          prefijo: `T${tag}`,
        },
        select: { id: true },
      });
      const subtype = await prisma.subtipo.create({
        data: {
          empresaId: companyId,
          tipoId: type.id,
          nombre: `S-V1-04 Subt ${tag} ${suffix}`,
          prefijo: `B${tag}`,
        },
        select: { id: true },
      });
      return { familia: family, subfamilia: subfamily, tipo: type, subtipo: subtype };
    };

    const hierA = await mkHierarchy(companyA.id, 'A');
    familyA = hierA.familia;
    subfamilyA = hierA.subfamilia;
    typeA = hierA.tipo;
    subtypeA = hierA.subtipo;

    // Second Subfamilia/Tipo/Subtipo inside A: it exists and is coherent
    // with itself, but does NOT chain with subfamilyA/typeA — it is the fixture
    // for the hierarchical incoherence (T10).
    const hierA2 = await mkHierarchy(companyA.id, 'A2');
    subfamilyA2 = hierA2.subfamilia;
    typeA2 = hierA2.tipo;
    subtypeA2 = hierA2.subtipo;

    const hierB = await mkHierarchy(companyB.id, 'B');
    familyB = hierB.familia;
    subfamilyB = hierB.subfamilia;
    typeB = hierB.tipo;
    subtypeB = hierB.subtipo;

    const mkUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-04 ${tag} ${suffix}`,
          email: `s-v1-04-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    userA = await mkUser(companyA.id, 'a');
    userB = await mkUser(companyB.id, 'b');
    userWithoutMemberships = await mkUser(companyA.id, 'sinnmemb');
    userWithoutUser = await mkUser(companyA.id, 'sinuser');
    suspendedUser = await mkUser(companyA.id, 'susp');

    const mkUserWithMembership = async (
      userId: string,
      businessId: string,
      status: MembershipStatus,
    ) => {
      const user = await prisma.user.create({
        data: {
          email: `s-v1-04-user-${suffix}-${userId}@example.test`,
          nombre: `S V1-04 ${userId}`,
          usuarioId: userId,
        },
        select: { id: true },
      });
      await prisma.membership.create({
        data: { userId: user.id, businessId, role: 'OWNER', status },
      });
      return user;
    };

    await mkUserWithMembership(userA.id, companyA.id, 'ACTIVE');
    await mkUserWithMembership(userB.id, companyB.id, 'ACTIVE');
    await mkUserWithMembership(suspendedUser.id, companyA.id, 'SUSPENDED');
    // Canonical User with NO Membership: an identity exists, not a
    // membership → fail-closed by Membership (different from the no-User case,
    // where there is not even a canonical identity).
    await prisma.user.create({
      data: {
        email: `s-v1-04-user-sinnmemb-${suffix}@example.test`,
        nombre: 'S V1-04 sin membresias',
        usuarioId: userWithoutMemberships.id,
      },
      select: { id: true },
    });
    // userWithoutUser is deliberately left without a linked User.

    productA = await prismaFactory.forCompany(companyA.id).producto.create({
      data: {
        nombre: `S-V1-04 Prod A ${suffix}`,
        codigoInterno: `SV4A-BASE-${suffix}`,
        empresaId: companyA.id,
        familiaId: familyA.id,
        subfamiliaId: subfamilyA.id,
        tipoId: typeA.id,
        subtipoId: subtypeA.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
      },
      select: { id: true },
    });
    productB = await prismaFactory.forCompany(companyB.id).producto.create({
      data: {
        nombre: `S-V1-04 Prod B ${suffix}`,
        codigoInterno: `SV4B-BASE-${suffix}`,
        empresaId: companyB.id,
        familiaId: familyB.id,
        subfamiliaId: subfamilyB.id,
        tipoId: typeB.id,
        subtipoId: subtypeB.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('T1: listado de A devuelve solo productos de A', async () => {
    const spy = jest.spyOn(prismaFactory, 'forCompany');
    const listings = await catalog.listProducts(sessionOf(userA.id, companyA.id));

    expect(listings.map((p) => p.id)).toContain(productA.id);
    expect(listings.every((p) => p.empresaId === companyA.id)).toBe(true);
    expect(listings.some((p) => p.id === productB.id)).toBe(false);
    expect(spy).toHaveBeenCalledWith(companyA.id);
    spy.mockRestore();
  });

  it('T2: lectura cross-tenant → no encontrado, sin filtrar información de B', async () => {
    await expect(catalog.getProduct(productB.id, sessionOf(userA.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );
    // Symmetric.
    await expect(catalog.getProduct(productA.id, sessionOf(userB.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );
    // B's row still exists, intact, under its company.
    const rowB = await prisma.producto.findUniqueOrThrow({
      where: { id: productB.id },
      select: { id: true, empresaId: true },
    });
    expect(rowB.empresaId).toBe(companyB.id);
  });

  it('T3: jerarquía de A devuelve únicamente los 4 niveles de A', async () => {
    const tree = await hierarchy.list(sessionOf(userA.id, companyA.id));

    expect(tree.familias.map((f) => f.id)).toEqual(expect.arrayContaining([familyA.id]));
    expect(tree.familias.some((f) => f.id === familyB.id)).toBe(false);
    expect(tree.subfamilias.map((s) => s.id)).toEqual(
      expect.arrayContaining([subfamilyA.id, subfamilyA2.id]),
    );
    expect(tree.subfamilias.some((s) => s.id === subfamilyB.id)).toBe(false);
    expect(tree.tipos.map((t) => t.id)).toEqual(expect.arrayContaining([typeA.id, typeA2.id]));
    expect(tree.tipos.some((t) => t.id === typeB.id)).toBe(false);
    expect(tree.subtipos.map((s) => s.id)).toEqual(
      expect.arrayContaining([subtypeA.id, subtypeA2.id]),
    );
    expect(tree.subtipos.some((s) => s.id === subtypeB.id)).toBe(false);
    // And nothing of B at any level.
    expect(
      [...tree.familias, ...tree.subfamilias, ...tree.tipos, ...tree.subtipos].every(
        (n) => n.empresaId === companyA.id,
      ),
    ).toBe(true);
  });

  it('T4: crear producto en A persiste en A', async () => {
    const created = await catalog.createProduct(
      dtoOfA(`T4-${suffix}`),
      sessionOf(userA.id, companyA.id),
    );

    expect(created.empresaId).toBe(companyA.id);
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: created.id },
      select: { id: true, empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
    const inB = await prismaFactory.forCompany(companyB.id).producto.findUnique({
      where: { id: created.id },
    });
    expect(inB).toBeNull();
  });

  it('T5: empresaId arbitrario del body no cambia el tenant efectivo', async () => {
    const dtoWithCompany = {
      ...dtoOfA(`T5-${suffix}`),
      empresaId: companyB.id,
    } as unknown as CreateProductDto;

    const created = await catalog.createProduct(dtoWithCompany, sessionOf(userA.id, companyA.id));
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: created.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('T6: Producto A + Familia B → rechazado y no persiste', async () => {
    const dto = { ...dtoOfA(`T6-${suffix}`), familiaId: familyB.id } as CreateProductDto;
    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow();
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT6-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T7: Producto A + Subfamilia B → rechazado y no persiste', async () => {
    const dto = { ...dtoOfA(`T7-${suffix}`), subfamiliaId: subfamilyB.id } as CreateProductDto;
    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow();
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT7-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T8: Producto A + Tipo B → rechazado y no persiste', async () => {
    const dto = { ...dtoOfA(`T8-${suffix}`), tipoId: typeB.id } as CreateProductDto;
    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow();
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT8-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T9: Producto A + Subtipo B → rechazado y no persiste', async () => {
    const dto = { ...dtoOfA(`T9-${suffix}`), subtipoId: subtypeB.id } as CreateProductDto;
    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow();
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT9-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T9b: jerarquía completa y coherente de B → rechazado por B3 relation ownership', async () => {
    // Unlike T6-T9 (A+B mix, caught by validateHierarchy or by the scope),
    // here the 4 levels are coherent WITH EACH OTHER but all belong to B: the
    // one that must reject is the relational ownership of B3.
    const dto = {
      nombre: `S-V1-04 Prod B-coherente ${suffix}`,
      codigoInterno: `SV4BCO-${suffix}`,
      familiaId: familyB.id,
      subfamiliaId: subfamilyB.id,
      tipoId: typeB.id,
      subtipoId: subtypeB.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 2,
    } as CreateProductDto;

    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow();
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4BCO-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T10: jerarquía incoherente dentro de A → rechazado por validateHierarchy', async () => {
    // subtypeA2 belongs to typeA2/subfamilyA2, not to typeA/subfamilyA:
    // validateHierarchy must reject the incomplete chain.
    const dto = {
      ...dtoOfA(`T10-${suffix}`),
      subfamiliaId: subfamilyA2.id,
      tipoId: typeA2.id,
      subtipoId: subtypeA2.id,
    } as CreateProductDto;
    // familiaId is still familyA, but subfamilyA2 does NOT hang from
    // familyA in this fixture (mkHierarchy creates separate families), so
    // the incoherence is real and validateHierarchy detects it.
    await expect(catalog.createProduct(dto, sessionOf(userA.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT10-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T11: PATCH cross-tenant → no accesible y B no se modifica', async () => {
    const dto = { nombre: `S-V1-04 Hackeado ${suffix}` } as UpdateProductDto;
    await expect(
      catalog.updateProduct(productB.id, dto, sessionOf(userA.id, companyA.id)),
    ).rejects.toThrow(NotFoundException);

    const rowB = await prisma.producto.findUniqueOrThrow({
      where: { id: productB.id },
      select: { id: true, nombre: true, updatedAt: true },
    });
    expect(rowB.nombre).toBe(`S-V1-04 Prod B ${suffix}`);
  });

  it('T12: Membership B operando sobre recurso de A → aislado', async () => {
    await expect(catalog.getProduct(productA.id, sessionOf(userB.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );
    const listings = await catalog.listProducts(sessionOf(userB.id, companyB.id));
    expect(listings.map((p) => p.id)).toContain(productB.id);
    expect(listings.some((p) => p.id === productA.id)).toBe(false);
    const tree = await hierarchy.list(sessionOf(userB.id, companyB.id));
    expect(tree.familias.some((f) => f.id === familyA.id)).toBe(false);
    expect(tree.familias.some((f) => f.id === familyB.id)).toBe(true);
  });

  it('T13: sin Membership ACTIVE → fail-closed', async () => {
    // (a) Canonical User with no Membership → no active context.
    await expect(
      catalog.listProducts(sessionOf(userWithoutMemberships.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      catalog.getProduct(productA.id, sessionOf(userWithoutMemberships.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);
    await expect(hierarchy.list(sessionOf(userWithoutMemberships.id, companyA.id))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      catalog.createProduct(
        dtoOfA(`T13-${suffix}`),
        sessionOf(userWithoutMemberships.id, companyA.id),
      ),
    ).rejects.toThrow(ForbiddenException);

    // (b) Usuario without a linked User (backfill pending) → it also fails
    // closed, before touching the domain.
    await expect(catalog.listProducts(sessionOf(userWithoutUser.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );

    // Neither attempt managed to write anything.
    const rows = await prisma.producto.findMany({
      where: { codigoInterno: `SV4AT13-${suffix}` },
      select: { id: true },
    });
    expect(rows).toEqual([]);
  });

  it('T14: Membership SUSPENDED → fail-closed', async () => {
    await expect(catalog.listProducts(sessionOf(suspendedUser.id, companyA.id))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(hierarchy.list(sessionOf(suspendedUser.id, companyA.id))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('T15: JWT legacy con empresaId B + Membership A → prevalece A', async () => {
    const listings = await catalog.listProducts(sessionOf(userA.id, companyB.id));
    expect(listings.map((p) => p.id)).toContain(productA.id);
    expect(listings.some((p) => p.id === productB.id)).toBe(false);

    const tree = await hierarchy.list(sessionOf(userA.id, companyB.id));
    expect(tree.familias.some((f) => f.id === familyA.id)).toBe(true);
    expect(tree.familias.some((f) => f.id === familyB.id)).toBe(false);

    // And creation also respects A.
    const created = await catalog.createProduct(
      dtoOfA(`T15-${suffix}`),
      sessionOf(userA.id, companyB.id),
    );
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: created.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('I-SV4-09: CompanyScopedPrismaService + extension siguen siendo el enforcement', async () => {
    const spy = jest.spyOn(prismaFactory, 'forCompany');
    await catalog.listProducts(sessionOf(userA.id, companyA.id));
    expect(spy).toHaveBeenCalled();
    expect(new Set(spy.mock.calls.map(([id]) => id))).toEqual(new Set([companyA.id]));

    // The enforcement still denies direct access to the foreign row.
    expect(
      await prismaFactory
        .forCompany(companyA.id)
        .producto.findUnique({ where: { id: productB.id } }),
    ).toBeNull();
    await expect(
      prismaFactory
        .forCompany(companyA.id)
        .producto.findUniqueOrThrow({ where: { id: productB.id } }),
    ).rejects.toThrow();
    spy.mockRestore();
  });
});
