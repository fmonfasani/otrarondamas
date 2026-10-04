import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — Producto → Familia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };
  let subfamiliaA: { id: string };
  let tipoA: { id: string };
  let subtipoA: { id: string };

  const productoData = (familiaId: string, codigoInterno: string) => ({
    empresaId: empresaA.id,
    nombre: `B3 PF ${codigoInterno}`,
    codigoInterno,
    familiaId,
    subfamiliaId: subfamiliaA.id,
    tipoId: tipoA.id,
    subtipoId: subtipoA.id,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    const s = Date.now();

    empresaA = await prisma.empresa.create({ data: { nombre: `B3 PF A ${s}`, configuracion: {} }, select: { id: true } });
    empresaB = await prisma.empresa.create({ data: { nombre: `B3 PF B ${s}`, configuracion: {} }, select: { id: true } });

    familiaA = await prisma.familia.create({ data: { empresaId: empresaA.id, nombre: `B3 PF Familia A ${s}`, prefijo: 'PFA' }, select: { id: true } });
    familiaB = await prisma.familia.create({ data: { empresaId: empresaB.id, nombre: `B3 PF Familia B ${s}`, prefijo: 'PFB' }, select: { id: true } });

    subfamiliaA = await prisma.subfamilia.create({ data: { empresaId: empresaA.id, familiaId: familiaA.id, nombre: `B3 PF Sub A ${s}`, prefijo: 'PSA' }, select: { id: true } });
    tipoA = await prisma.tipo.create({ data: { empresaId: empresaA.id, subfamiliaId: subfamiliaA.id, nombre: `B3 PF Tipo A ${s}`, prefijo: 'PTA' }, select: { id: true } });
    subtipoA = await prisma.subtipo.create({ data: { empresaId: empresaA.id, tipoId: tipoA.id, nombre: `B3 PF Subtipo A ${s}`, prefijo: 'PXA' }, select: { id: true } });
  });

  afterAll(async () => {
    await prisma.producto.deleteMany({ where: { codigoInterno: { startsWith: 'B3PFF' } } });
    await prisma.subtipo.deleteMany({ where: { id: subtipoA.id } });
    await prisma.tipo.deleteMany({ where: { id: tipoA.id } });
    await prisma.subfamilia.deleteMany({ where: { id: subfamiliaA.id } });
    await prisma.familia.deleteMany({ where: { id: { in: [familiaA.id, familiaB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [empresaA.id, empresaB.id] } } });
    await prisma.$disconnect();
  });

  it('PF-01: same-Business Familia reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const codigo = `B3PFFA${Date.now()}`;
    const created = await db.producto.create({ data: productoData(familiaA.id, codigo), select: { empresaId: true, familiaId: true } });
    expect(created.empresaId).toBe(empresaA.id);
    expect(created.familiaId).toBe(familiaA.id);
  });

  it('PF-02: cross-Business Familia reference rejects without persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const codigo = `B3PFFB${Date.now()}`;
    await expect(db.producto.create({ data: productoData(familiaB.id, codigo) })).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(0);
  });

  it('PF-03: cross-Business Familia update rejects and preserves existing relation', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const codigo = `B3PFFC${Date.now()}`;
    const producto = await prisma.producto.create({ data: productoData(familiaA.id, codigo), select: { id: true } });
    await expect(db.producto.update({ where: { id: producto.id }, data: { familiaId: familiaB.id } })).rejects.toThrow();
    const persisted = await prisma.producto.findUnique({ where: { id: producto.id }, select: { familiaId: true } });
    expect(persisted?.familiaId).toBe(familiaA.id);
  });

  it('PF-04: mixed createMany rejects without partial persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const a = `B3PFFD${Date.now()}`;
    const b = `B3PFFE${Date.now()}`;
    await expect(db.producto.createMany({ data: [productoData(familiaA.id, a), productoData(familiaB.id, b)] })).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: { in: [a, b] } } })).toBe(0);
  });

  it('PF-05: relation isolation applies inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const negative = `B3PFFF${Date.now()}`;
    const positive = `B3PFFG${Date.now()}`;

    await expect(db.$transaction(async (tx) => {
      await tx.producto.create({ data: productoData(familiaB.id, negative) });
    })).rejects.toThrow();
    expect(await prisma.producto.count({ where: { codigoInterno: negative } })).toBe(0);

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productoData(familiaA.id, positive) });
    });
    expect(await prisma.producto.count({ where: { codigoInterno: positive } })).toBe(1);
  });
});
