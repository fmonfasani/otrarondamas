import { BusinessContextService } from '../../src/business-context/business-context.service';
import { MembershipService } from '../../src/membership/membership.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { runBackfill } from '../../prisma/backfill-s-v1-01-user-membership';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-02 — BusinessContext + adapter. All against a disposable DB.
// It does not modify the B3 registry, auth runtime, JWT or frontend.
describe('S-V1-02 — BusinessContext + tenant adapter', () => {
  let prisma: PrismaService;
  let contexts: BusinessContextService;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let suspendedUser: { id: string };
  let userB: { id: string };
  let userWithoutBackfill: { id: string };

  // AuthenticatedUser with LEGACY shape (without membershipId/businessId):
  // proves that the current JWT is enough without changes.
  const sessionOf = (userId: string, companyId: string): AuthenticatedUser => ({
    id: userId,
    email: `s-v1-02-${userId}@example.test`,
    nombre: 'S V1-02',
    empresaId: companyId,
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const memberships = new MembershipService(prisma);
    contexts = new BusinessContextService(memberships, prisma);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-02 A ${suffix}`, slug: `s-v1-02-business-context-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-02 B ${suffix}`, slug: `s-v1-02-business-context-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUser = (companyId: string, tag: string, active: boolean) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-02 ${tag} ${suffix}`,
          email: `s-v1-02-${tag}-${suffix}@example.test`,
          activo: active,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    userA = await mkUser(companyA.id, 'a', true);
    suspendedUser = await mkUser(companyA.id, 'susp', false);
    userB = await mkUser(companyB.id, 'b', true);
    userWithoutBackfill = await mkUser(companyA.id, 'nobf', true);

    const report = await runBackfill(prisma);
    expect(report.conflictos).toEqual([]);

    // The link of usuarioSinBackfill is removed AFTER the backfill to
    // simulate an unmigrated account (the orphan User is cleaned up in
    // afterAll by email).
    const userNobf = await prisma.user.findUniqueOrThrow({
      where: { usuarioId: userWithoutBackfill.id },
    });
    await prisma.membership.deleteMany({ where: { userId: userNobf.id } });
    await prisma.user.delete({ where: { id: userNobf.id } });

    // Product in B for no-bypass tests with forCompany().
    const familyRecord = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `S-V1-02 Fam B ${suffix}`, prefijo: 'V1B' },
      select: { id: true },
    });
    const sub = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyRecord.id,
        nombre: `S-V1-02 Sub B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    const tip = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: sub.id,
        nombre: `S-V1-02 Tipo B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    const st = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: tip.id,
        nombre: `S-V1-02 St B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    await prisma.producto.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-02 Prod B ${suffix}`,
        codigoInterno: `B3V1B${suffix}`,
        familiaId: familyRecord.id,
        subfamiliaId: sub.id,
        tipoId: tip.id,
        subtipoId: st.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
      },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}@example.test` } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('T1: User + Membership → BusinessContext correcto', async () => {
    const ctx = await contexts.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    expect(ctx.businessId).toBe(companyA.id);
    expect(ctx.actorType).toBe('USER');
    expect(ctx.role).toBe('OWNER');
    expect(ctx.membershipId).toBeDefined();
    expect(ctx.userId).toBeDefined();
    // Adapter: the derived legacy empresaId is the correct one.
    expect(await contexts.resolveCompanyId(ctx.businessId)).toBe(companyA.id);
  });

  it('T2: User sin Membership → fail-closed explícito', async () => {
    await expect(
      contexts.resolveForAuthenticatedUser(sessionOf(userWithoutBackfill.id, companyA.id)),
    ).rejects.toThrow();
  });

  it('T3: User A no obtiene contexto de B (ni viceversa)', async () => {
    const ctxA = await contexts.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    const ctxB = await contexts.resolveForAuthenticatedUser(sessionOf(userB.id, companyB.id));
    expect(ctxA.businessId).toBe(companyA.id);
    expect(ctxB.businessId).toBe(companyB.id);
    expect(ctxA.businessId).not.toBe(ctxB.businessId);
    expect(ctxA.membershipId).not.toBe(ctxB.membershipId);
  });

  it('T4: Membership suspendida no produce contexto activo', async () => {
    await expect(
      contexts.resolveForAuthenticatedUser(sessionOf(suspendedUser.id, companyA.id)),
    ).rejects.toThrow();
  });

  it('T5: businessId resuelve a Empresa.id (V1)', async () => {
    const ctx = await contexts.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    const company = await prisma.empresa.findUniqueOrThrow({ where: { id: ctx.businessId } });
    expect(company.id).toBe(companyA.id);
  });

  it('T6: businessId inexistente no produce empresaId (adapter fail-closed)', async () => {
    await expect(contexts.resolveCompanyId(`inexistente-${suffix}`)).rejects.toThrow();
  });

  it('T7: el empresaId del adapter alimenta forCompany() correctamente', async () => {
    const scoped = new CompanyScopedPrismaService(prisma);
    const ctx = await contexts.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    const companyId = await contexts.resolveCompanyId(ctx.businessId);
    const db = scoped.forCompany(companyId);
    const found = await db.producto.findMany({ where: { empresaId: companyId } });
    // A has no products: its own empty set, no leak from B.
    expect(found).toEqual([]);
    const productB = await prisma.producto.findFirstOrThrow({ where: { empresaId: companyB.id } });
    expect(await db.producto.findUnique({ where: { id: productB.id } })).toBeNull();
  });

  it('T9: JWT legacy (sin membershipId/businessId) alcanza para resolver', async () => {
    // sessionFor() does not include any new claim: if this resolves, the
    // current JWT needs no changes in S-V1-02.
    const ctx = await contexts.resolveForAuthenticatedUser(sessionOf(userB.id, companyB.id));
    expect(ctx.businessId).toBe(companyB.id);
  });

  it('T10: sin bypass — companyScopeExtension sigue negando lo ajeno', async () => {
    const scoped = new CompanyScopedPrismaService(prisma);
    const dbA = scoped.forCompany(companyA.id);
    const productB = await prisma.producto.findFirstOrThrow({ where: { empresaId: companyB.id } });
    // findUnique post-check: foreign row → null, never the data.
    expect(await dbA.producto.findUnique({ where: { id: productB.id } })).toBeNull();
    // And the context does not alter that behavior.
    await contexts.resolveForAuthenticatedUser(sessionOf(userA.id, companyA.id));
    expect(await dbA.producto.findUnique({ where: { id: productB.id } })).toBeNull();
  });

  it('T11: múltiples memberships ACTIVE → conflicto explícito (sin selector no hay contexto)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: userB.id } });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    try {
      await expect(
        contexts.resolveForAuthenticatedUser(sessionOf(userB.id, companyB.id)),
      ).rejects.toThrow(/selección explícita/);
    } finally {
      await prisma.membership.delete({
        where: { userId_businessId: { userId: user.id, businessId: companyA.id } },
      });
    }
  });
});
