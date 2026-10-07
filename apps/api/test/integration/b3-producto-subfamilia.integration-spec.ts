import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type Hierarchy = {
  empresaId: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
};

describe('B3 relation isolation — Producto.subfamilia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let suffix: number;
  let sequence = 0;
  let hierA: Hierarchy;
  let hierB: Hierarchy;

  // Each test asks for its own codigoInterno: no test depends on rows from
  // another nor can it collide with @@unique([empresaId, codigoInterno])
  // (P2002).
  const uniqueCode = (id: string) => `B3SP-${id}-${suffix}-${++sequence}`;

  const productData = (hier: Hierarchy, subfamilyId: string, internalCode: string) => ({
    empresaId: hier.empresaId,
    nombre: `B3 SP ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: hier.familiaId,
    subfamiliaId: subfamilyId,
    tipoId: hier.tipoId,
    subtipoId: hier.subtipoId,
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
      data: { nombre: `B3 SP ${label} ${s}`, slug: `b3-producto-subfamilia-a-${s}`, configuracion: {} },
      select: { id: true },
    });
    const family = await prisma.familia.create({
      data: { empresaId: company.id, nombre: `B3 SP Familia ${label} ${s}`, prefijo: `F${label}P` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: company.id,
        familiaId: family.id,
        nombre: `B3 SP Sub ${label} ${s}`,
        prefijo: `S${label}P`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: company.id,
        subfamiliaId: subfamily.id,
        nombre: `B3 SP Tipo ${label} ${s}`,
        prefijo: `T${label}P`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: company.id,
        tipoId: type.id,
        nombre: `B3 SP Subtipo ${label} ${s}`,
        prefijo: `X${label}P`,
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

  it('SP-01: same-Business Subfamilia reference persists', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('01');
    const created = await db.producto.create({
      data: productData(hierA, hierA.subfamiliaId, code),
      select: { empresaId: true, subfamiliaId: true },
    });

    expect(created.empresaId).toBe(hierA.empresaId);
    expect(created.subfamiliaId).toBe(hierA.subfamiliaId);
  });

  it('SP-02: cross-Business Subfamilia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('02');

    expect(
      await rejectionCode(
        db.producto.create({ data: productData(hierA, hierB.subfamiliaId, code) }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(0);
  });

  it('SP-03: cross-Business Subfamilia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const product = await prisma.producto.create({
      data: productData(hierA, hierA.subfamiliaId, uniqueCode('03')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.producto.update({
          where: { id: product.id },
          data: { subfamiliaId: hierB.subfamiliaId },
        }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.producto.findUnique({
      where: { id: product.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(hierA.subfamiliaId);
  });

  it('SP-04: rejected cross-Business create rolls back the valid Producto of the same transaction', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const valid = uniqueCode('04-OK');
    const invalid = uniqueCode('04-BAD');

    expect(
      await rejectionCode(
        db.$transaction(async (tx) => {
          await tx.producto.create({ data: productData(hierA, hierA.subfamiliaId, valid) });
          await tx.producto.create({ data: productData(hierA, hierB.subfamiliaId, invalid) });
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.producto.count({ where: { codigoInterno: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('SP-05: mixed createMany rejects with P2025 without partial persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const valid = uniqueCode('05-OK');
    const invalid = uniqueCode('05-BAD');

    expect(
      await rejectionCode(
        db.producto.createMany({
          data: [
            productData(hierA, hierA.subfamiliaId, valid),
            productData(hierA, hierB.subfamiliaId, invalid),
          ],
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.producto.count({ where: { codigoInterno: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('SP-06: nonexistent Subfamilia fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('06');

    expect(
      await rejectionCode(
        db.producto.create({ data: productData(hierA, `no-existe-${suffix}`, code) }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(0);
  });

  it('SP-07: same-Business Subfamilia reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('07');

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productData(hierA, hierA.subfamiliaId, code) });
    });

    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(1);
  });

  it('SP-08: control — a duplicate codigoInterno is P2002, distinguishable from the ownership rejection', async () => {
    const db = scopedPrisma.forCompany(hierA.empresaId);
    const code = uniqueCode('08');
    await db.producto.create({ data: productData(hierA, hierA.subfamiliaId, code) });

    expect(
      await rejectionCode(
        db.producto.create({ data: productData(hierA, hierA.subfamiliaId, code) }),
      ),
    ).toBe('P2002');
  });
});
