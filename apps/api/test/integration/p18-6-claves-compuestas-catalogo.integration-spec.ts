import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 3: catalog and loyalty). The category tree, the products, their
 * presentations and the loyalty rules reference their parents with the business in the key, Restrict
 * both ways: (empresaId, familiaId) → Familia (empresaId, id). The database refuses a row that points
 * to another business's category or product, whichever role writes it (the system role included),
 * and a referenced row can be neither deleted nor moved to another business. These references were
 * the last ones in the relation-ownership registry, which is gone (it had to be, before RLS).
 */
const MODULE_TABLES = [
  'Familia',
  'Subfamilia',
  'Tipo',
  'Subtipo',
  'Producto',
  'Presentacion',
  'ReglaFidelizacion',
];

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-6 ${label} ${suffix}`,
      slug: `p18-6-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const familia = await prisma.familia.create({
    data: { empresaId: id, nombre: `P18-6 F ${label}`, prefijo: `F${label}` },
  });
  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: id,
      familiaId: familia.id,
      nombre: `P18-6 S ${label}`,
      prefijo: `S${label}`,
    },
  });
  const tipo = await prisma.tipo.create({
    data: {
      empresaId: id,
      subfamiliaId: subfamilia.id,
      nombre: `P18-6 T ${label}`,
      prefijo: `T${label}`,
    },
  });
  const subtipo = await prisma.subtipo.create({
    data: { empresaId: id, tipoId: tipo.id, nombre: `P18-6 X ${label}`, prefijo: `X${label}` },
  });
  const product = await prisma.producto.create({
    data: {
      empresaId: id,
      nombre: `P18-6 Product ${label} ${suffix}`,
      codigoInterno: `P186-${label}-${suffix}`,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 2,
    },
  });
  return {
    id,
    familia: familia.id,
    subfamilia: subfamilia.id,
    tipo: tipo.id,
    subtipo: subtipo.id,
    product: product.id,
  };
}

describe('P18-6 — claves compuestas: catálogo y fidelización (ADR-DAT-020)', () => {
  let prisma: PrismaService;
  let suffix: number;
  let A: Business;
  let B: Business;

  const code = (error: unknown) => (error as { code?: string }).code;
  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'written';
    } catch (error) {
      return code(error);
    }
  };

  beforeAll(async () => {
    // The system role (wapsell_system) bypasses row security by design: the keys must hold for it too.
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    A = await createBusiness(prisma, 'A', suffix);
    B = await createBusiness(prisma, 'B', suffix);
  });

  afterAll(async () => {
    const empresaId = { in: [A?.id, B?.id].filter(Boolean) as string[] };
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId } });
    await prisma.presentacion.deleteMany({ where: { empresaId } });
    await prisma.producto.deleteMany({ where: { empresaId } });
    await prisma.subtipo.deleteMany({ where: { empresaId } });
    await prisma.tipo.deleteMany({ where: { empresaId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId } });
    await prisma.familia.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  });

  it('every foreign key of the module carries the business and restricts delete and update', async () => {
    type Fk = {
      name: string;
      on_delete: string;
      on_update: string;
      columns: string[];
      referenced_columns: string[];
    };
    const fks = await prisma.$queryRaw<Fk[]>`
      SELECT c.conname::text AS name, c.confdeltype::text AS on_delete, c.confupdtype::text AS on_update,
             ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS columns,
             ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i)
               AS referenced_columns
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class r ON r.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
      WHERE c.contype = 'f' AND t.relname::text = ANY(${MODULE_TABLES}) AND r.relname <> 'Empresa'
      ORDER BY 1`;

    // Subfamilia, Tipo, Subtipo (3), Producto (4), Presentacion (1), ReglaFidelizacion (4).
    expect(fks).toHaveLength(12);
    const wrong = fks
      .filter((fk) => {
        const at = fk.columns.indexOf('empresaId');
        const carries = at >= 0 && fk.referenced_columns[at] === 'empresaId';
        return !carries || fk.on_delete !== 'r' || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it("the database refuses another business's category, even for the system role", async () => {
    expect(
      await rejection(
        prisma.subfamilia.create({
          data: {
            empresaId: A.id,
            familiaId: B.familia,
            nombre: `P18-6 cruzada ${suffix}`,
            prefijo: 'CRZ',
          },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.producto.update({ where: { id: A.product }, data: { tipoId: B.tipo } }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.presentacion.create({
          data: { empresaId: A.id, productoId: B.product, nombre: 'Caja', factorConversion: 12 },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.reglaFidelizacion.create({
          data: {
            empresaId: A.id,
            nombre: 'Cruzada',
            nivelRequerido: 'VIP',
            descuentoPorcentaje: 5,
            familiaId: B.familia,
          },
        }),
      ),
    ).toBe('P2003');
    // A rule of its own business is fine, and one without a category too.
    expect(
      await rejection(
        prisma.reglaFidelizacion.create({
          data: {
            empresaId: A.id,
            nombre: 'Propia',
            nivelRequerido: 'VIP',
            descuentoPorcentaje: 5,
            subtipoId: A.subtipo,
          },
        }),
      ),
    ).toBe('written');
  });

  it('a referenced row can be neither deleted nor moved to another business', async () => {
    expect(await rejection(prisma.familia.delete({ where: { id: A.familia } }))).toBe('P2003');
    expect(await rejection(prisma.subtipo.delete({ where: { id: A.subtipo } }))).toBe('P2003');
    expect(
      await rejection(prisma.tipo.update({ where: { id: A.tipo }, data: { empresaId: B.id } })),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.producto.update({ where: { id: A.product }, data: { empresaId: B.id } }),
      ),
    ).toBe('P2003');
  });
});
