import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ProductoProveedor ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let proveedorA: { id: string };
  let proveedorB: { id: string };
  let proveedorA5: { id: string };
  let proveedorA6: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let subfamiliaA: { id: string };
  let tipoA: { id: string };
  let subtipoA: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };
  let subfamiliaB: { id: string };
  let tipoB: { id: string };
  let subtipoB: { id: string };

  const baseProducto = (
    empresaId: string,
    familiaId: string,
    subfamiliaId: string,
    tipoId: string,
    subtipoId: string,
    codigoInterno: string,
  ) => ({
    empresaId,
    nombre: `B3 PP ${codigoInterno}`,
    codigoInterno,
    familiaId,
    subfamiliaId,
    tipoId,
    subtipoId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const relacionData = (
    empresaId: string,
    productoId: string,
    proveedorId: string,
  ) => ({
    empresaId,
    productoId,
    proveedorId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    const s = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 PP A ${s}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 PP B ${s}`, configuracion: {} },
      select: { id: true },
    });

    familiaA = await prisma.familia.create({
      data: { empresaId: empresaA.id, nombre: `B3 PP Familia A ${s}`, prefijo: 'PPA' },
      select: { id: true },
    });
    familiaB = await prisma.familia.create({
      data: { empresaId: empresaB.id, nombre: `B3 PP Familia B ${s}`, prefijo: 'PPB' },
      select: { id: true },
    });

    subfamiliaA = await prisma.subfamilia.create({
      data: { empresaId: empresaA.id, familiaId: familiaA.id, nombre: `B3 PP Sub A ${s}`, prefijo: 'PSA' },
      select: { id: true },
    });
    tipoA = await prisma.tipo.create({
      data: { empresaId: empresaA.id, subfamiliaId: subfamiliaA.id, nombre: `B3 PP Tipo A ${s}`, prefijo: 'PTA' },
      select: { id: true },
    });
    subtipoA = await prisma.subtipo.create({
      data: { empresaId: empresaA.id, tipoId: tipoA.id, nombre: `B3 PP Subtipo A ${s}`, prefijo: 'PXA' },
      select: { id: true },
    });

    subfamiliaB = await prisma.subfamilia.create({
      data: { empresaId: empresaB.id, familiaId: familiaB.id, nombre: `B3 PP Sub B ${s}`, prefijo: 'PSB' },
      select: { id: true },
    });
    tipoB = await prisma.tipo.create({
      data: { empresaId: empresaB.id, subfamiliaId: subfamiliaB.id, nombre: `B3 PP Tipo B ${s}`, prefijo: 'PTB' },
      select: { id: true },
    });
    subtipoB = await prisma.subtipo.create({
      data: { empresaId: empresaB.id, tipoId: tipoB.id, nombre: `B3 PP Subtipo B ${s}`, prefijo: 'PXB' },
      select: { id: true },
    });

    proveedorA = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 PP Proveedor A ${s}` },
      select: { id: true },
    });
    proveedorB = await prisma.proveedor.create({
      data: { empresaId: empresaB.id, nombre: `B3 PP Proveedor B ${s}` },
      select: { id: true },
    });
    proveedorA5 = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 PP Proveedor A PP-05 ${s}` },
      select: { id: true },
    });
    proveedorA6 = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 PP Proveedor A PP-06 ${s}` },
      select: { id: true },
    });

    productoA = await prisma.producto.create({
      data: baseProducto(empresaA.id, familiaA.id, subfamiliaA.id, tipoA.id, subtipoA.id, `B3PPA${s}`),
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: baseProducto(empresaB.id, familiaB.id, subfamiliaB.id, tipoB.id, subtipoB.id, `B3PPB${s}`),
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.productoProveedor.deleteMany({
      where: { OR: [{ productoId: productoA.id }, { productoId: productoB.id }] },
    });
    await prisma.producto.deleteMany({ where: { id: { in: [productoA.id, productoB.id] } } });
    await prisma.proveedor.deleteMany({
      where: { id: { in: [proveedorA.id, proveedorB.id, proveedorA5.id, proveedorA6.id] } },
    });
    await prisma.subtipo.deleteMany({ where: { id: { in: [subtipoA.id, subtipoB.id] } } });
    await prisma.tipo.deleteMany({ where: { id: { in: [tipoA.id, tipoB.id] } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: [subfamiliaA.id, subfamiliaB.id] } } });
    await prisma.familia.deleteMany({ where: { id: { in: [familiaA.id, familiaB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [empresaA.id, empresaB.id] } } });
    await prisma.$disconnect();
  });

  it('PP-01: same-Business Producto + Proveedor reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const created = await db.productoProveedor.create({
      data: relacionData(empresaA.id, productoA.id, proveedorA.id),
      select: { empresaId: true, productoId: true, proveedorId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.productoId).toBe(productoA.id);
    expect(created.proveedorId).toBe(proveedorA.id);
  });

  it('PP-02: cross-Business Producto reference rejects without persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.productoProveedor.create({
        data: relacionData(empresaA.id, productoB.id, proveedorA.id),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.productoProveedor.count({
        where: { empresaId: empresaA.id, productoId: productoB.id, proveedorId: proveedorA.id },
      }),
    ).toBe(0);
  });

  it('PP-03: cross-Business Proveedor reference rejects without persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    await expect(
      db.productoProveedor.create({
        data: relacionData(empresaA.id, productoA.id, proveedorB.id),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.productoProveedor.count({
        where: { empresaId: empresaA.id, productoId: productoA.id, proveedorId: proveedorB.id },
      }),
    ).toBe(0);
  });

  it('PP-04: cross-Business references reject inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.$transaction(async (tx) => {
        await tx.productoProveedor.create({
          data: relacionData(empresaA.id, productoB.id, proveedorA.id),
        });
      }),
    ).rejects.toThrow();

    await expect(
      db.$transaction(async (tx) => {
        await tx.productoProveedor.create({
          data: relacionData(empresaA.id, productoA.id, proveedorB.id),
        });
      }),
    ).rejects.toThrow();

    expect(
      await prisma.productoProveedor.count({ where: { empresaId: empresaA.id } }),
    ).toBe(1);
  });

  it('PP-05: update cannot switch an existing relation to another Business Producto', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const relation = await db.productoProveedor.create({
      data: relacionData(empresaA.id, productoA.id, proveedorA5.id),
      select: { id: true },
    });

    await expect(
      db.productoProveedor.update({
        where: { id: relation.id },
        data: { productoId: productoB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.productoProveedor.findUnique({
      where: { id: relation.id },
      select: { productoId: true, proveedorId: true },
    });

    expect(persisted?.productoId).toBe(productoA.id);
    expect(persisted?.proveedorId).toBe(proveedorA5.id);
  });

  it('PP-06: update cannot switch an existing relation to another Business Proveedor', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const relation = await db.productoProveedor.create({
      data: relacionData(empresaA.id, productoA.id, proveedorA6.id),
      select: { id: true },
    });

    await expect(
      db.productoProveedor.update({
        where: { id: relation.id },
        data: { proveedorId: proveedorB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.productoProveedor.findUnique({
      where: { id: relation.id },
      select: { productoId: true, proveedorId: true },
    });

    expect(persisted?.productoId).toBe(productoA.id);
    expect(persisted?.proveedorId).toBe(proveedorA6.id);
  });
});
