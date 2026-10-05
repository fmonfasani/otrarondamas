import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — Lote.producto ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let loteUpdateA: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };
  let subfamiliaA: { id: string };
  let subfamiliaB: { id: string };
  let tipoA: { id: string };
  let tipoB: { id: string };
  let subtipoA: { id: string };
  let subtipoB: { id: string };
  let suffix: number;

  const vencimiento = new Date('2030-01-01T00:00:00.000Z');

  const baseProducto = (
    empresaId: string,
    familiaId: string,
    subfamiliaId: string,
    tipoId: string,
    subtipoId: string,
    codigoInterno: string,
  ) => ({
    empresaId,
    nombre: `B3 LP ${codigoInterno}`,
    codigoInterno,
    familiaId,
    subfamiliaId,
    tipoId,
    subtipoId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const loteData = (empresaId: string, productoId: string, numeroLote: string) => ({
    empresaId,
    productoId,
    numeroLote,
    vencimiento,
    cantidad: 10,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    suffix = Date.now();
    const s = suffix;

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 LP A ${s}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 LP B ${s}`, configuracion: {} },
      select: { id: true },
    });

    familiaA = await prisma.familia.create({
      data: { empresaId: empresaA.id, nombre: `B3 LP Familia A ${s}`, prefijo: 'LPA' },
      select: { id: true },
    });
    familiaB = await prisma.familia.create({
      data: { empresaId: empresaB.id, nombre: `B3 LP Familia B ${s}`, prefijo: 'LPB' },
      select: { id: true },
    });
    subfamiliaA = await prisma.subfamilia.create({
      data: { empresaId: empresaA.id, familiaId: familiaA.id, nombre: `B3 LP Sub A ${s}`, prefijo: 'LSA' },
      select: { id: true },
    });
    subfamiliaB = await prisma.subfamilia.create({
      data: { empresaId: empresaB.id, familiaId: familiaB.id, nombre: `B3 LP Sub B ${s}`, prefijo: 'LSB' },
      select: { id: true },
    });
    tipoA = await prisma.tipo.create({
      data: { empresaId: empresaA.id, subfamiliaId: subfamiliaA.id, nombre: `B3 LP Tipo A ${s}`, prefijo: 'LTA' },
      select: { id: true },
    });
    tipoB = await prisma.tipo.create({
      data: { empresaId: empresaB.id, subfamiliaId: subfamiliaB.id, nombre: `B3 LP Tipo B ${s}`, prefijo: 'LTB' },
      select: { id: true },
    });
    subtipoA = await prisma.subtipo.create({
      data: { empresaId: empresaA.id, tipoId: tipoA.id, nombre: `B3 LP Subtipo A ${s}`, prefijo: 'LXA' },
      select: { id: true },
    });
    subtipoB = await prisma.subtipo.create({
      data: { empresaId: empresaB.id, tipoId: tipoB.id, nombre: `B3 LP Subtipo B ${s}`, prefijo: 'LXB' },
      select: { id: true },
    });

    productoA = await prisma.producto.create({
      data: baseProducto(empresaA.id, familiaA.id, subfamiliaA.id, tipoA.id, subtipoA.id, `B3LPA${s}`),
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: baseProducto(empresaB.id, familiaB.id, subfamiliaB.id, tipoB.id, subtipoB.id, `B3LPB${s}`),
      select: { id: true },
    });

    loteUpdateA = await prisma.lote.create({
      data: loteData(empresaA.id, productoA.id, `LP-UPD-${s}`),
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.lote.deleteMany({
      where: { empresaId: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.producto.deleteMany({ where: { id: { in: [productoA.id, productoB.id] } } });
    await prisma.subtipo.deleteMany({ where: { id: { in: [subtipoA.id, subtipoB.id] } } });
    await prisma.tipo.deleteMany({ where: { id: { in: [tipoA.id, tipoB.id] } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: [subfamiliaA.id, subfamiliaB.id] } } });
    await prisma.familia.deleteMany({ where: { id: { in: [familiaA.id, familiaB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [empresaA.id, empresaB.id] } } });
    await prisma.$disconnect();
  });

  it('LP-01: same-Business Producto reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const created = await db.lote.create({
      data: loteData(empresaA.id, productoA.id, `LP-01-${suffix}`),
      select: { empresaId: true, productoId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.productoId).toBe(productoA.id);
  });

  it('LP-02: cross-Business Producto reference rejects without persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.lote.create({ data: loteData(empresaA.id, productoB.id, `LP-02-${suffix}`) }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({ where: { productoId: productoB.id, empresaId: empresaA.id } }),
    ).toBe(0);
  });

  it('LP-03: update cannot switch an existing Lote to another Business Producto', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.lote.update({
        where: { id: loteUpdateA.id },
        data: { productoId: productoB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.lote.findUnique({
      where: { id: loteUpdateA.id },
      select: { productoId: true, empresaId: true },
    });
    expect(persisted?.productoId).toBe(productoA.id);
    expect(persisted?.empresaId).toBe(empresaA.id);
  });

  it('LP-04: cross-Business Producto reference rejects inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.$transaction(async (tx) => {
        await tx.lote.create({ data: loteData(empresaA.id, productoB.id, `LP-04-${suffix}`) });
      }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({ where: { productoId: productoB.id, empresaId: empresaA.id } }),
    ).toBe(0);
  });

  it('LP-05: a rejected cross-Business Lote rolls back the valid Lote of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.$transaction(async (tx) => {
        await tx.lote.create({ data: loteData(empresaA.id, productoA.id, `LP-05-OK-${suffix}`) });
        await tx.lote.create({ data: loteData(empresaA.id, productoB.id, `LP-05-BAD-${suffix}`) });
      }),
    ).rejects.toThrow();

    expect(
      await prisma.lote.count({
        where: { numeroLote: { in: [`LP-05-OK-${suffix}`, `LP-05-BAD-${suffix}`] } },
      }),
    ).toBe(0);
  });

  it('LP-06: nonexistent Producto reference fails closed without persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.lote.create({
        data: loteData(empresaA.id, `no-existe-${suffix}`, `LP-06-${suffix}`),
      }),
    ).rejects.toThrow();

    expect(await prisma.lote.count({ where: { numeroLote: `LP-06-${suffix}` } })).toBe(0);
  });

  it('LP-07: same-Business Producto reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const created = await db.$transaction(async (tx) =>
      tx.lote.create({
        data: loteData(empresaA.id, productoA.id, `LP-07-${suffix}`),
        select: { id: true },
      }),
    );

    const persisted = await prisma.lote.findUnique({
      where: { id: created.id },
      select: { empresaId: true, productoId: true },
    });
    expect(persisted?.empresaId).toBe(empresaA.id);
    expect(persisted?.productoId).toBe(productoA.id);
  });

  it('LP-08: createMany with a cross-Business Producto rejects without partial persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.lote.createMany({
        data: [
          loteData(empresaA.id, productoA.id, `LP-08-OK-${suffix}`),
          loteData(empresaA.id, productoB.id, `LP-08-BAD-${suffix}`),
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
