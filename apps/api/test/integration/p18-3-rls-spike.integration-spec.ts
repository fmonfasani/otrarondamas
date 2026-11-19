/* eslint-disable @typescript-eslint/no-explicit-any -- the spike client is generated at test time */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { companyScopeExtension } from '../../src/prisma/company-scope.extension';
import { RELATIONS_WITH_OWNERSHIP } from '../../src/prisma/relation-ownership';
import { businessPerOperation, forCompanyWithRls, setBusiness } from './p18-3-rls/business-context';

/**
 * INIT-019 PR 3 — technical spike (FASE-2 §5.3), before composite keys (PR 4) and row-level
 * security (PR 5) touch the real tables. On Prisma 5.22 and the real database roles it checks:
 *   a) how the API fixes the business, per operation and inside interactive transactions;
 *   b) composite references that share empresaId, in nested creates too;
 *   c) the extra cost per query.
 *
 * It generates its own client from p18-3-rls/schema.prisma and creates its own tables (prefixed
 * p18_3_) as the schema owner, then drops them: the API schema and its behavior do not change.
 * Runs where the roles exist (CI: b4-verification and post-merge-verification).
 */
const configured = Boolean(process.env.SYSTEM_DATABASE_URL && process.env.OWNER_DATABASE_URL);

const requireCjs = createRequire(import.meta.url);
const SCHEMA = fileURLToPath(new URL('./p18-3-rls/schema.prisma', import.meta.url));
const CLIENT = fileURLToPath(new URL('../../node_modules/.p18-3-rls/client', import.meta.url));
const MODELS = [
  'VentaItem',
  'Venta',
  'Cliente',
  'Producto',
  'Plantilla',
  'PlantillaUnaPolitica',
  'Empresa',
];
const table = (model: string) => `"p18_3_${model}"`;
const BUSINESS = "current_setting('app.business_id', true)";
const OWN = `"empresaId" = ${BUSINESS}`;
const RLS_VIOLATION = /row-level security/;
const APP_URL = process.env.DATABASE_URL ?? '';

function prisma(...args: string[]): string {
  return execFileSync(process.execPath, [requireCjs.resolve('prisma'), ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function withPool(url: string, connections: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set('connection_limit', String(connections));
  return parsed.toString();
}

/** The per-operation wrapper from Prisma's row-level security example, used as is. */
function examplePerOperation(Prisma: any, businessId: string) {
  return Prisma.defineExtension((client: any) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }: any) {
            const [, result] = await client.$transaction([
              setBusiness(client, businessId),
              query(args),
            ]);
            return result;
          },
        },
      },
    }),
  );
}

/** PR 4 deletes the registry entries: the composite keys check the same thing in the database. */
async function withoutRegistryEntry<T>(model: string, run: () => Promise<T>): Promise<T> {
  const registry = RELATIONS_WITH_OWNERSHIP as Record<string, readonly string[]>;
  const saved = registry[model];
  delete registry[model];
  try {
    return await run();
  } finally {
    registry[model] = saved;
  }
}

async function measure(n: number, run: () => Promise<unknown>) {
  for (let i = 0; i < 10; i++) await run();
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = process.hrtime.bigint();
    await run();
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  times.sort((x, y) => x - y);
  return { p50: times[Math.floor(n * 0.5)], p95: times[Math.floor(n * 0.95)] };
}

(configured ? describe : describe.skip)('P18-3 — prueba técnica: RLS y claves compuestas', () => {
  let generated: any;
  let Prisma: any;
  let owner: any;
  let system: any;
  let app: any;
  let A: string;
  let B: string;
  let pA: { id: string };
  let pB: { id: string };
  let cA: { id: string };
  let cB: { id: string };

  const names = (rows: Array<{ nombre: string }>) =>
    rows.map((r) => r.nombre).sort((x, y) => x.localeCompare(y));

  beforeAll(async () => {
    prisma('generate', '--schema', SCHEMA);
    const ddl = prisma(
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      SCHEMA,
      '--script',
    );
    generated = requireCjs(CLIENT);
    Prisma = generated.Prisma;

    owner = new generated.PrismaClient({ datasourceUrl: process.env.OWNER_DATABASE_URL });
    await owner.$transaction(
      async (tx: any) => {
        for (const model of MODELS)
          await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table(model)}`);
        for (const statement of ddl.split(/;\s*\n/)) {
          const sql = statement.replace(/^--.*$/gm, '').trim();
          if (sql) await tx.$executeRawUnsafe(sql);
        }
        for (const model of ['Producto', 'Cliente', 'Venta', 'VentaItem']) {
          await tx.$executeRawUnsafe(`ALTER TABLE ${table(model)} ENABLE ROW LEVEL SECURITY`);
          await tx.$executeRawUnsafe(
            `CREATE POLICY negocio ON ${table(model)} USING (${OWN}) WITH CHECK (${OWN})`,
          );
        }
        await tx.$executeRawUnsafe(`ALTER TABLE ${table('Empresa')} ENABLE ROW LEVEL SECURITY`);
        await tx.$executeRawUnsafe(
          `CREATE POLICY negocio ON ${table('Empresa')} USING ("id" = ${BUSINESS})`,
        );
        const plantilla = table('Plantilla');
        await tx.$executeRawUnsafe(`ALTER TABLE ${plantilla} ENABLE ROW LEVEL SECURITY`);
        await tx.$executeRawUnsafe(
          `CREATE POLICY leer ON ${plantilla} FOR SELECT USING ("empresaId" IS NULL OR ${OWN})`,
        );
        await tx.$executeRawUnsafe(
          `CREATE POLICY alta ON ${plantilla} FOR INSERT WITH CHECK (${OWN})`,
        );
        await tx.$executeRawUnsafe(
          `CREATE POLICY cambio ON ${plantilla} FOR UPDATE USING (${OWN}) WITH CHECK (${OWN})`,
        );
        await tx.$executeRawUnsafe(`CREATE POLICY baja ON ${plantilla} FOR DELETE USING (${OWN})`);
        const unaPolitica = table('PlantillaUnaPolitica');
        await tx.$executeRawUnsafe(`ALTER TABLE ${unaPolitica} ENABLE ROW LEVEL SECURITY`);
        await tx.$executeRawUnsafe(
          `CREATE POLICY negocio ON ${unaPolitica} USING ("empresaId" IS NULL OR ${OWN}) WITH CHECK (${OWN})`,
        );
        await tx.$executeRawUnsafe(
          `GRANT SELECT, INSERT, UPDATE, DELETE ON ${MODELS.map(table).join(', ')} TO wapsell_app, wapsell_system`,
        );
      },
      { timeout: 30_000 },
    );

    system = new generated.PrismaClient({ datasourceUrl: process.env.SYSTEM_DATABASE_URL });
    app = new generated.PrismaClient({ datasourceUrl: withPool(APP_URL, 5) });

    A = (await system.empresa.create({ data: { nombre: 'A' } })).id;
    B = (await system.empresa.create({ data: { nombre: 'B' } })).id;
    pA = await system.producto.create({ data: { empresaId: A, nombre: 'pA' } });
    pB = await system.producto.create({ data: { empresaId: B, nombre: 'pB' } });
    cA = await system.cliente.create({ data: { empresaId: A, nombre: 'cA' } });
    cB = await system.cliente.create({ data: { empresaId: B, nombre: 'cB' } });
    for (const plantillas of [system.plantilla, system.plantillaUnaPolitica]) {
      await plantillas.createMany({
        data: [{ nombre: 'global' }, { empresaId: A, nombre: 'a' }, { empresaId: B, nombre: 'b' }],
      });
    }
  }, 120_000);

  afterAll(async () => {
    await Promise.all([system?.$disconnect(), app?.$disconnect()]);
    if (owner) {
      for (const model of MODELS)
        await owner.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table(model)}`);
      await owner.$disconnect();
    }
  });

  describe('a) the business, fixed per operation', () => {
    it('with no business fixed, wapsell_app sees no rows and cannot write', async () => {
      expect(await app.producto.findMany()).toEqual([]);
      await expect(app.producto.create({ data: { empresaId: A, nombre: 'x' } })).rejects.toThrow(
        RLS_VIOLATION,
      );
    });

    it('each operation fixes it in a short transaction that ends with the operation', async () => {
      const single = new generated.PrismaClient({
        datasourceUrl: withPool(APP_URL, 1),
      });
      try {
        const db = single.$extends(businessPerOperation(A));
        expect(names(await db.producto.findMany())).toEqual(['pA']);
        // Same pooled connection, next operation: the business is gone.
        const [{ v }] =
          await single.$queryRaw`SELECT current_setting('app.business_id', true) AS v`;
        expect(['', null]).toContain(v);
        expect(await single.producto.findMany()).toEqual([]);
      } finally {
        await single.$disconnect();
      }
    });

    it('business A can neither read, change, delete nor insert rows of business B', async () => {
      const db = app.$extends(businessPerOperation(A));
      expect(await db.producto.findMany({ where: { empresaId: B } })).toEqual([]);
      expect(
        await db.producto.updateMany({ where: { empresaId: B }, data: { nombre: 'x' } }),
      ).toEqual({
        count: 0,
      });
      expect(await db.producto.deleteMany({ where: { empresaId: B } })).toEqual({ count: 0 });
      await expect(
        db.producto.create({ data: { empresaId: B, nombre: 'intruso' } }),
      ).rejects.toThrow(RLS_VIOLATION);
      await expect(
        db.cliente.updateMany({ where: { id: cA.id }, data: { empresaId: B } }),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('raw SQL through the scoped client runs with the business fixed too', async () => {
      const db = app.$extends(businessPerOperation(A));
      const rows = await db.$queryRawUnsafe(`SELECT "nombre" FROM ${table('Producto')}`);
      expect(names(rows)).toEqual(['pA']);
    });

    it('two businesses working at the same time never see each other’s rows', async () => {
      const dbA = app.$extends(businessPerOperation(A));
      const dbB = app.$extends(businessPerOperation(B));
      const reads = await Promise.all(
        Array.from({ length: 200 }, async (_, i) => {
          const business = i % 2 ? A : B;
          const rows = await (i % 2 ? dbA : dbB).cliente.findMany();
          return (
            rows.length > 0 && rows.every((r: { empresaId: string }) => r.empresaId === business)
          );
        }),
      );
      expect(reads.every(Boolean)).toBe(true);

      const transactions = await Promise.all(
        Array.from({ length: 20 }, (_, i) => {
          const business = i % 2 ? A : B;
          return forCompanyWithRls(app, business).$transaction(async (tx: any) => {
            const rows = [...(await tx.cliente.findMany()), ...(await tx.producto.findMany())];
            return (
              rows.length > 0 && rows.every((r: { empresaId: string }) => r.empresaId === business)
            );
          });
        }),
      );
      expect(transactions.every(Boolean)).toBe(true);
    });
  });

  describe('a) interactive transactions', () => {
    it('Prisma’s per-operation example escapes them: a rolled-back write stays (Prisma 5.22)', async () => {
      // Why the business is fixed once when the transaction begins. If this ever fails, Prisma
      // changed how nested transactions behave: review business-context.ts before relying on it.
      const example = app.$extends(examplePerOperation(Prisma, A));
      const db = app.$extends(businessPerOperation(A));
      const before = await db.cliente.count();
      await expect(
        example.$transaction(async (tx: any) => {
          await tx.cliente.create({ data: { empresaId: A, nombre: 'escapa' } });
          throw new Error('rollback');
        }),
      ).rejects.toThrow('rollback');
      expect(await db.cliente.count()).toBe(before + 1);
    });

    it('fixed once at the start, it reaches reads, nested creates and raw SQL, Serializable too', async () => {
      const db = forCompanyWithRls(app, A);
      const result = await withoutRegistryEntry('VentaItem', () =>
        db.$transaction(
          async (tx: any) => {
            const max = await tx.venta.aggregate({ _max: { numero: true } });
            const venta = await tx.venta.create({
              data: {
                clienteId: cA.id,
                total: 10,
                numero: (max._max.numero ?? 0) + 1,
                VentaItem: { create: [{ productoId: pA.id, cantidad: 2 }] },
              },
              include: { VentaItem: true },
            });
            // Like inventory.service.ts: raw SQL on the transaction client.
            const raw = await tx.$queryRawUnsafe(
              `SELECT count(*)::int AS n FROM ${table('VentaItem')} WHERE "ventaId" = $1`,
              venta.id,
            );
            const seen = await tx.venta.findUniqueOrThrow({
              where: { id: venta.id },
              include: { VentaItem: true, Cliente: true },
            });
            return { venta, raw, seen };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
      expect(result.venta.empresaId).toBe(A);
      expect(result.venta.VentaItem).toEqual([expect.objectContaining({ empresaId: A })]);
      expect(result.raw).toEqual([{ n: 1 }]);
      expect(result.seen.Cliente.id).toBe(cA.id);
    });

    it('a rolled-back transaction leaves nothing behind', async () => {
      const db = forCompanyWithRls(app, A);
      const before = await db.cliente.count();
      await expect(
        db.$transaction(async (tx: any) => {
          await tx.cliente.create({ data: { nombre: 'no queda' } });
          expect(await tx.cliente.count()).toBe(before + 1);
          throw new Error('rollback');
        }),
      ).rejects.toThrow('rollback');
      expect(await db.cliente.count()).toBe(before);
    });

    it('batch transactions are rejected on the scoped client', () => {
      const db = forCompanyWithRls(app, A);
      expect(() => db.$transaction([db.cliente.count()])).toThrow(/transacciones por lote/);
    });

    it('until PR 4 replaces it, the ownership registry looks outside the transaction and finds nothing', async () => {
      // Its lookups run on the client without the business, outside the transaction: under RLS they
      // see no rows. PR 4 removes the registry; PR 5 cannot ship before it.
      const db = forCompanyWithRls(app, A);
      await expect(
        db.$transaction((tx: any) =>
          tx.venta.create({
            data: { total: 1, VentaItem: { create: [{ productoId: pA.id, cantidad: 1 }] } },
          }),
        ),
      ).rejects.toMatchObject({ code: 'P2025' });
      // Outside a transaction its lookups do carry the business.
      const venta = await db.venta.create({
        data: { total: 1, VentaItem: { create: [{ productoId: pA.id, cantidad: 1 }] } },
        include: { VentaItem: true },
      });
      expect(venta.VentaItem).toHaveLength(1);
    });
  });

  describe('b) composite references sharing empresaId', () => {
    it('a nested create (header and lines together) takes the lines’ business from the header', async () => {
      const venta = await system.venta.create({
        data: {
          empresaId: A,
          clienteId: cA.id,
          total: 5,
          VentaItem: { create: [{ productoId: pA.id, cantidad: 1 }] },
        },
        include: { VentaItem: true },
      });
      expect(venta.VentaItem).toEqual([
        expect.objectContaining({ empresaId: A, productoId: pA.id }),
      ]);
    });

    it('the database rejects a reference to another business, even for wapsell_system', async () => {
      await expect(
        system.venta.create({
          data: {
            empresaId: A,
            total: 1,
            VentaItem: { create: [{ productoId: pB.id, cantidad: 1 }] },
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await expect(
        system.venta.create({
          data: {
            total: 1,
            Empresa: { connect: { id: A } },
            VentaItem: { create: [{ cantidad: 1, Producto: { connect: { id: pB.id } } }] },
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await expect(
        system.venta.create({ data: { empresaId: A, clienteId: cB.id, total: 1 } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });

    it('lines written on their own carry the business: their own is accepted, another rejected', async () => {
      const venta = await system.venta.create({ data: { empresaId: A, total: 1 } });
      const db = app.$extends(businessPerOperation(A));
      await expect(
        db.ventaItem.createMany({
          data: [{ empresaId: A, ventaId: venta.id, productoId: pA.id, cantidad: 3 }],
        }),
      ).resolves.toEqual({ count: 1 });
      await expect(
        db.ventaItem.createMany({
          data: [{ empresaId: B, ventaId: venta.id, productoId: pB.id, cantidad: 3 }],
        }),
      ).rejects.toThrow(RLS_VIOLATION);
      await expect(
        system.ventaItem.createMany({
          data: [{ empresaId: B, ventaId: venta.id, productoId: pB.id, cantidad: 3 }],
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });

    it('a referenced row can be neither deleted nor moved to another business', async () => {
      await system.venta.create({
        data: {
          empresaId: A,
          clienteId: cA.id,
          total: 1,
          VentaItem: { create: [{ productoId: pA.id, cantidad: 1 }] },
        },
      });
      await expect(system.producto.delete({ where: { id: pA.id } })).rejects.toMatchObject({
        code: 'P2003',
      });
      await expect(
        system.cliente.update({ where: { id: cA.id }, data: { empresaId: B } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });

    it('disconnect on an optional composite reference would null the business: set the id to null', async () => {
      const venta = await system.venta.create({
        data: { empresaId: A, clienteId: cA.id, total: 1 },
      });
      await expect(
        system.venta.update({ where: { id: venta.id }, data: { Cliente: { disconnect: true } } }),
      ).rejects.toThrow();
      const updated = await system.venta.update({
        where: { id: venta.id },
        data: { clienteId: null },
      });
      expect(updated).toMatchObject({ empresaId: A, clienteId: null });
    });
  });

  describe('policies', () => {
    it('each business sees only its own business row', async () => {
      const db = app.$extends(businessPerOperation(A));
      expect((await db.empresa.findMany()).map((e: { id: string }) => e.id)).toEqual([A]);
    });

    it('global rows (like RoleTemplate) are read by all; one policy per command keeps writes own', async () => {
      const db = app.$extends(businessPerOperation(A));
      expect(names(await db.plantilla.findMany())).toEqual(['a', 'global']);
      expect(
        await db.plantilla.updateMany({ where: { empresaId: null }, data: { nombre: 'x' } }),
      ).toEqual({ count: 0 });
      expect(await db.plantilla.deleteMany({ where: { empresaId: null } })).toEqual({ count: 0 });
      await expect(db.plantilla.create({ data: { nombre: 'global nueva' } })).rejects.toThrow(
        RLS_VIOLATION,
      );
      await expect(
        db.plantilla.updateMany({ where: { empresaId: A }, data: { empresaId: null } }),
      ).rejects.toThrow(RLS_VIOLATION);
      expect(
        await db.plantilla.updateMany({ where: { empresaId: A }, data: { nombre: 'a' } }),
      ).toEqual({ count: 1 });
    });

    it('with a single policy for every command, a business could delete the global rows', async () => {
      const db = app.$extends(businessPerOperation(A));
      expect(await db.plantillaUnaPolitica.deleteMany({ where: { empresaId: null } })).toEqual({
        count: 1,
      });
    });
  });

  describe('c) cost', () => {
    it('measures the extra cost per query', async () => {
      // Today's forCompany() (the scope extension alone; the system role skips RLS) against the
      // PR 5 candidate, so the difference is only what RLS adds.
      const today = system.$extends(companyScopeExtension(A));
      const dbA = forCompanyWithRls(app, A);
      const roundTrip = await measure(200, () => system.$queryRaw`SELECT 1`);
      const read = await measure(200, () => today.cliente.findFirst());
      const readRls = await measure(200, () => dbA.cliente.findFirst());
      const create = await measure(100, () => today.cliente.create({ data: { nombre: 'costo' } }));
      const createRls = await measure(100, () => dbA.cliente.create({ data: { nombre: 'costo' } }));
      const threeReads = (tx: any) =>
        Promise.all([tx.cliente.count(), tx.producto.count(), tx.venta.count()]);
      const transaction = await measure(100, () => today.$transaction(threeReads));
      const transactionRls = await measure(100, () => dbA.$transaction(threeReads));

      const row = (label: string, plain: { p50: number }, rls: { p50: number; p95: number }) =>
        `${label}: ${plain.p50.toFixed(2)} → ${rls.p50.toFixed(2)} ms p50 (p95 ${rls.p95.toFixed(2)}), ` +
        `+${(rls.p50 - plain.p50).toFixed(2)} ms ≈ ${((rls.p50 - plain.p50) / roundTrip.p50).toFixed(1)} round trips`;
      console.log(
        [
          `P18-3 cost — round trip (SELECT 1) ${roundTrip.p50.toFixed(2)} ms p50`,
          row('read', read, readRls),
          row('create', create, createRls),
          row('transaction with 3 reads', transaction, transactionRls),
        ].join('\n'),
      );

      // Loose bounds: they catch a hang or a lock wait, not normal noise.
      expect(readRls.p50 - read.p50).toBeLessThan(25);
      expect(createRls.p50 - create.p50).toBeLessThan(25);
      expect(transactionRls.p50 - transaction.p50).toBeLessThan(25);
    });
  });
});
