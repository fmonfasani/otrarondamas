import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type Hierarchy = {
  empresaId: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
};

describe('B3 relation isolation — Producto.subtipo ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let suffix: number;
  let sequence = 0;
  let hierA: Hierarchy;
  let hierB: Hierarchy;

  // Each test asks for its own codigoInterno: no test depends on rows from
  // another nor can it collide with @@unique([empresaId, codigoInterno])
  // (P2002).
  const uniqueCode = (id: string) => `B3ST-${id}-${suffix}-${++sequence}`;

  const productData = (hier: Hierarchy, subtypeId: string, internalCode: string) => ({
    empresaId: hier.empresaId,
    nombre: `B3 ST ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: hier.familiaId,
    subfamiliaId: hier.subfamiliaId,
    tipoId: hier.tipoId,
    subtipoId: subtypeId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const rejectionCode = async (operation: Promise<unknown>): Promise<string> => {
    try {
      await operation;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const createHierarchy = async (label: 'A' | 'B', s: number): Promise<Hierarchy> => {
    const company = await prisma.empresa.create({
      data: { nombre: `B3 ST ${label} ${s}`, slug: `b3-producto-subtipo-${label.toLowerCase()}-${s}`, configuracion: {} },
      select: { id: true },
    });
    const family = await prisma.familia.create({
      data: { empresaId: company.id, nombre: `B3 ST Familia ${label} ${s}`, prefijo: `F${label}R` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: company.id,
        familiaId: family.id,
        nombre: `B3 ST Sub ${label} ${s}`,
        prefijo: `S${label}R`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: company.id,
        subfamiliaId: subfamily.id,
        nombre: `B3 ST Tipo ${label} ${s}`,
        prefijo: `T${label}R`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: company.id,
        tipoId: type.id,
        nombre: `B3 ST Subtipo ${label} ${s}`,
        prefijo: `X${label}R`,
      },
      select: { id: true },
    });
    return {
      empresaId: company.id,
      familiaId: family.id,
      subfamiliaId: subfamily.id,
      tipoId: type.id,
      subtipoId: subtype.id,
    };
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    suffix = Date.now();
    hierA = await createHierarchy('A', suffix);
    hierB = await createHierarchy('B', suffix);
  });

  afterAll(async () => {
    const hierarchies = [hierA, hierB];
    await prisma.producto.deleteMany({
      where: { empresaId: { in: hierarchies.map((j) => j.empresaId) } },
    });
    await prisma.subtipo.deleteMany({ where: { id: { in: hierarchies.map((j) => j.subtipoId) } } });
    await prisma.tipo.deleteMany({ where: { id: { in: hierarchies.map((j) => j.tipoId) } } });
    await prisma.subfamilia.deleteMany({
      where: { id: { in: hierarchies.map((j) => j.subfamiliaId) } },
    });
    await prisma.familia.deleteMany({ where: { id: { in: hierarchies.map((j) => j.familiaId) } } });
    await prisma.empresa.deleteMany({ where: { id: { in: hierarchies.map((j) => j.empresaId) } } });
    await prisma.$disconnect();
  });

  it('ST-01: same-Business Subtipo reference persists', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const created = await db.producto.create({
      data: productData(hierA, hierA.subtipoId, uniqueCode('01')),
      select: { empresaId: true, subtipoId: true },
    });

    expect(created.empresaId).toBe(hierA.empresaId);
    expect(created.subtipoId).toBe(hierA.subtipoId);
  });

  it('ST-02: cross-Business Subtipo create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('02');

    expect(
      await rejectionCode(db.producto.create({ data: productData(hierA, hierB.subtipoId, code) })),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(0);
  });

  it('ST-03: cross-Business Subtipo update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const product = await prisma.producto.create({
      data: productData(hierA, hierA.subtipoId, uniqueCode('03')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.producto.update({ where: { id: product.id }, data: { subtipoId: hierB.subtipoId } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.producto.findUnique({
      where: { id: product.id },
      select: { subtipoId: true },
    });
    expect(persisted?.subtipoId).toBe(hierA.subtipoId);
  });

  it('ST-04: same-Business Subtipo reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('04');

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productData(hierA, hierA.subtipoId, code) });
    });

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(1);
  });

  it('ST-05: rejected cross-Business create rolls back the valid Producto of the same transaction', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const valid = uniqueCode('05-OK');
    const invalid = uniqueCode('05-BAD');

    expect(
      await rejectionCode(
        db.$transaction(async (tx) => {
          await tx.producto.create({ data: productData(hierA, hierA.subtipoId, valid) });
          await tx.producto.create({ data: productData(hierA, hierB.subtipoId, invalid) });
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.producto.count({ where: { codigoInterno: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('ST-06: nonexistent Subtipo fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('06');

    expect(
      await rejectionCode(
        db.producto.create({ data: productData(hierA, `no-existe-${suffix}`, code) }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(0);
  });

  it('ST-07: mixed createMany rejects with P2025 without partial persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const valid = uniqueCode('07-OK');
    const invalid = uniqueCode('07-BAD');

    expect(
      await rejectionCode(
        db.producto.createMany({
          data: [
            productData(hierA, hierA.subtipoId, valid),
            productData(hierA, hierB.subtipoId, invalid),
          ],
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.producto.count({ where: { codigoInterno: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('ST-08: control — duplicate codigoInterno is P2002, distinguishable from the ownership rejection P2025', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('08');
    await db.producto.create({ data: productData(hierA, hierA.subtipoId, code) });

    expect(
      await rejectionCode(db.producto.create({ data: productData(hierA, hierA.subtipoId, code) })),
    ).toBe('P2002');
    expect(
      await rejectionCode(
        db.producto.create({ data: productData(hierA, hierB.subtipoId, uniqueCode('08-X')) }),
      ),
    ).toBe('P2025');
    // A duplicate codigoInterno AND a foreign Subtipo at the same time: the
    // ownership must win over the unique (if P2002 masked the check, this
    // would return P2002).
    expect(
      await rejectionCode(db.producto.create({ data: productData(hierA, hierB.subtipoId, code) })),
    ).toBe('P2025');
  });
});
