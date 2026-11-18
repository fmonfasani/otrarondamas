import { PrismaClient } from '@prisma/client';

/**
 * ADR-DAT-019 — database roles. The API never connects as a superuser: inside one business it
 * uses wapsell_app (DATABASE_URL), across businesses wapsell_system (SYSTEM_DATABASE_URL), and
 * only migrations use the schema owner. Runs where the roles exist (CI: b4-verification and
 * post-merge-verification, which also set OWNER_DATABASE_URL).
 */
const configured = Boolean(process.env.SYSTEM_DATABASE_URL && process.env.OWNER_DATABASE_URL);

type RoleRow = {
  name: string;
  superuser: boolean;
  bypassrls: boolean;
  createrole: boolean;
  createdb: boolean;
};

(configured ? describe : describe.skip)('P18-1 — roles de base de datos (ADR-DAT-019)', () => {
  let app: PrismaClient;
  let system: PrismaClient;

  beforeAll(async () => {
    app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    system = new PrismaClient({ datasourceUrl: process.env.SYSTEM_DATABASE_URL });
    await Promise.all([app.$connect(), system.$connect()]);
  });

  afterAll(async () => {
    await Promise.all([app?.$disconnect(), system?.$disconnect()]);
  });

  const roleOf = async (client: PrismaClient) =>
    (
      await client.$queryRaw<RoleRow[]>`
        SELECT current_user::text AS name, rolsuper AS superuser, rolbypassrls AS bypassrls,
               rolcreaterole AS createrole, rolcreatedb AS createdb
        FROM pg_roles WHERE rolname = current_user`
    )[0];

  it('the API roles are not superusers and cannot create roles or databases', async () => {
    expect(await roleOf(app)).toEqual({
      name: 'wapsell_app',
      superuser: false,
      bypassrls: false,
      createrole: false,
      createdb: false,
    });
    expect(await roleOf(system)).toEqual({
      name: 'wapsell_system',
      superuser: false,
      bypassrls: true,
      createrole: false,
      createdb: false,
    });
  });

  it('neither role can change the schema, empty a table or read the migration history', async () => {
    for (const client of [app, system]) {
      await expect(client.$executeRawUnsafe('CREATE TABLE p18_1_probe (id int)')).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        client.$executeRawUnsafe('ALTER TABLE "Producto" ADD COLUMN p18_1_probe int'),
      ).rejects.toThrow(/must be owner/);
      await expect(client.$executeRawUnsafe('TRUNCATE "Producto"')).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        client.$queryRawUnsafe('SELECT count(*)::int AS n FROM "_prisma_migrations"'),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('identity and security tables are out of reach inside one business', async () => {
    for (const table of ['Comprador', 'CompradorToken', 'PasswordResetToken', 'MfaFactor']) {
      await expect(
        app.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}"`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        system.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}"`),
      ).resolves.toHaveLength(1);
    }
  });

  it('nobody edits the audit trail; inside a business it is only appended and read', async () => {
    for (const client of [app, system]) {
      await expect(
        client.$executeRawUnsafe('UPDATE "AuditLog" SET "empresaId" = "empresaId" WHERE false'),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(app.$executeRawUnsafe('DELETE FROM "AuditLog" WHERE false')).rejects.toThrow(
      /permission denied/,
    );
    // Only the 5-year retention deletes (OR-B4-041), with the system role.
    await expect(system.$executeRawUnsafe('DELETE FROM "AuditLog" WHERE false')).resolves.toBe(0);
    await expect(
      app.$queryRawUnsafe('SELECT count(*)::int AS n FROM "AuditLog"'),
    ).resolves.toHaveLength(1);
  });

  it('global catalogs are read-only inside one business', async () => {
    for (const table of ['Permiso', 'CapabilityDefinition', 'RoleCapability']) {
      await expect(
        app.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}"`),
      ).resolves.toHaveLength(1);
      await expect(app.$executeRawUnsafe(`DELETE FROM "${table}" WHERE false`)).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it('business data stays readable and writable by both roles', async () => {
    for (const client of [app, system]) {
      await expect(
        client.$queryRawUnsafe('SELECT count(*)::int AS n FROM "Producto"'),
      ).resolves.toHaveLength(1);
      await expect(client.$executeRawUnsafe('DELETE FROM "Producto" WHERE false')).resolves.toBe(0);
    }
  });
});
