import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ProductoProveedor ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };
  let supplierA: { id: string };
  let supplierB: { id: string };
  let supplierA5: { id: string };
  let supplierA6: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let subfamilyA: { id: string };
  let typeA: { id: string };
  let subtypeA: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };
  let subfamilyB: { id: string };
  let typeB: { id: string };
  let subtypeB: { id: string };

  const baseProduct = (
    companyId: string,
    familyId: string,
    subfamilyId: string,
    typeId: string,
    subtypeId: string,
    internalCode: string,
  ) => ({
    empresaId: companyId,
    nombre: `B3 PP ${internalCode}`,
    codigoInterno: internalCode,
    familiaId: familyId,
    subfamiliaId: subfamilyId,
    tipoId: typeId,
    subtipoId: subtypeId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const relationData = (companyId: string, productId: string, supplierId: string) => ({
    empresaId: companyId,
    productoId: productId,
    proveedorId: supplierId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    const s = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 PP A ${s}`, slug: `b3-producto-proveedor-a-${s}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 PP B ${s}`, slug: `b3-producto-proveedor-b-${s}`, configuracion: {} },
      select: { id: true },
    });

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `B3 PP Familia A ${s}`, prefijo: 'PPA' },
      select: { id: true },
    });
    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `B3 PP Familia B ${s}`, prefijo: 'PPB' },
      select: { id: true },
    });

    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 PP Sub A ${s}`,
        prefijo: 'PSA',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 PP Tipo A ${s}`,
        prefijo: 'PTA',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 PP Subtipo A ${s}`,
        prefijo: 'PXA',
      },
      select: { id: true },
    });

    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `B3 PP Sub B ${s}`,
        prefijo: 'PSB',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `B3 PP Tipo B ${s}`,
        prefijo: 'PTB',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `B3 PP Subtipo B ${s}`,
        prefijo: 'PXB',
      },
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 PP Proveedor A ${s}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `B3 PP Proveedor B ${s}` },
      select: { id: true },
    });
    supplierA5 = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 PP Proveedor A PP-05 ${s}` },
      select: { id: true },
    });
    supplierA6 = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 PP Proveedor A PP-06 ${s}` },
      select: { id: true },
    });

    productA = await prisma.producto.create({
      data: baseProduct(companyA.id, familyA.id, subfamilyA.id, typeA.id, subtypeA.id, `B3PPA${s}`),
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: baseProduct(companyB.id, familyB.id, subfamilyB.id, typeB.id, subtypeB.id, `B3PPB${s}`),
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.productoProveedor.deleteMany({
      where: { OR: [{ productoId: productA.id }, { productoId: productB.id }] },
    });
    await prisma.producto.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
    await prisma.proveedor.deleteMany({
      where: { id: { in: [supplierA.id, supplierB.id, supplierA5.id, supplierA6.id] } },
    });
    await prisma.subtipo.deleteMany({ where: { id: { in: [subtypeA.id, subtypeB.id] } } });
    await prisma.tipo.deleteMany({ where: { id: { in: [typeA.id, typeB.id] } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: [subfamilyA.id, subfamilyB.id] } } });
    await prisma.familia.deleteMany({ where: { id: { in: [familyA.id, familyB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
  });

  it('PP-01: same-Business Producto + Proveedor reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const created = await db.productoProveedor.create({
      data: relationData(companyA.id, productA.id, supplierA.id),
      select: { empresaId: true, productoId: true, proveedorId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.productoId).toBe(productA.id);
    expect(created.proveedorId).toBe(supplierA.id);
  });

  it('PP-02: cross-Business Producto reference rejects without persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.productoProveedor.create({
        data: relationData(companyA.id, productB.id, supplierA.id),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.productoProveedor.count({
        where: { empresaId: companyA.id, productoId: productB.id, proveedorId: supplierA.id },
      }),
    ).toBe(0);
  });

  it('PP-03: cross-Business Proveedor reference rejects without persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    await expect(
      db.productoProveedor.create({
        data: relationData(companyA.id, productA.id, supplierB.id),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.productoProveedor.count({
        where: { empresaId: companyA.id, productoId: productA.id, proveedorId: supplierB.id },
      }),
    ).toBe(0);
  });

  it('PP-04: cross-Business references reject inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.$transaction(async (tx) => {
        await tx.productoProveedor.create({
          data: relationData(companyA.id, productB.id, supplierA.id),
        });
      }),
    ).rejects.toThrow();

    await expect(
      db.$transaction(async (tx) => {
        await tx.productoProveedor.create({
          data: relationData(companyA.id, productA.id, supplierB.id),
        });
      }),
    ).rejects.toThrow();

    expect(await prisma.productoProveedor.count({ where: { empresaId: companyA.id } })).toBe(1);
  });

  it('PP-05: update cannot switch an existing relation to another Business Producto', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const relation = await db.productoProveedor.create({
      data: relationData(companyA.id, productA.id, supplierA5.id),
      select: { id: true },
    });

    await expect(
      db.productoProveedor.update({
        where: { id: relation.id },
        data: { productoId: productB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.productoProveedor.findUnique({
      where: { id: relation.id },
      select: { productoId: true, proveedorId: true },
    });

    expect(persisted?.productoId).toBe(productA.id);
    expect(persisted?.proveedorId).toBe(supplierA5.id);
  });

  it('PP-06: update cannot switch an existing relation to another Business Proveedor', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const relation = await db.productoProveedor.create({
      data: relationData(companyA.id, productA.id, supplierA6.id),
      select: { id: true },
    });

    await expect(
      db.productoProveedor.update({
        where: { id: relation.id },
        data: { proveedorId: supplierB.id },
      }),
    ).rejects.toThrow();

    const persisted = await prisma.productoProveedor.findUnique({
      where: { id: relation.id },
      select: { productoId: true, proveedorId: true },
    });

    expect(persisted?.productoId).toBe(productA.id);
    expect(persisted?.proveedorId).toBe(supplierA6.id);
  });
});
