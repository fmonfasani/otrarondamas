import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — Producto → Familia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };
  let subfamilyA: { id: string };
  let typeA: { id: string };
  let subtypeA: { id: string };

  const productData = (familyId: string, internalCode: string) => ({
    empresaId: companyA.id,
    nombre: `B3 PF ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: familyId,
    subfamiliaId: subfamilyA.id,
    tipoId: typeA.id,
    subtipoId: subtypeA.id,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    const s = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 PF A ${s}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 PF B ${s}`, configuracion: {} },
      select: { id: true },
    });

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `B3 PF Familia A ${s}`, prefijo: 'PFA' },
      select: { id: true },
    });
    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `B3 PF Familia B ${s}`, prefijo: 'PFB' },
      select: { id: true },
    });

    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 PF Sub A ${s}`,
        prefijo: 'PSA',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 PF Tipo A ${s}`,
        prefijo: 'PTA',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 PF Subtipo A ${s}`,
        prefijo: 'PXA',
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.producto.deleteMany({ where: { codigoInterno: { startsWith: 'B3PFF' } } });
    await prisma.subtipo.deleteMany({ where: { id: subtypeA.id } });
    await prisma.tipo.deleteMany({ where: { id: typeA.id } });
    await prisma.subfamilia.deleteMany({ where: { id: subfamilyA.id } });
    await prisma.familia.deleteMany({ where: { id: { in: [familyA.id, familyB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
  });

  it('PF-01: same-Business Familia reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const code = `B3PFFA${Date.now()}`;
    const created = await db.producto.create({
      data: productData(familyA.id, code),
      select: { empresaId: true, familiaId: true },
    });
    expect(created.empresaId).toBe(companyA.id);
    expect(created.familiaId).toBe(familyA.id);
  });

  it('PF-02: cross-Business Familia reference rejects without persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const code = `B3PFFB${Date.now()}`;
    await expect(db.producto.create({ data: productData(familyB.id, code) })).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: code } })).toBe(0);
  });

  it('PF-03: cross-Business Familia update rejects and preserves existing relation', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const code = `B3PFFC${Date.now()}`;
    const product = await prisma.producto.create({
      data: productData(familyA.id, code),
      select: { id: true },
    });
    await expect(
      db.producto.update({ where: { id: product.id }, data: { familiaId: familyB.id } }),
    ).rejects.toThrow();
    const persisted = await prisma.producto.findUnique({
      where: { id: product.id },
      select: { familiaId: true },
    });
    expect(persisted?.familiaId).toBe(familyA.id);
  });

  it('PF-04: mixed createMany rejects without partial persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const a = `B3PFFD${Date.now()}`;
    const b = `B3PFFE${Date.now()}`;
    await expect(
      db.producto.createMany({ data: [productData(familyA.id, a), productData(familyB.id, b)] }),
    ).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: { in: [a, b] } } })).toBe(0);
  });

  it('PF-05: relation isolation applies inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const negative = `B3PFFF${Date.now()}`;
    const positive = `B3PFFG${Date.now()}`;

    await expect(
      db.$transaction(async (tx) => {
        await tx.producto.create({ data: productData(familyB.id, negative) });
      }),
    ).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: negative } })).toBe(0);

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productData(familyA.id, positive) });
    });
    expect(await prisma.producto.count({ where: { codigoInterno: positive } })).toBe(1);
  });
});
