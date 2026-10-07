import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { CustomersController } from '../../src/customers/customers.controller';
import { CustomersService } from '../../src/customers/customers.service';
import type { CreateCustomerDto } from '../../src/customers/dto/create-customer.dto';
import { MembershipService } from '../../src/membership/membership.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-03 — First integration of BusinessContext in a real surface
// (CLIENTES). All against a disposable DB; no Prisma mocks.
//
// The REAL CustomersController (same constructor as production) is
// exercised with the REAL BusinessContextService over the REAL
// MembershipService. Guards are not executed here — that is the
// responsibility of the HTTP spec s-v1-03-clientes-http.integration-spec.ts,
// which runs against the compiled stack.
//
// Chain tested on each call:
//   AuthenticatedUser → BusinessContextService → User → ACTIVE Membership
//   → businessId → resolveCompanyId() → CustomersService
//   → CompanyScopedPrismaService.forCompany() → companyScopeExtension
describe('S-V1-03 — BusinessContext en Clientes (integración, BD real)', () => {
  let prisma: PrismaService;
  let prismaFactory: CompanyScopedPrismaService;
  let customersService: CustomersService;
  let businessContext: BusinessContextService;
  let controller: CustomersController;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let userWithoutMembership: { id: string };
  let userWithoutMemberships: { id: string };
  let suspendedUser: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };

  // Session with the LEGACY JWT shape. `empresaId` comes from the token and
  // is knowledge of the HTTP client, not an authority: T8 proves it.
  const sessionOf = (userId: string, tokenCompanyId: string): AuthenticatedUser => ({
    id: userId,
    email: `s-v1-03-${userId}@example.test`,
    nombre: 'S V1-03',
    empresaId: tokenCompanyId,
    permisos: ['clientes.gestionar'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new CompanyScopedPrismaService(prisma);
    customersService = new CustomersService(prismaFactory);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    controller = new CustomersController(customersService, businessContext);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-03 A ${suffix}`, slug: `s-v1-03-clientes-ctx-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-03 B ${suffix}`, slug: `s-v1-03-clientes-ctx-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-03 ${tag} ${suffix}`,
          email: `s-v1-03-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    userA = await mkUser(companyA.id, 'a');
    userB = await mkUser(companyB.id, 'b');
    userWithoutMembership = await mkUser(companyA.id, 'sinmemb');
    userWithoutMemberships = await mkUser(companyA.id, 'sinnmemb');
    suspendedUser = await mkUser(companyA.id, 'susp');

    // Explicit User + ACTIVE Membership (not relying on the backfill): the
    // slice tests the resolution, not the migration script.
    const mkUserWithMembership = async (userId: string, businessId: string, status: string) => {
      const user = await prisma.user.create({
        data: {
          email: `s-v1-03-user-${suffix}-${userId}@example.test`,
          nombre: `S V1-03 ${userId}`,
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

    // Canonical User WITHOUT any Membership: identity exists, membership does
    // not → fail-closed by Membership (different from the previous case,
    // where there is not even a User).
    await prisma.user.create({
      data: {
        email: `s-v1-03-user-sinnmemb-${suffix}@example.test`,
        nombre: 'S V1-03 sin membresias',
        usuarioId: userWithoutMemberships.id,
      },
      select: { id: true },
    });

    // One Cliente per Empresa, created by the legacy infrastructure.
    customerA = await prismaFactory
      .forCompany(companyA.id)
      .cliente.create({ data: { nombre: `S-V1-03 Cliente A ${suffix}` }, select: { id: true } });
    customerB = await prismaFactory
      .forCompany(companyB.id)
      .cliente.create({ data: { nombre: `S-V1-03 Cliente B ${suffix}` }, select: { id: true } });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('T1: User + Membership ACTIVE → Clientes usa la Empresa correcta', async () => {
    const spy = jest.spyOn(prismaFactory, 'forCompany');
    const listings = await controller.list(sessionOf(userA.id, companyA.id));

    expect(listings.map((c) => c.id)).toContain(customerA.id);
    expect(listings.every((c) => c.empresaId === companyA.id)).toBe(true);
    expect(listings.some((c) => c.id === customerB.id)).toBe(false);
    expect(spy).toHaveBeenCalledWith(companyA.id);
    // The empresaId handed to the domain is the one derived from the context,
    // not the one that came in the session.
    const ctx = await businessContext.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    expect(ctx.businessId).toBe(companyA.id);
    expect(await businessContext.resolveCompanyId(ctx.businessId)).toBe(companyA.id);
    spy.mockRestore();
  });

  it('T2: User sin Membership → fail-closed explícito', async () => {
    // (a) Canonical User without any Membership → no active context.
    await expect(
      controller.list(sessionOf(userWithoutMemberships.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      controller.create({ nombre: 'x' }, sessionOf(userWithoutMemberships.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);
    // A's Cliente is not reachable by direct id either.
    await expect(
      controller.get(customerA.id, sessionOf(userWithoutMemberships.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);

    // (b) Usuario without a linked User (pending backfill) → also fails
    //     closed, before touching the domain.
    await expect(controller.list(sessionOf(userWithoutMembership.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      controller.create({ nombre: 'x' }, sessionOf(userWithoutMembership.id, companyA.id)),
    ).rejects.toThrow();

    // Neither of the two attempts managed to write anything.
    const names = await prisma.cliente.findMany({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
      select: { nombre: true },
    });
    expect(names.filter((n) => n.nombre === 'x')).toEqual([]);
  });

  it('T3: User A no puede resolver ni usar el Business de User B', async () => {
    // A resolves THEIR context (Business A), never B's.
    const ctxA = await businessContext.resolveForAuthenticatedUser(
      sessionOf(userA.id, companyA.id),
    );
    expect(ctxA.businessId).toBe(companyA.id);

    // And A's surface cannot reach B's Cliente, neither by listing nor by
    // direct id.
    await expect(controller.get(customerB.id, sessionOf(userA.id, companyA.id))).rejects.toThrow(
      NotFoundException,
    );
    // Symmetric for B.
    const ctxB = await businessContext.resolveForAuthenticatedUser(
      sessionOf(userB.id, companyB.id),
    );
    expect(ctxB.businessId).toBe(companyB.id);
    expect((await controller.list(sessionOf(userB.id, companyB.id))).map((c) => c.id)).toEqual([
      customerB.id,
    ]);
    // I-SV3-05: B's Membership belongs to B's User — A cannot produce a
    // context from it even though the row exists in the DB.
    const ctxA2 = await businessContext.resolveForAuthenticatedUser(
      sessionOf(userA.id, companyA.id),
    );
    expect(ctxA2.membershipId).not.toBe(ctxB.membershipId);
    expect(ctxA2.userId).not.toBe(ctxB.userId);
    await expect(controller.get(customerA.id, sessionOf(userB.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('T4: Membership SUSPENDED → acceso rechazado', async () => {
    await expect(controller.list(sessionOf(suspendedUser.id, companyA.id))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.get(customerA.id, sessionOf(suspendedUser.id, companyA.id)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('T5: businessId resuelve correctamente a Empresa.id', async () => {
    const ctx = await businessContext.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    const companyId = await businessContext.resolveCompanyId(ctx.businessId);
    expect(ctx.businessId).toBe(companyA.id);
    expect(companyId).toBe(ctx.businessId);
    const company = await prisma.empresa.findUniqueOrThrow({ where: { id: companyId } });
    expect(company.id).toBe(companyA.id);
  });

  it('T6: Cliente de Empresa B no aparece para Empresa A (persistencia/query)', async () => {
    // Both rows really exist, each under its company.
    const all = await prisma.cliente.findMany({
      where: { id: { in: [customerA.id, customerB.id] } },
      select: { id: true, empresaId: true },
      orderBy: { id: 'asc' },
    });
    expect(all).toHaveLength(2);
    expect(all.find((c) => c.id === customerA.id)?.empresaId).toBe(companyA.id);
    expect(all.find((c) => c.id === customerB.id)?.empresaId).toBe(companyB.id);

    // Query-level evidence: A's scope does not return B's row.
    const fromA = await prismaFactory.forCompany(companyA.id).cliente.findMany({
      where: { id: { in: [customerA.id, customerB.id] } },
      select: { id: true },
    });
    expect(fromA.map((c) => c.id)).toEqual([customerA.id]);

    // And through the domain surface.
    const listings = await controller.list(sessionOf(userA.id, companyA.id));
    expect(listings.map((c) => c.id)).toContain(customerA.id);
    expect(listings.every((c) => c.empresaId === companyA.id)).toBe(true);
    expect(listings.some((c) => c.id === customerB.id)).toBe(false);
  });

  it('T7: Crear Cliente persiste bajo la Empresa correcta', async () => {
    const created = await controller.create(
      { nombre: `S-V1-03 Nuevo A ${suffix}`, email: `s-v1-03-nuevo-a-${suffix}@example.test` },
      sessionOf(userA.id, companyA.id),
    );

    expect(created.empresaId).toBe(companyA.id);
    // Direct read (without scope) to prove the real row in the DB.
    const row = await prisma.cliente.findUniqueOrThrow({
      where: { id: created.id },
      select: { id: true, empresaId: true, nombre: true },
    });
    expect(row.empresaId).toBe(companyA.id);
    // Nothing leaked into B.
    const inB = await prismaFactory.forCompany(companyB.id).cliente.findUnique({
      where: { id: created.id },
    });
    expect(inB).toBeNull();
  });

  it('T8: un empresaId arbitrario del caller no cambia el tenant efectivo', async () => {
    // (a) The session declares empresaB, but the actor's Membership is from
    //     empresaA: the Membership wins.
    const listings = await controller.list(sessionOf(userA.id, companyB.id));
    expect(listings.map((c) => c.id)).toContain(customerA.id);
    expect(listings.every((c) => c.empresaId === companyA.id)).toBe(true);
    expect(listings.some((c) => c.id === customerB.id)).toBe(false);
    await expect(controller.get(customerB.id, sessionOf(userA.id, companyB.id))).rejects.toThrow(
      NotFoundException,
    );

    // (b) The DTO tries to inject empresaId: the row still goes to A.
    const dtoWithCompany = {
      nombre: `S-V1-03 Inyectado ${suffix}`,
      empresaId: companyB.id,
    } as unknown as CreateCustomerDto;
    const created = await controller.create(dtoWithCompany, sessionOf(userA.id, companyA.id));
    const row = await prisma.cliente.findUniqueOrThrow({
      where: { id: created.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('T9: CompanyScopedPrismaService sigue siendo el aislamiento final', async () => {
    const spy = jest.spyOn(prismaFactory, 'forCompany');

    await controller.list(sessionOf(userA.id, companyA.id));
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every(([id]) => typeof id === 'string')).toBe(true);
    // All uses of this surface were with A's empresaId.
    expect(new Set(spy.mock.calls.map(([id]) => id))).toEqual(new Set([companyA.id]));

    // And the enforcement still denies direct access to the foreign row.
    expect(
      await prismaFactory
        .forCompany(companyA.id)
        .cliente.findUnique({ where: { id: customerB.id } }),
    ).toBeNull();
    await expect(
      prismaFactory
        .forCompany(companyA.id)
        .cliente.findUniqueOrThrow({ where: { id: customerB.id } }),
    ).rejects.toThrow();
    spy.mockRestore();
  });

  it('I-SV3-07: CustomersService mantiene su firma legacy para ventas/tienda', async () => {
    // sales.service.ts and store.service.ts keep calling
    // customersService.get(companyId, id) / calculateLevel(companyId, id)
    // with a legacy empresaId: that path was not touched in this slice.
    const level = await customersService.calculateLevel(companyA.id, customerA.id);
    expect(['NUEVO', 'FRECUENTE', 'VIP']).toContain(level);
    const obtained = await customersService.get(companyA.id, customerA.id);
    expect(obtained.id).toBe(customerA.id);
    await expect(customersService.get(companyB.id, customerA.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
