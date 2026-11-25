import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantPrismaService } from '../../src/prisma/tenant-prisma.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { createStoreProduct, deleteStoreCompanies } from './helpers/store-catalog.fixture';

/**
 * INIT-019 PR 5 — row-level security by business (FASE-2-BASE-SEGURA §5, closing criteria §7).
 *
 * The API's business client connects as `wapsell_app`. Every table that carries a business has
 * RLS: a row is visible and writable only when its business is the one fixed for the request with
 * set_config('app.business_id'). Raw SQL is used on purpose, because it skips the application's
 * own business filter (companyScopeExtension): what is checked here is the database alone.
 */
describe('P18-10 — RLS por negocio (cierre de la Fase 2)', () => {
  let system: PrismaService;
  let app: TenantPrismaService;
  let scoped: CompanyScopedPrismaService;
  let suffix: number;
  let A: { id: string; product: string };
  let B: { id: string; product: string };
  let globalTemplate: string;

  const count = (rows: Array<{ n: number }>) => Number(rows[0].n);
  const failure = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'written';
    } catch (error) {
      return String((error as Error).message);
    }
  };

  beforeAll(async () => {
    system = new PrismaService();
    await system.$connect();
    app = new TenantPrismaService();
    await app.$connect();
    scoped = new CompanyScopedPrismaService(app);

    suffix = Date.now();
    const business = async (label: string) => {
      const { id } = await system.empresa.create({
        data: {
          nombre: `P18-10 ${label} ${suffix}`,
          slug: `p18-10-${label}-${suffix}`,
          configuracion: {},
        },
        select: { id: true },
      });
      const product = await createStoreProduct(system, id, 'P18-10', label, suffix);
      return { id, product: product.id };
    };
    A = await business('a');
    B = await business('b');
    globalTemplate = (
      await system.roleTemplate.create({ data: { name: `P18-10 global ${suffix}` } })
    ).id;
  });

  afterAll(async () => {
    await system.roleTemplate.deleteMany({ where: { name: { startsWith: 'P18-10 ' } } });
    await deleteStoreCompanies(system, [A?.id, B?.id].filter(Boolean) as string[]);
    await app.$disconnect();
    await system.$disconnect();
  });

  it('every table that carries a business has RLS and a policy, none is FORCEd, and only the system role bypasses it', async () => {
    const tables = await system.$queryRaw<
      Array<{ table: string; rls: boolean; forced: boolean; policies: number }>
    >`
      SELECT c.relname::text AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
             (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
      FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
        AND (c.relname IN ('Empresa', 'RoleTemplate') OR EXISTS (
          SELECT 1 FROM information_schema.columns k
          WHERE k.table_schema = 'public' AND k.table_name = c.relname
            AND k.column_name IN ('empresaId', 'businessId')))
      ORDER BY 1`;
    expect(tables.length).toBeGreaterThanOrEqual(80);
    expect(tables.filter((t) => !t.rls || t.policies === 0).map((t) => t.table)).toEqual([]);
    expect(tables.filter((t) => t.forced).map((t) => t.table)).toEqual([]);

    const roles = await system.$queryRaw<Array<{ rolname: string; rolbypassrls: boolean }>>`
      SELECT rolname::text, rolbypassrls FROM pg_roles
      WHERE rolname IN ('wapsell_app', 'wapsell_system') ORDER BY 1`;
    expect(roles).toEqual([
      { rolname: 'wapsell_app', rolbypassrls: false },
      { rolname: 'wapsell_system', rolbypassrls: true },
    ]);
  });

  it('with no business fixed, wapsell_app sees nothing and cannot write (fails closed)', async () => {
    expect(
      count(
        await app.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "empresaId" = ${A.id}`,
      ),
    ).toBe(0);
    expect(
      await failure(
        app.$executeRaw`UPDATE "Producto" SET "nombre" = "nombre" WHERE "id" = ${A.product}`,
      ),
    ).toBe('written'); // an UPDATE that matches no visible row is not an error...
    expect(
      count(
        await system.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "id" = ${A.product}`,
      ),
    ).toBe(1); // ...and the row is untouched
    expect(
      await failure(
        app.$executeRaw`INSERT INTO "Familia" ("id", "empresaId", "nombre", "prefijo", "updatedAt")
                        VALUES (gen_random_uuid()::text, ${A.id}, 'P18-10 sin negocio', 'SNG', now())`,
      ),
    ).toMatch(/row-level security/);
  });

  it("with business A fixed, B's rows cannot be read, changed, deleted or created", async () => {
    const db = scoped.forCompany(A.id);
    expect(
      count(
        await db.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "empresaId" = ${A.id}`,
      ),
    ).toBe(1);
    expect(
      count(
        await db.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "empresaId" = ${B.id}`,
      ),
    ).toBe(0);
    expect(
      await db.$executeRaw`UPDATE "Producto" SET "nombre" = 'robado' WHERE "id" = ${B.product}`,
    ).toBe(0);
    expect(await db.$executeRaw`DELETE FROM "Lote" WHERE "productoId" = ${B.product}`).toBe(0);
    expect(
      await failure(
        db.$executeRaw`INSERT INTO "Familia" ("id", "empresaId", "nombre", "prefijo", "updatedAt")
                       VALUES (gen_random_uuid()::text, ${B.id}, 'P18-10 intrusa', 'INT', now())`,
      ),
    ).toMatch(/row-level security/);
    // Moving an own row to another business is refused too (WITH CHECK).
    expect(
      await failure(
        db.$executeRaw`UPDATE "Lote" SET "empresaId" = ${B.id} WHERE "productoId" = ${A.product}`,
      ),
    ).toMatch(/row-level security|foreign key/);

    const untouched = await system.producto.findUniqueOrThrow({ where: { id: B.product } });
    expect(untouched.nombre).not.toBe('robado');
    expect(await system.lote.count({ where: { productoId: B.product } })).toBe(1);
  });

  it('an interactive transaction keeps its business inside, and a rollback writes nothing', async () => {
    const db = scoped.forCompany(A.id);
    const seen = await db.$transaction(async (tx) => [
      count(
        await tx.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "empresaId" = ${A.id}`,
      ),
      count(
        await tx.$queryRaw`SELECT count(*)::int AS n FROM "Producto" WHERE "empresaId" = ${B.id}`,
      ),
    ]);
    expect(seen).toEqual([1, 0]);

    const name = `P18-10 deshecha ${suffix}`;
    await expect(
      db.$transaction(async (tx) => {
        await tx.familia.create({ data: { empresaId: A.id, nombre: name, prefijo: 'DSH' } });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await system.familia.count({ where: { nombre: name } })).toBe(0);
  });

  it('global role templates are readable by every business; no business can change or delete them', async () => {
    const db = scoped.forCompany(A.id);
    expect(
      count(
        await db.$queryRaw`SELECT count(*)::int AS n FROM "RoleTemplate" WHERE "id" = ${globalTemplate}`,
      ),
    ).toBe(1);
    expect(
      await db.$executeRaw`UPDATE "RoleTemplate" SET "name" = 'robada' WHERE "id" = ${globalTemplate}`,
    ).toBe(0);
    expect(await db.$executeRaw`DELETE FROM "RoleTemplate" WHERE "id" = ${globalTemplate}`).toBe(0);
    expect(await system.roleTemplate.count({ where: { id: globalTemplate } })).toBe(1);
  });

  it('a business sees and updates only its own Empresa row, and cannot create one', async () => {
    const db = scoped.forCompany(A.id);
    expect(
      count(
        await db.$queryRaw`SELECT count(*)::int AS n FROM "Empresa" WHERE "id" IN (${A.id}, ${B.id})`,
      ),
    ).toBe(1);
    expect(
      await db.$executeRaw`UPDATE "Empresa" SET "nombre" = 'robada' WHERE "id" = ${B.id}`,
    ).toBe(0);
    expect(
      await failure(
        db.$executeRaw`INSERT INTO "Empresa" ("id", "nombre", "slug", "configuracion", "updatedAt")
                       VALUES (gen_random_uuid()::text, 'P18-10 nueva', ${`p18-10-nueva-${suffix}`}, '{}', now())`,
      ),
    ).toMatch(/row-level security/);
  });

  it('wapsell_app cannot read identity secrets nor empty or drop tables', async () => {
    expect(await failure(app.$queryRaw`SELECT count(*) FROM "PasswordResetToken"`)).toMatch(
      /permission denied/,
    );
    expect(await failure(app.$queryRaw`SELECT count(*) FROM "MfaFactor"`)).toMatch(
      /permission denied/,
    );
    expect(await failure(app.$executeRawUnsafe('TRUNCATE "Lote"'))).toMatch(/permission denied/);
    expect(await failure(app.$executeRawUnsafe('DROP TABLE "Lote"'))).toMatch(
      /must be owner|permission denied/,
    );
  });
});
