import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const IDS = {
  empresas: [] as string[],
  familias: [] as string[],
  subfamilias: [] as string[],
  tipos: [] as string[],
  subtipos: [] as string[],
};

describe('B3 relation isolation — DevolucionProveedorItem ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let supplierA: { id: string };
  let supplierB: { id: string };
  let purchaseA: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let batchA: { id: string };
  let batchB: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);

    const suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 Devolucion A ${suffix}`, slug: `b3-devolucion-proveedor-item-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 Devolucion B ${suffix}`, slug: `b3-devolucion-proveedor-item-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    userA = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Devolucion User A',
        email: `b3-devolucion-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 Devolucion Proveedor A ${suffix}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `B3 Devolucion Proveedor B ${suffix}` },
      select: { id: true },
    });

    const familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `B3 Devolucion Familia A ${suffix}`, prefijo: 'BDA' },
      select: { id: true },
    });
    const subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 Devolucion Subfamilia A ${suffix}`,
        prefijo: 'BSA',
      },
      select: { id: true },
    });
    IDS.subfamilias.push(subfamilyA.id);
    const typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 Devolucion Tipo A ${suffix}`,
        prefijo: 'BTA',
      },
      select: { id: true },
    });
    IDS.tipos.push(typeA.id);
    const subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 Devolucion Subtipo A ${suffix}`,
        prefijo: 'BXA',
      },
      select: { id: true },
    });
    IDS.subtipos.push(subtypeA.id);

    const familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `B3 Devolucion Familia B ${suffix}`, prefijo: 'BDB' },
      select: { id: true },
    });
    IDS.familias.push(familyB.id);

    const subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `B3 Devolucion Subfamilia B ${suffix}`,
        prefijo: 'BSB',
      },
      select: { id: true },
    });
    IDS.subfamilias.push(subfamilyB.id);
    const typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `B3 Devolucion Tipo B ${suffix}`,
        prefijo: 'BTB',
      },
      select: { id: true },
    });
    IDS.tipos.push(typeB.id);
    const subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `B3 Devolucion Subtipo B ${suffix}`,
        prefijo: 'BXB',
      },
      select: { id: true },
    });
    IDS.subtipos.push(subtypeB.id);

    productA = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Devolucion Product A',
        codigoInterno: `B3DPA${suffix}`,
        familiaId: familyA.id,
        subfamiliaId: subfamilyA.id,
        tipoId: typeA.id,
        subtipoId: subtypeA.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Devolucion Product B',
        codigoInterno: `B3DPB${suffix}`,
        familiaId: familyB.id,
        subfamiliaId: subfamilyB.id,
        tipoId: typeB.id,
        subtipoId: subtypeB.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    purchaseA = await prisma.compra.create({
      data: {
        empresaId: companyA.id,
        proveedorId: supplierA.id,
        usuarioId: userA.id,
        estado: 'BORRADOR',
        total: 10,
      },
      select: { id: true },
    });

    batchA = await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA.id,
        numeroLote: `B3DLA${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
    batchB = await prisma.lote.create({
      data: {
        empresaId: companyB.id,
        productoId: productB.id,
        numeroLote: `B3DLB${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.devolucionProveedorItem.deleteMany({
      where: { devolucion: { empresaId: companyA.id } },
    });
    await prisma.devolucionProveedor.deleteMany({ where: { empresaId: companyA.id } });
    await prisma.lote.deleteMany({
      where: { id: { in: [batchA?.id, batchB?.id].filter(Boolean) as string[] } },
    });
    await prisma.compra.deleteMany({ where: { id: purchaseA?.id } });
    await prisma.producto.deleteMany({
      where: { id: { in: [productA?.id, productB?.id].filter(Boolean) as string[] } },
    });
    await prisma.subtipo.deleteMany({ where: { id: { in: IDS.subtipos } } });
    await prisma.tipo.deleteMany({ where: { id: { in: IDS.tipos } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: IDS.subfamilias } } });
    await prisma.familia.deleteMany({ where: { id: { in: IDS.familias } } });
    await prisma.proveedor.deleteMany({
      where: { id: { in: [supplierA?.id, supplierB?.id].filter(Boolean) as string[] } },
    });
    await prisma.usuario.deleteMany({ where: { id: userA?.id } });
    // CI uses a disposable database; we do not force deletion of Empresa if
    // the catalog leaves auxiliary references.
    await prisma.$disconnect();
  });

  const baseReturn = (reason: string) => ({
    empresaId: companyA.id,
    compraId: purchaseA.id,
    proveedorId: supplierA.id,
    usuarioId: userA.id,
    motivo: reason,
  });

  const itemOf = (productId: string, batchId: string | null = null) => ({
    productoId: productId,
    loteId: batchId,
    cantidad: 1,
    costoUnitario: 10,
  });

  it('D-01: same-Business product and lote persist through nested DevolucionProveedor.create', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    const created = await db.devolucionProveedor.create({
      data: {
        ...baseReturn('gdp-positive'),
        items: { create: [itemOf(productA.id, batchA.id)] },
      },
      include: { items: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.items).toHaveLength(1);
    expect(created.items[0].productoId).toBe(productA.id);
    expect(created.items[0].loteId).toBe(batchA.id);
  });

  it('D-02: nested create cannot link Business A to Product B', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...baseReturn('gdp-product-b'),
          items: { create: [itemOf(productB.id)] },
        },
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-product-b' } })).toBe(0);
  });

  it('D-03: nested create cannot link Business A to Lote B', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...baseReturn('gdp-lote-b'),
          items: { create: [itemOf(productA.id, batchB.id)] },
        },
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-lote-b' } })).toBe(0);
  });

  it('D-04: direct DevolucionProveedorItem.create cannot link Product B', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const returnRecord = await prisma.devolucionProveedor.create({
      data: baseReturn('gdp-direct-product'),
      select: { id: true },
    });

    await expect(
      db.devolucionProveedorItem.create({
        data: {
          devolucionId: returnRecord.id,
          ...itemOf(productB.id),
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedorItem.count({ where: { devolucionId: returnRecord.id } }),
    ).toBe(0);
  });

  it('D-05: direct DevolucionProveedorItem.createMany cannot link Lote B', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const returnRecord = await prisma.devolucionProveedor.create({
      data: baseReturn('gdp-direct-lote'),
      select: { id: true },
    });

    await expect(
      db.devolucionProveedorItem.createMany({
        data: [{ devolucionId: returnRecord.id, ...itemOf(productA.id, batchB.id) }],
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedorItem.count({ where: { devolucionId: returnRecord.id } }),
    ).toBe(0);
  });

  it('D-06: one cross-Business item rejects the whole mixed nested DevolucionProveedor', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...baseReturn('gdp-mixed'),
          items: {
            create: [itemOf(productA.id, batchA.id), itemOf(productB.id)],
          },
        },
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-mixed' } })).toBe(0);
  });

  it('D-07: relation isolation applies inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.$transaction(async (tx) => {
        await tx.devolucionProveedor.create({
          data: {
            ...baseReturn('gdp-tx-negative'),
            items: { create: [itemOf(productB.id)] },
          },
        });
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-tx-negative' } })).toBe(
      0,
    );

    await db.$transaction(async (tx) => {
      await tx.devolucionProveedor.create({
        data: {
          ...baseReturn('gdp-tx-positive'),
          items: { create: [itemOf(productA.id, batchA.id)] },
        },
      });
    });

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-tx-positive' } })).toBe(
      1,
    );
  });
});
