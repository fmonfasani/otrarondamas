import { MembershipService } from '../../src/membership/membership.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { runBackfill } from '../../prisma/backfill-s-v1-01-user-membership';

// S-V1-01 — User + Membership foundation. Todo contra BD descartable;
// ningún test toca el registry B3, auth runtime ni el frontend.
describe('S-V1-01 — User + Membership foundation', () => {
  let prisma: PrismaService;
  let memberships: MembershipService;
  let suffix: number;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string; email: string };
  let usuarioAInactivo: { id: string; email: string };
  let usuarioB: { id: string; email: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    memberships = new MembershipService(prisma);
    suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `S-V1-01 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `S-V1-01 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUsuario = (empresaId: string, tag: string, activo: boolean) =>
      prisma.usuario.create({
        data: {
          empresaId,
          nombre: `S-V1-01 ${tag} ${suffix}`,
          email: `s-v1-01-${tag}-${suffix}@example.test`,
          passwordHash: 'hash-ficticio',
          activo,
          rol: 'OWNER',
        },
        select: { id: true, email: true },
      });

    usuarioA = await mkUsuario(empresaA.id, 'a', true);
    usuarioAInactivo = await mkUsuario(empresaA.id, 'ainactivo', false);
    usuarioB = await mkUsuario(empresaB.id, 'b', true);
  });

  afterAll(async () => {
    const empresas = [empresaA.id, empresaB.id];
    await prisma.membership.deleteMany({ where: { businessId: { in: empresas } } });
    await prisma.user.deleteMany({
      where: { usuarioId: { in: [usuarioA.id, usuarioAInactivo.id, usuarioB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioA.id, usuarioAInactivo.id, usuarioB.id] } },
    });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  });

  // ---------- USER ----------

  it('SV-U-01: el backfill crea un User por Usuario con identidad copiada y vínculo explícito', async () => {
    const reporte = await runBackfill(prisma);
    expect(reporte.usuariosVistos).toBeGreaterThanOrEqual(3);
    expect(reporte.conflictos).toEqual([]);

    const user = await prisma.user.findUnique({ where: { usuarioId: usuarioA.id } });
    expect(user).not.toBeNull();
    expect(user!.email).toBe(usuarioA.email);
    expect(user!.nombre).toContain('S-V1-01 a');
    expect(user!.passwordHash).toBe('hash-ficticio');
    expect(user!.id).not.toBe(usuarioA.id); // ids independientes
  });

  it('SV-U-02: User.email es unique (segundo User mismo email → P2002)', async () => {
    await expect(
      prisma.user.create({ data: { email: usuarioA.email, nombre: 'duplicado' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('SV-U-03: el mapping Usuario → User se resuelve por vínculo explícito', async () => {
    const found = await memberships.findUserByLegacyUsuarioId(usuarioA.id);
    expect(found?.email).toBe(usuarioA.email);
    expect(await memberships.findUserByLegacyUsuarioId(`inexistente-${suffix}`)).toBeNull();
  });

  // ---------- MEMBERSHIP ----------

  it('SV-M-01: membership User → Business con rol copiado y ACTIVE', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioA.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
      businessId: empresaA.id,
    });
    expect(list[0].businessNombre).toContain('S-V1-01 A');
  });

  it('SV-M-02: unique(userId, businessId) se respeta (duplicada → P2002)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioA.id } });
    await expect(
      prisma.membership.create({
        data: { userId: user.id, businessId: empresaA.id, role: 'OWNER', status: 'ACTIVE' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('SV-M-03: Usuario inactivo deriva Membership SUSPENDED sin tocar el legacy', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioAInactivo.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('SUSPENDED');
    const legacy = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioAInactivo.id } });
    expect(legacy.activo).toBe(false);
    expect(legacy.empresaId).toBe(empresaA.id);
  });

  it('SV-M-04: un User con dos memberships ve ambas', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioA.id } });
    await prisma.membership.upsert({
      where: { userId_businessId: { userId: user.id, businessId: empresaB.id } },
      create: { userId: user.id, businessId: empresaB.id, role: 'OWNER', status: 'ACTIVE' },
      update: {},
    });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.map((m) => m.businessId).sort()).toEqual([empresaA.id, empresaB.id].sort());
    // Limpieza del estado futuro simulado para no contaminar otros tests.
    await prisma.membership.delete({
      where: { userId_businessId: { userId: user.id, businessId: empresaB.id } },
    });
  });

  // ---------- BACKFILL ----------

  it('SV-B-01: re-ejecutar el backfill es idempotente (cero creaciones nuevas)', async () => {
    const antes = await runBackfill(prisma);
    expect(antes.usersCreados).toBe(0);
    expect(antes.membershipsCreadas).toBe(0);
    expect(antes.conflictos).toEqual([]);
    const users = await prisma.user.count({
      where: { usuarioId: { in: [usuarioA.id, usuarioB.id] } },
    });
    expect(users).toBe(2);
  });

  it('SV-B-02: el backfill preserva el legacy (empresaId, rol, permisos intactos)', async () => {
    const u = await prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioA.id },
      include: { usuarioPermisos: true },
    });
    expect(u.empresaId).toBe(empresaA.id);
    expect(u.rol).toBe('OWNER');
    expect(u.usuarioPermisos).toEqual([]);
  });

  it('SV-B-03: colisión de identidad se reporta y no fusiona personas', async () => {
    // Usuario C sin User vinculado, pero su email ya está reclamado por un
    // User con OTRO usuarioId: el backfill debe omitirlo y reportar el
    // conflicto, sin tocar ni fusionar nada.
    const emailC = `s-v1-01-c-${suffix}@example.test`;
    const usuarioC = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: `S-V1-01 c ${suffix}`,
        email: emailC,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    const intruso = await prisma.user.create({
      data: { email: emailC, nombre: 'intruso', usuarioId: `otro-${suffix}` },
    });
    try {
      const reporte = await runBackfill(prisma);
      const mio = reporte.conflictos.find((c) => c.usuarioId === usuarioC.id);
      expect(mio).toBeDefined();
      expect(mio!.email).toBe(emailC);
      // C no obtuvo User propio ni membership: nada se inventó.
      expect(await prisma.user.findUnique({ where: { usuarioId: usuarioC.id } })).toBeNull();
      expect(await prisma.membership.count({ where: { user: { email: emailC } } })).toBe(0);
    } finally {
      await prisma.user.delete({ where: { id: intruso.id } });
      await prisma.usuario.delete({ where: { id: usuarioC.id } });
    }
  });

  // ---------- ISOLATION ----------

  it('SV-I-01: User A ve solo sus memberships', async () => {
    const userA = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioA.id } });
    const list = await memberships.getMembershipsForUser(userA.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const m of list) {
      expect(m.businessId).toBe(empresaA.id);
    }
  });

  it('SV-I-02: User B no ve memberships de User A', async () => {
    const userB = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioB.id } });
    const list = await memberships.getMembershipsForUser(userB.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const m of list) {
      expect(m.businessId).toBe(empresaB.id);
    }
  });

  it('SV-I-03: identidad desconocida devuelve vacío, sin error ni fuga', async () => {
    expect(await memberships.findUserByLegacyUsuarioId(`nadie-${suffix}`)).toBeNull();
    expect(await memberships.getMembershipsForUser(`nadie-${suffix}`)).toEqual([]);
  });

  it('SV-I-04: SUSPENDED se distingue de ACTIVE y no se confunde', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioAInactivo.id } });
    const list = await memberships.getMembershipsForUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('SUSPENDED');
    expect(list[0].status).not.toBe('ACTIVE');
  });
});
