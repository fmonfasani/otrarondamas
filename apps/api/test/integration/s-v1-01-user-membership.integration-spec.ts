import { MembershipService } from '../../src/membership/membership.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { runBackfill } from '../../prisma/backfill-s-v1-01-user-membership';

// S-V1-01 — User + Membership foundation. All against a disposable DB;
// no test touches the B3 registry, auth runtime or the frontend.
describe('S-V1-01 — User + Membership foundation', () => {
  let prisma: PrismaService;
  let memberships: MembershipService;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string; email: string };
  let inactiveUserA: { id: string; email: string };
  let legacyUserB: { id: string; email: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    memberships = new MembershipService(prisma);
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-01 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-01 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string, active: boolean) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-01 ${tag} ${suffix}`,
          email: `s-v1-01-${tag}-${suffix}@example.test`,
          passwordHash: 'hash-ficticio',
          activo: active,
          rol: 'OWNER',
        },
        select: { id: true, email: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a', true);
    inactiveUserA = await mkLegacyUser(companyA.id, 'ainactivo', false);
    legacyUserB = await mkLegacyUser(companyB.id, 'b', true);
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({
      where: { usuarioId: { in: [legacyUserA.id, inactiveUserA.id, legacyUserB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [legacyUserA.id, inactiveUserA.id, legacyUserB.id] } },
    });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  // ---------- USER ----------

  it('SV-U-01: el backfill crea un User por Usuario con identidad copiada y vínculo explícito', async () => {
    const report = await runBackfill(prisma);
    expect(report.usuariosVistos).toBeGreaterThanOrEqual(3);
    expect(report.conflictos).toEqual([]);

    const user = await prisma.user.findUnique({ where: { usuarioId: legacyUserA.id } });
    expect(user).not.toBeNull();
    expect(user!.email).toBe(legacyUserA.email);
    expect(user!.nombre).toContain('S-V1-01 a');
    expect(user!.passwordHash).toBe('hash-ficticio');
    expect(user!.id).not.toBe(legacyUserA.id); // ids independientes
  });

  it('SV-U-02: User.email es unique (segundo User mismo email → P2002)', async () => {
    await expect(
      prisma.user.create({ data: { email: legacyUserA.email, nombre: 'duplicado' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('SV-U-03: el mapping Usuario → User se resuelve por vínculo explícito', async () => {
    const found = await memberships.findUserByLegacyUserId(legacyUserA.id);
    expect(found?.email).toBe(legacyUserA.email);
    expect(await memberships.findUserByLegacyUserId(`inexistente-${suffix}`)).toBeNull();
  });

  // ---------- MEMBERSHIP ----------

  it('SV-M-01: membership User → Business con rol copiado y ACTIVE', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: legacyUserA.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
      businessId: companyA.id,
    });
    expect(list[0].businessNombre).toContain('S-V1-01 A');
  });

  it('SV-M-02: unique(userId, businessId) se respeta (duplicada → P2002)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: legacyUserA.id } });
    await expect(
      prisma.membership.create({
        data: { userId: user.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('SV-M-03: Usuario inactivo deriva Membership SUSPENDED sin tocar el legacy', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: inactiveUserA.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('SUSPENDED');
    const legacy = await prisma.usuario.findUniqueOrThrow({ where: { id: inactiveUserA.id } });
    expect(legacy.activo).toBe(false);
    expect(legacy.empresaId).toBe(companyA.id);
  });

  it('SV-M-04: un User con dos memberships ve ambas', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: legacyUserA.id } });
    await prisma.membership.upsert({
      where: { userId_businessId: { userId: user.id, businessId: companyB.id } },
      create: { userId: user.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
      update: {},
    });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.map((m) => m.businessId).sort()).toEqual([companyA.id, companyB.id].sort());
    // Cleanup of the simulated future state so as not to contaminate other
    // tests.
    await prisma.membership.delete({
      where: { userId_businessId: { userId: user.id, businessId: companyB.id } },
    });
  });

  // ---------- BACKFILL ----------

  it('SV-B-01: re-ejecutar el backfill es idempotente (cero creaciones nuevas)', async () => {
    const before = await runBackfill(prisma);
    expect(before.usersCreados).toBe(0);
    expect(before.membershipsCreadas).toBe(0);
    expect(before.conflictos).toEqual([]);
    const users = await prisma.user.count({
      where: { usuarioId: { in: [legacyUserA.id, legacyUserB.id] } },
    });
    expect(users).toBe(2);
  });

  it('SV-B-02: el backfill preserva el legacy (empresaId, rol, permisos intactos)', async () => {
    const u = await prisma.usuario.findUniqueOrThrow({
      where: { id: legacyUserA.id },
      include: { usuarioPermisos: true },
    });
    expect(u.empresaId).toBe(companyA.id);
    expect(u.rol).toBe('OWNER');
    expect(u.usuarioPermisos).toEqual([]);
  });

  it('SV-B-03: colisión de identidad se reporta y no fusiona personas', async () => {
    // Usuario C without a linked User, but their email is already claimed by
    // a User with ANOTHER usuarioId: the backfill must skip it and report the
    // conflict, without touching or merging anything.
    const emailC = `s-v1-01-c-${suffix}@example.test`;
    const legacyUserC = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-01 c ${suffix}`,
        email: emailC,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const intruder = await prisma.user.create({
      data: { email: emailC, nombre: 'intruso', usuarioId: `otro-${suffix}` },
    });
    try {
      const report = await runBackfill(prisma);
      const mine = report.conflictos.find((c) => c.usuarioId === legacyUserC.id);
      expect(mine).toBeDefined();
      expect(mine!.email).toBe(emailC);
      // C got no User or membership of their own: nothing was invented.
      expect(await prisma.user.findUnique({ where: { usuarioId: legacyUserC.id } })).toBeNull();
      expect(await prisma.membership.count({ where: { user: { email: emailC } } })).toBe(0);
    } finally {
      await prisma.user.delete({ where: { id: intruder.id } });
      await prisma.usuario.delete({ where: { id: legacyUserC.id } });
    }
  });

  // ---------- ISOLATION ----------

  it('SV-I-01: User A ve solo sus memberships', async () => {
    const userA = await prisma.user.findUniqueOrThrow({ where: { usuarioId: legacyUserA.id } });
    const list = await memberships.getMembershipsForUser(userA.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const m of list) {
      expect(m.businessId).toBe(companyA.id);
    }
  });

  it('SV-I-02: User B no ve memberships de User A', async () => {
    const userB = await prisma.user.findUniqueOrThrow({ where: { usuarioId: legacyUserB.id } });
    const list = await memberships.getMembershipsForUser(userB.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const m of list) {
      expect(m.businessId).toBe(companyB.id);
    }
  });

  it('SV-I-03: identidad desconocida devuelve vacío, sin error ni fuga', async () => {
    expect(await memberships.findUserByLegacyUserId(`nadie-${suffix}`)).toBeNull();
    expect(await memberships.getMembershipsForUser(`nadie-${suffix}`)).toEqual([]);
  });

  it('SV-I-04: SUSPENDED se distingue de ACTIVE y no se confunde', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: inactiveUserA.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('SUSPENDED');
    expect(list[0].status).not.toBe('ACTIVE');
  });
});
