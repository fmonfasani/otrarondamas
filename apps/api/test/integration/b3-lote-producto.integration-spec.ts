import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — Lote.producto ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let batchUpdateA: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };
  let subfamilyA: { id: string };
  let subfamilyB: { id: string };
  let typeA: { id: string };
  let typeB: { id: string };
  let subtypeA: { id: string };
  let subtypeB: { id: string };
  let suffix: number;

  const expiry = new Date('2030-01-01T00:00:00.000Z');

  const baseProduct = (
    companyId: string,
    familyId: string,
    subfamilyId: string,
    typeId: string,
    subtypeId: string,
    internalCode: string,
  ) => ({
    empresaId: companyId,
    nombre: `B3 LP ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: familyId,
    subfamiliaId: subfamilyId,
    tipoId: typeId,
    subtipoId: subtypeId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const batchData = (companyId: string, productId: string, batchNumber: string) => ({
    empresaId: companyId,
    productoId: productId,
    numeroLote: batchNumber,
    vencimiento: expiry,
    cantidad: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    suffix = Date.now();
    const s = suffix;

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 LP A ${s}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 LP B ${s}`, configuracion: {} },
      select: { id: true },
    });

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `B3 LP Familia A ${s}`, prefijo: 'LPA' },
      select: { id: true },
    });
    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `B3 LP Familia B ${s}`, prefijo: 'LPB' },
      select: { id: true },
    });
    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 LP Sub A ${s}`,
        prefijo: 'LSA',
      },
      select: { id: true },
    });
    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `B3 LP Sub B ${s}`,
        prefijo: 'LSB',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 LP Tipo A ${s}`,
        prefijo: 'LTA',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `B3 LP Tipo B ${s}`,
        prefijo: 'LTB',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 LP Subtipo A ${s}`,
        prefijo: 'LXA',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `B3 LP Subtipo B ${s}`,
        prefijo: 'LXB',
      },
      select: { id: true },
    });

    productA = await prisma.producto.create({
      data: baseProduct(companyA.id, familyA.id, subfamilyA.id, typeA.id, subtypeA.id, `B3LPA${s}`),
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: baseProduct(companyB.id, familyB.id, subfamilyB.id, typeB.id, subtypeB.id, `B3LPB${s}`),
      select: { id: true },
    });

    batchUpdateA = await prisma.lote.create({
      data: batchData(companyA.id, productA.id, `LP-UPD-${s}`),
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.lote.deleteMany({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
    await prisma.subtipo.deleteMany({ where: { id: { in: [subtypeA.id, subtypeB.id] } } });
    await prisma.tipo.deleteMany({ where: { id: { in: [typeA.id, typeB.id] } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: [subfamilyA.id, subfamilyB.id] } } });
    await prisma.familia.deleteMany({ where: { id: { in: [familyA.id, familyB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
  });

  it('LP-01: same-Business Producto reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const created = await db.lote.create({
      data: batchData(companyA.id, productA.id, `LP-01-${suffix}`),
      select: { empresaId: true, productoId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.productoId).toBe(productA.id);
  });

  it('LP-02: cross-Business Producto reference rejects without persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.lote.create({ data: batchData(companyA.id, productB.id, `LP-02-${suffix}`) }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({ where: { productoId: productB.id, empresaId: companyA.id } }),
    ).toBe(0);
  });

  it('LP-03: update cannot switch an existing Lote to another Business Producto', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.lote.update({
        where: { id: batchUpdateA.id },
        data: { productoId: productB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.lote.findUnique({
      where: { id: batchUpdateA.id },
      select: { productoId: true, empresaId: true },
    });
    expect(persisted?.productoId).toBe(productA.id);
    expect(persisted?.empresaId).toBe(companyA.id);
  });

  it('LP-04: cross-Business Producto reference rejects inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.$transaction(async (tx) => {
        await tx.lote.create({ data: batchData(companyA.id, productB.id, `LP-04-${suffix}`) });
      }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({ where: { productoId: productB.id, empresaId: companyA.id } }),
    ).toBe(0);
  });

  it('LP-05: a rejected cross-Business Lote rolls back the valid Lote of the same transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.$transaction(async (tx) => {
        await tx.lote.create({ data: batchData(companyA.id, productA.id, `LP-05-OK-${suffix}`) });
        await tx.lote.create({ data: batchData(companyA.id, productB.id, `LP-05-BAD-${suffix}`) });
      }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({
        where: { numeroLote: { in: [`LP-05-OK-${suffix}`, `LP-05-BAD-${suffix}`] } },
      }),
    ).toBe(0);
  });

  it('LP-06: nonexistent Producto reference fails closed without persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.lote.create({
        data: batchData(companyA.id, `no-existe-${suffix}`, `LP-06-${suffix}`),
      }),
    ).rejects.toThrow();

    expect(await prisma.lote.count({ where: { numeroLote: `LP-06-${suffix}` } })).toBe(0);
  });

  it('LP-07: same-Business Producto reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const created = await db.$transaction(async (tx) =>
      tx.lote.create({
        data: batchData(companyA.id, productA.id, `LP-07-${suffix}`),
        select: { id: true },
      }),
    );

    const persisted = await prisma.lote.findUnique({
      where: { id: created.id },
      select: { empresaId: true, productoId: true },
    });
    expect(persisted?.empresaId).toBe(companyA.id);
    expect(persisted?.productoId).toBe(productA.id);
  });

  it('LP-08: createMany with a cross-Business Producto rejects without partial persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.lote.createMany({
        data: [
          batchData(companyA.id, productA.id, `LP-08-OK-${suffix}`),
          batchData(companyA.id, productB.id, `LP-08-BAD-${suffix}`),
        ],
      }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({
        where: { numeroLote: { in: [`LP-08-OK-${suffix}`, `LP-08-BAD-${suffix}`] } },
      }),
    ).toBe(0);
  });
});
