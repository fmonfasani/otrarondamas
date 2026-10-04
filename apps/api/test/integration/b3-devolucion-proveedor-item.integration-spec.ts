import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const IDS = { empresas: [] as string[], familias: [] as string[], subfamilias: [] as string[], tipos: [] as string[], subtipos: [] as string[] };

describe('B3 relation isolation — DevolucionProveedorItem ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let proveedorA: { id: string };
  let proveedorB: { id: string };
  let compraA: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let loteA: { id: string };
  let loteB: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);

    const suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 Devolucion A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 Devolucion B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 Devolucion User A',
        email: `b3-devolucion-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    proveedorA = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 Devolucion Proveedor A ${suffix}` },
      select: { id: true },
    });
    proveedorB = await prisma.proveedor.create({
      data: { empresaId: empresaB.id, nombre: `B3 Devolucion Proveedor B ${suffix}` },
      select: { id: true },
    });

    const familiaA = await prisma.familia.create({
      data: { empresaId: empresaA.id, nombre: `B3 Devolucion Familia A ${suffix}`, prefijo: 'BDA' },
      select: { id: true },
    });
    const subfamiliaA = await prisma.subfamilia.create({
      data: {
        empresaId: empresaA.id,
        familiaId: familiaA.id,
        nombre: `B3 Devolucion Subfamilia A ${suffix}`,
        prefijo: 'BSA',
      },
      select: { id: true },
    });
    IDS.subfamilias.push(subfamiliaA.id);
    const tipoA = await prisma.tipo.create({
      data: {
        empresaId: empresaA.id,
        subfamiliaId: subfamiliaA.id,
        nombre: `B3 Devolucion Tipo A ${suffix}`,
        prefijo: 'BTA',
      },
      select: { id: true },
    });
    IDS.tipos.push(tipoA.id);
    const subtipoA = await prisma.subtipo.create({
      data: {
        empresaId: empresaA.id,
        tipoId: tipoA.id,
        nombre: `B3 Devolucion Subtipo A ${suffix}`,
        prefijo: 'BXA',
      },
      select: { id: true },
    });
    IDS.subtipos.push(subtipoA.id);

    const familiaB = await prisma.familia.create({
      data: { empresaId: empresaB.id, nombre: `B3 Devolucion Familia B ${suffix}`, prefijo: 'BDB' },
      select: { id: true },
    });
    IDS.familias.push(familiaB.id);

    const subfamiliaB = await prisma.subfamilia.create({
      data: {
        empresaId: empresaB.id,
        familiaId: familiaB.id,
        nombre: `B3 Devolucion Subfamilia B ${suffix}`,
        prefijo: 'BSB',
      },
      select: { id: true },
    });
    IDS.subfamilias.push(subfamiliaB.id);
    const tipoB = await prisma.tipo.create({
      data: {
        empresaId: empresaB.id,
        subfamiliaId: subfamiliaB.id,
        nombre: `B3 Devolucion Tipo B ${suffix}`,
        prefijo: 'BTB',
      },
      select: { id: true },
    });
    IDS.tipos.push(tipoB.id);
    const subtipoB = await prisma.subtipo.create({
      data: {
        empresaId: empresaB.id,
        tipoId: tipoB.id,
        nombre: `B3 Devolucion Subtipo B ${suffix}`,
        prefijo: 'BXB',
      },
      select: { id: true },
    });
    IDS.subtipos.push(subtipoB.id);

    productoA = await prisma.producto.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 Devolucion Product A',
        codigoInterno: `B3DPA${suffix}`,
        familiaId: familiaA.id,
        subfamiliaId: subfamiliaA.id,
        tipoId: tipoA.id,
        subtipoId: subtipoA.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Devolucion Product B',
        codigoInterno: `B3DPB${suffix}`,
        familiaId: familiaB.id,
        subfamiliaId: subfamiliaB.id,
        tipoId: tipoB.id,
        subtipoId: subtipoB.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    compraA = await prisma.compra.create({
      data: {
        empresaId: empresaA.id,
        proveedorId: proveedorA.id,
        usuarioId: usuarioA.id,
        estado: 'BORRADOR',
        total: 10,
      },
      select: { id: true },
    });

    loteA = await prisma.lote.create({
      data: {
        empresaId: empresaA.id,
        productoId: productoA.id,
        numeroLote: `B3DLA${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
    loteB = await prisma.lote.create({
      data: {
        empresaId: empresaB.id,
        productoId: productoB.id,
        numeroLote: `B3DLB${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.devolucionProveedorItem.deleteMany({ where: { devolucion: { empresaId: empresaA.id } } });
    await prisma.devolucionProveedor.deleteMany({ where: { empresaId: empresaA.id } });
    await prisma.lote.deleteMany({ where: { id: { in: [loteA?.id, loteB?.id].filter(Boolean) as string[] } } });
    await prisma.compra.deleteMany({ where: { id: compraA?.id } });
    await prisma.producto.deleteMany({ where: { id: { in: [productoA?.id, productoB?.id].filter(Boolean) as string[] } } });
    await prisma.subtipo.deleteMany({ where: { id: { in: IDS.subtipos } } });
    await prisma.tipo.deleteMany({ where: { id: { in: IDS.tipos } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: IDS.subfamilias } } });
    await prisma.familia.deleteMany({ where: { id: { in: IDS.familias } } });
    await prisma.proveedor.deleteMany({ where: { id: { in: [proveedorA?.id, proveedorB?.id].filter(Boolean) as string[] } } });
    await prisma.usuario.deleteMany({ where: { id: usuarioA?.id } });
    await prisma.empresa.deleteMany({ where: { id: { in: [empresaA?.id, empresaB?.id].filter(Boolean) as string[] } } });
    await prisma.$disconnect();
  });

  const devolucionBase = (motivo: string) => ({
    empresaId: empresaA.id,
    compraId: compraA.id,
    proveedorId: proveedorA.id,
    usuarioId: usuarioA.id,
    motivo,
  });

  const itemDe = (productoId: string, loteId: string | null = null) => ({
    productoId,
    loteId,
    cantidad: 1,
    costoUnitario: 10,
  });

  it('D-01: same-Business product and lote persist through nested DevolucionProveedor.create', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    const created = await db.devolucionProveedor.create({
      data: {
        ...devolucionBase('gdp-positive'),
        items: { create: [itemDe(productoA.id, loteA.id)] },
      },
      include: { items: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.items).toHaveLength(1);
    expect(created.items[0].productoId).toBe(productoA.id);
    expect(created.items[0].loteId).toBe(loteA.id);
  });

  it('D-02: nested create cannot link Business A to Product B', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...devolucionBase('gdp-product-b'),
          items: { create: [itemDe(productoB.id)] },
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-product-b' } }),
    ).toBe(0);
  });

  it('D-03: nested create cannot link Business A to Lote B', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...devolucionBase('gdp-lote-b'),
          items: { create: [itemDe(productoA.id, loteB.id)] },
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-lote-b' } }),
    ).toBe(0);
  });

  it('D-04: direct DevolucionProveedorItem.create cannot link Product B', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const devolucion = await prisma.devolucionProveedor.create({
      data: devolucionBase('gdp-direct-product'),
      select: { id: true },
    });

    await expect(
      db.devolucionProveedorItem.create({
        data: {
          devolucionId: devolucion.id,
          ...itemDe(productoB.id),
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedorItem.count({ where: { devolucionId: devolucion.id } }),
    ).toBe(0);
  });

  it('D-05: direct DevolucionProveedorItem.createMany cannot link Lote B', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const devolucion = await prisma.devolucionProveedor.create({
      data: devolucionBase('gdp-direct-lote'),
      select: { id: true },
    });

    await expect(
      db.devolucionProveedorItem.createMany({
        data: [{ devolucionId: devolucion.id, ...itemDe(productoA.id, loteB.id) }],
      }),
    ).rejects.toThrow();

    expect(
      await prisma.devolucionProveedorItem.count({ where: { devolucionId: devolucion.id } }),
    ).toBe(0);
  });

  it('D-06: one cross-Business item rejects the whole mixed nested DevolucionProveedor', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.devolucionProveedor.create({
        data: {
          ...devolucionBase('gdp-mixed'),
          items: {
            create: [itemDe(productoA.id, loteA.id), itemDe(productoB.id)],
          },
        },
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-mixed' } })).toBe(0);
  });

  it('D-07: relation isolation applies inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.$transaction(async (tx) => {
        await tx.devolucionProveedor.create({
          data: {
            ...devolucionBase('gdp-tx-negative'),
            items: { create: [itemDe(productoB.id)] },
          },
        });
      }),
    ).rejects.toThrow();

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-tx-negative' } })).toBe(0);

    await db.$transaction(async (tx) => {
      await tx.devolucionProveedor.create({
        data: {
          ...devolucionBase('gdp-tx-positive'),
          items: { create: [itemDe(productoA.id, loteA.id)] },
        },
      });
    });

    expect(await prisma.devolucionProveedor.count({ where: { motivo: 'gdp-tx-positive' } })).toBe(1);
  });
});
