import { BusinessContextService } from '../../src/business-context/business-context.service';
import { MembershipService } from '../../src/membership/membership.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { runBackfill } from '../../prisma/backfill-s-v1-01-user-membership';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-02 — BusinessContext + adapter. Todo contra BD descartable.
// No modifica registry B3, auth runtime, JWT ni frontend.
describe('S-V1-02 — BusinessContext + tenant adapter', () => {
  let prisma: PrismaService;
  let contextos: BusinessContextService;
  let suffix: number;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioSuspendido: { id: string };
  let usuarioB: { id: string };
  let usuarioSinBackfill: { id: string };

  // AuthenticatedUser con forma LEGACY (sin membershipId/businessId):
  // prueba que el JWT actual alcanza sin cambios.
  const sesionDe = (usuarioId: string, empresaId: string): AuthenticatedUser => ({
    id: usuarioId,
    email: `s-v1-02-${usuarioId}@example.test`,
    nombre: 'S V1-02',
    empresaId,
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const memberships = new MembershipService(prisma);
    contextos = new BusinessContextService(memberships, prisma);
    suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `S-V1-02 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `S-V1-02 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUsuario = (empresaId: string, tag: string, activo: boolean) =>
      prisma.usuario.create({
        data: {
          empresaId,
          nombre: `S-V1-02 ${tag} ${suffix}`,
          email: `s-v1-02-${tag}-${suffix}@example.test`,
          activo,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    usuarioA = await mkUsuario(empresaA.id, 'a', true);
    usuarioSuspendido = await mkUsuario(empresaA.id, 'susp', false);
    usuarioB = await mkUsuario(empresaB.id, 'b', true);
    usuarioSinBackfill = await mkUsuario(empresaA.id, 'nobf', true);

    const reporte = await runBackfill(prisma);
    expect(reporte.conflictos).toEqual([]);

    // El vínculo de usuarioSinBackfill se elimina DESPUÉS del backfill
    // para simular cuenta sin migrar (el User huérfano se limpia en
    // afterAll por email).
    const userNobf = await prisma.user.findUniqueOrThrow({
      where: { usuarioId: usuarioSinBackfill.id },
    });
    await prisma.membership.deleteMany({ where: { userId: userNobf.id } });
    await prisma.user.delete({ where: { id: userNobf.id } });

    // Producto en B para pruebas de no-bypass con forEmpresa().
    const fam = await prisma.familia.create({
      data: { empresaId: empresaB.id, nombre: `S-V1-02 Fam B ${suffix}`, prefijo: 'V1B' },
      select: { id: true },
    });
    const sub = await prisma.subfamilia.create({
      data: {
        empresaId: empresaB.id,
        familiaId: fam.id,
        nombre: `S-V1-02 Sub B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    const tip = await prisma.tipo.create({
      data: {
        empresaId: empresaB.id,
        subfamiliaId: sub.id,
        nombre: `S-V1-02 Tipo B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    const st = await prisma.subtipo.create({
      data: {
        empresaId: empresaB.id,
        tipoId: tip.id,
        nombre: `S-V1-02 St B ${suffix}`,
        prefijo: 'V1B',
      },
      select: { id: true },
    });
    await prisma.producto.create({
      data: {
        empresaId: empresaB.id,
        nombre: `S-V1-02 Prod B ${suffix}`,
        codigoInterno: `B3V1B${suffix}`,
        familiaId: fam.id,
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
    const empresas = [empresaA.id, empresaB.id];
    await prisma.membership.deleteMany({ where: { businessId: { in: empresas } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}@example.test` } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  });

  it('T1: User + Membership → BusinessContext correcto', async () => {
    const ctx = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioA.id, empresaA.id));
    expect(ctx.businessId).toBe(empresaA.id);
    expect(ctx.actorType).toBe('USER');
    expect(ctx.role).toBe('OWNER');
    expect(ctx.membershipId).toBeDefined();
    expect(ctx.userId).toBeDefined();
    // Adapter: el empresaId legacy derivado es el correcto.
    expect(await contextos.resolveEmpresaId(ctx.businessId)).toBe(empresaA.id);
  });

  it('T2: User sin Membership → fail-closed explícito', async () => {
    await expect(
      contextos.resolveForAuthenticatedUser(sesionDe(usuarioSinBackfill.id, empresaA.id)),
    ).rejects.toThrow();
  });

  it('T3: User A no obtiene contexto de B (ni viceversa)', async () => {
    const ctxA = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioA.id, empresaA.id));
    const ctxB = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioB.id, empresaB.id));
    expect(ctxA.businessId).toBe(empresaA.id);
    expect(ctxB.businessId).toBe(empresaB.id);
    expect(ctxA.businessId).not.toBe(ctxB.businessId);
    expect(ctxA.membershipId).not.toBe(ctxB.membershipId);
  });

  it('T4: Membership suspendida no produce contexto activo', async () => {
    await expect(
      contextos.resolveForAuthenticatedUser(sesionDe(usuarioSuspendido.id, empresaA.id)),
    ).rejects.toThrow();
  });

  it('T5: businessId resuelve a Empresa.id (V1)', async () => {
    const ctx = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioA.id, empresaA.id));
    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: ctx.businessId } });
    expect(empresa.id).toBe(empresaA.id);
  });

  it('T6: businessId inexistente no produce empresaId (adapter fail-closed)', async () => {
    await expect(contextos.resolveEmpresaId(`inexistente-${suffix}`)).rejects.toThrow();
  });

  it('T7: el empresaId del adapter alimenta forEmpresa() correctamente', async () => {
    const scoped = new EmpresaScopedPrismaService(prisma);
    const ctx = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioA.id, empresaA.id));
    const empresaId = await contextos.resolveEmpresaId(ctx.businessId);
    const db = scoped.forEmpresa(empresaId);
    const encontrados = await db.producto.findMany({ where: { empresaId } });
    // A no tiene productos: vacío propio, sin fuga de B.
    expect(encontrados).toEqual([]);
    const prodB = await prisma.producto.findFirstOrThrow({ where: { empresaId: empresaB.id } });
    expect(await db.producto.findUnique({ where: { id: prodB.id } })).toBeNull();
  });

  it('T9: JWT legacy (sin membershipId/businessId) alcanza para resolver', async () => {
    // sesionDe() no incluye ningún claim nuevo: si esto resuelve, el JWT
    // actual no necesita cambios en S-V1-02.
    const ctx = await contextos.resolveForAuthenticatedUser(sesionDe(usuarioB.id, empresaB.id));
    expect(ctx.businessId).toBe(empresaB.id);
  });

  it('T10: sin bypass — empresaScopeExtension sigue negando lo ajeno', async () => {
    const scoped = new EmpresaScopedPrismaService(prisma);
    const dbA = scoped.forEmpresa(empresaA.id);
    const prodB = await prisma.producto.findFirstOrThrow({ where: { empresaId: empresaB.id } });
    // findUnique post-check: fila ajena → null, nunca el dato.
    expect(await dbA.producto.findUnique({ where: { id: prodB.id } })).toBeNull();
    // Y el contexto no altera ese comportamiento.
    await contextos.resolveForAuthenticatedUser(sesionDe(usuarioA.id, empresaA.id));
    expect(await dbA.producto.findUnique({ where: { id: prodB.id } })).toBeNull();
  });

  it('T11: múltiples memberships ACTIVE → conflicto explícito (sin selector no hay contexto)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { usuarioId: usuarioB.id } });
    await prisma.membership.create({
      data: { userId: user.id, businessId: empresaA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    try {
      await expect(
        contextos.resolveForAuthenticatedUser(sesionDe(usuarioB.id, empresaB.id)),
      ).rejects.toThrow(/selección explícita/);
    } finally {
      await prisma.membership.delete({
        where: { userId_businessId: { userId: user.id, businessId: empresaA.id } },
      });
    }
  });
});
