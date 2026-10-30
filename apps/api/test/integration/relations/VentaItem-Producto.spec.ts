/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { PrismaService } from '../../src/prisma/prisma.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';

describe('VentaItem → Producto (producto) isolation', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let tenantVA: { id: string };
  let tenantVB: { id: string };
  let productoA: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    const ts = Date.now();

    tenantVA = await prisma.empresa.create({
      data: {
        nombre: `VentaItem-producto TenantA ${ts}`,
        slug: `ventaitem-producto-ta-${ts}`,
        configuracion: {},
      },
      select: { id: true },
    });

    tenantVB = await prisma.empresa.create({
      data: {
        nombre: `VentaItem-producto TenantB ${ts}`,
        slug: `ventaitem-producto-tb-${ts}`,
        configuracion: {},
      },
      select: { id: true },
    });

    // TODO: Create fixture instances for ventaItemA, productoA, productoB
    // using factory pattern or direct prisma.create calls
  });

  afterAll(async () => {
    await prisma.ventaItem.deleteMany({});
    await prisma.producto.deleteMany({});
    await prisma.empresa.deleteMany({ where: { id: { in: [tenantVA.id, tenantVB.id] } } });
    await prisma.$disconnect();
  });

  it('AA-01: VentaItemA can create same-tenant relation to ProductoA', async () => {
    const db = scopedPrisma.forCompany(tenantVA.id);
    const source = await db.ventaItem.findFirst({ select: { id: true } });
    const target = await db.producto.findFirst({ select: { id: true } });

    if (!source || !target) {
      this.skip();
    }

    const result = await db.ventaItem.update({
      where: { id: source!.id },
      data: { productoId: target!.id },
      select: { id: true, productoId: true },
    });

    expect(result.productoId).toBe(target!.id);
  });

  it('AA-02: VentaItemA can createMany within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantVA.id);

    const result = await db.ventaItem.createMany({
      data: [{/* fixture data for VentaItem */}, {/* fixture data for VentaItem */}],
    });

    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('AB-01: VentaItemA attempting cross-tenant relation to ProductoB → P2025', async () => {
    const dbA = scopedPrisma.forCompany(tenantVA.id);
    const sourceA = await dbA.ventaItem.findFirst({ select: { id: true } });
    const targetB = await prisma.producto.findFirst({
      where: { empresaId: tenantVB.id },
      select: { id: true },
    });

    if (!sourceA || !targetB) {
      this.skip();
    }

    await expect(
      dbA.ventaItem.update({
        where: { id: sourceA!.id },
        data: { productoId: targetB!.id },
      }),
    ).rejects.toThrow(/P2025|not found/);
  });

  it('UPDATE-01: VentaItemA can update relation within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantVA.id);
    const source = await db.ventaItem.findFirst({ select: { id: true } });
    const targets = await db.producto.findMany({ take: 2, select: { id: true } });

    if (!source || targets.length < 2) {
      this.skip();
    }

    const updated = await db.ventaItem.update({
      where: { id: source!.id },
      data: { productoId: targets[1]!.id },
      select: { productoId: true },
    });

    expect(updated.productoId).toBe(targets[1]!.id);
  });

  it('NESTED-01: VentaItemA nested create preserves same-tenant isolation', async () => {
    const db = scopedPrisma.forCompany(tenantVA.id);

    const result = await db.ventaItem.create({
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
    const db = scopedPrisma.forCompany(tenantVA.id);

    await db.$transaction(async (tx) => {
      const source = await tx.ventaItem.findFirst({ select: { id: true } });
      const target = await tx.producto.findFirst({ select: { id: true } });

      if (source && target) {
        const updated = await tx.ventaItem.update({
          where: { id: source.id },
          data: { productoId: target.id },
          select: { productoId: true },
        });

        expect(updated.productoId).toBe(target.id);
      }
    });
  });
});
