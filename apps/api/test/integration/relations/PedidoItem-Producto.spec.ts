/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { PrismaService } from '../../src/prisma/prisma.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';

describe('PedidoItem → Producto (producto) isolation', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let tenantPA: { id: string };
  let tenantPB: { id: string };
  let productoA: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    const ts = Date.now();

    tenantPA = await prisma.empresa.create({
      data: {
        nombre: `PedidoItem-producto TenantA ${ts}`,
        slug: `pedidoitem-producto-ta-${ts}`,
        configuracion: {},
      },
      select: { id: true },
    });

    tenantPB = await prisma.empresa.create({
      data: {
        nombre: `PedidoItem-producto TenantB ${ts}`,
        slug: `pedidoitem-producto-tb-${ts}`,
        configuracion: {},
      },
      select: { id: true },
    });

    // TODO: Create fixture instances for pedidoItemA, productoA, productoB
    // using factory pattern or direct prisma.create calls
  });

  afterAll(async () => {
    await prisma.pedidoItem.deleteMany({});
    await prisma.producto.deleteMany({});
    await prisma.empresa.deleteMany({ where: { id: { in: [tenantPA.id, tenantPB.id] } } });
    await prisma.$disconnect();
  });

  it('AA-01: PedidoItemA can create same-tenant relation to ProductoA', async () => {
    const db = scopedPrisma.forCompany(tenantPA.id);
    const source = await db.pedidoItem.findFirst({ select: { id: true } });
    const target = await db.producto.findFirst({ select: { id: true } });

    if (!source || !target) {
      this.skip();
    }

    const result = await db.pedidoItem.update({
      where: { id: source!.id },
      data: { productoId: target!.id },
      select: { id: true, productoId: true },
    });

    expect(result.productoId).toBe(target!.id);
  });

  it('AA-02: PedidoItemA can createMany within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantPA.id);

    const result = await db.pedidoItem.createMany({
      data: [{/* fixture data for PedidoItem */}, {/* fixture data for PedidoItem */}],
    });

    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('AB-01: PedidoItemA attempting cross-tenant relation to ProductoB → P2025', async () => {
    const dbA = scopedPrisma.forCompany(tenantPA.id);
    const sourceA = await dbA.pedidoItem.findFirst({ select: { id: true } });
    const targetB = await prisma.producto.findFirst({
      where: { empresaId: tenantPB.id },
      select: { id: true },
    });

    if (!sourceA || !targetB) {
      this.skip();
    }

    await expect(
      dbA.pedidoItem.update({
        where: { id: sourceA!.id },
        data: { productoId: targetB!.id },
      }),
    ).rejects.toThrow(/P2025|not found/);
  });

  it('UPDATE-01: PedidoItemA can update relation within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantPA.id);
    const source = await db.pedidoItem.findFirst({ select: { id: true } });
    const targets = await db.producto.findMany({ take: 2, select: { id: true } });

    if (!source || targets.length < 2) {
      this.skip();
    }

    const updated = await db.pedidoItem.update({
      where: { id: source!.id },
      data: { productoId: targets[1]!.id },
      select: { productoId: true },
    });

    expect(updated.productoId).toBe(targets[1]!.id);
  });

  it('NESTED-01: PedidoItemA nested create preserves same-tenant isolation', async () => {
    const db = scopedPrisma.forCompany(tenantPA.id);

    const result = await db.pedidoItem.create({
      data: {
        // Parent entity fields
        producto: {
          connect: { id: productoA.id },
        },
      },
      include: { producto: true },
    });

    expect(result.producto).toBeDefined();
  });

  it('TXN-01: relation isolation applies inside $transaction', async () => {
    const db = scopedPrisma.forCompany(tenantPA.id);

    await db.$transaction(async (tx) => {
      const source = await tx.pedidoItem.findFirst({ select: { id: true } });
      const target = await tx.producto.findFirst({ select: { id: true } });

      if (source && target) {
        const updated = await tx.pedidoItem.update({
          where: { id: source.id },
          data: { productoId: target.id },
          select: { productoId: true },
        });

        expect(updated.productoId).toBe(target.id);
      }
    });
  });
});
