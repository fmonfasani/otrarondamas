import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 tenant isolation — execution candidates', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);

    const suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 Exec A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 Exec B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 User A',
        email: `b3-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    usuarioB = await prisma.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 User B',
        email: `b3-user-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    productoA = await prisma.producto.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 Product A',
        precio: 10,
        stock: 10,
      },
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Product B',
        precio: 20,
        stock: 10,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    if (!empresaA || !empresaB) {
      await prisma.$disconnect();
      return;
    }

    await prisma.ventaItem.deleteMany({
      where: { venta: { empresaId: { in: [empresaA.id, empresaB.id] } } },
    });
    await prisma.venta.deleteMany({
      where: { empresaId: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.producto.deleteMany({
      where: { id: { in: [productoA.id, productoB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioA.id, usuarioB.id] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.$disconnect();
  });

  it('TE-ID-006: server Business context overrides a client empresaId', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    const created = await db.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Override',
        email: `b3-override-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
  });

  it('TE-ID-008: a Business A record is not returned through Business B context', async () => {
    const db = scopedPrisma.forEmpresa(empresaB.id);

    const result = await db.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { id: true, empresaId: true },
    });

    expect(result).toBeNull();
  });

  it('TE-ID-009: update through another Business does not mutate the target record', async () => {
    const db = scopedPrisma.forEmpresa(empresaB.id);

    await db.usuario.updateMany({
      where: { id: usuarioA.id },
      data: { nombre: 'SHOULD-NOT-CHANGE' },
    });

    const persisted = await prisma.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: empresaA.id,
    });
  });

  it('TE-B3-001: nested relation identifiers cannot link Business A to a Business B product', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.venta.create({
        data: {
          usuarioId: usuarioA.id,
          estado: 'CONFIRMADA',
          canal: 'b3-test',
          total: 20,
          ventaItems: {
            create: {
              productoId: productoB.id,
              cantidad: 1,
              precioUnitario: 20,
            },
          },
        },
        include: { ventaItems: true },
      }),
    ).rejects.toThrow();

    const crossBusinessItems = await prisma.ventaItem.count({
      where: {
        productoId: productoB.id,
        venta: { empresaId: empresaA.id },
      },
    });

    expect(crossBusinessItems).toBe(0);
  });

  it('TE-B3-006: Business scope survives an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const email = `b3-tx-${Date.now()}@example.test`;

    await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          empresaId: empresaB.id,
          nombre: 'B3 Transaction',
          email,
        },
        select: { id: true, empresaId: true },
      });

      expect(created.empresaId).toBe(empresaA.id);

      const hidden = await tx.usuario.findUnique({
        where: { id: usuarioB.id },
        select: { id: true, empresaId: true },
      });

      expect(hidden).toBeNull();
    });

    const persisted = await prisma.usuario.findUnique({
      where: { email },
      select: { empresaId: true },
    });

    expect(persisted?.empresaId).toBe(empresaA.id);
  });

  it('TE-B3-007: unsupported persistence operations fail closed', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.usuario.upsert({
        where: { id: usuarioA.id },
        update: { nombre: 'SHOULD-NOT-CHANGE' },
        create: {
          empresaId: empresaB.id,
          nombre: 'SHOULD-NOT-CREATE',
          email: `b3-upsert-${Date.now()}@example.test`,
        },
      }),
    ).rejects.toThrow(/no tiene manejo de aislamiento/);

    const persisted = await prisma.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: empresaA.id,
    });
  });
});
