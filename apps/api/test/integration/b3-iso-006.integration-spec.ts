import { Prisma } from '@prisma/client';
import { InventoryService } from '../../src/inventory/inventory.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 ISO-006 — transaction and raw SQL isolation', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let inventory: InventoryService;
  let companyA: { id: string };
  let companyB: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };
  let subfamilyA: { id: string };
  let subfamilyB: { id: string };
  let typeA: { id: string };
  let typeB: { id: string };
  let subtypeA: { id: string };
  let subtypeB: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let batchA: { id: string };
  let batchB: { id: string };
  let userA: { id: string };
  let userB: { id: string };

  const unique = () => Date.now().toString();

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    inventory = new InventoryService(scopedPrisma);

    const suffix = unique();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 ISO006 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 ISO006 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    familyA = await prisma.familia.create({
      data: { empresaId: companyA.id, nombre: `B3 ISO006 Familia A ${suffix}`, prefijo: 'I6A' },
      select: { id: true },
    });
    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 ISO006 Subfamilia A ${suffix}`,
        prefijo: 'I6A',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 ISO006 Tipo A ${suffix}`,
        prefijo: 'I6A',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 ISO006 Subtipo A ${suffix}`,
        prefijo: 'I6A',
      },
      select: { id: true },
    });

    familyB = await prisma.familia.create({
      data: { empresaId: companyB.id, nombre: `B3 ISO006 Familia B ${suffix}`, prefijo: 'I6B' },
      select: { id: true },
    });
    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `B3 ISO006 Subfamilia B ${suffix}`,
        prefijo: 'I6B',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `B3 ISO006 Tipo B ${suffix}`,
        prefijo: 'I6B',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `B3 ISO006 Subtipo B ${suffix}`,
        prefijo: 'I6B',
      },
      select: { id: true },
    });

    productA = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: `B3 ISO006 Product A ${suffix}`,
        codigoInterno: `I6PA${suffix}`,
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
        nombre: `B3 ISO006 Product B ${suffix}`,
        codigoInterno: `I6PB${suffix}`,
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

    userA = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 ISO006 User A',
        email: `b3-iso006-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    userB = await prisma.usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 ISO006 User B',
        email: `b3-iso006-user-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    batchA = await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA.id,
        numeroLote: `I6A-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
    batchB = await prisma.lote.create({
      data: {
        empresaId: companyB.id,
        productoId: productB.id,
        numeroLote: `I6B-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 20,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.movimientoStock.deleteMany({
      where: { loteId: { in: [batchA.id, batchB.id] } },
    });
    await prisma.lote.deleteMany({
      where: { id: { in: [batchA.id, batchB.id] } },
    });
    await prisma.producto.deleteMany({
      where: { id: { in: [productA.id, productB.id] } },
    });
    await prisma.subtipo.deleteMany({
      where: { id: { in: [subtypeA.id, subtypeB.id] } },
    });
    await prisma.tipo.deleteMany({
      where: { id: { in: [typeA.id, typeB.id] } },
    });
    await prisma.subfamilia.deleteMany({
      where: { id: { in: [subfamilyA.id, subfamilyB.id] } },
    });
    await prisma.familia.deleteMany({
      where: { id: { in: [familyA.id, familyB.id] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.empresa.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
    await prisma.$disconnect();
  });

  it('TX-01: scoped Business A transaction preserves A ownership for create/read', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const email = `b3-iso006-tx-${Date.now()}@example.test`;

    await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          empresaId: companyB.id,
          nombre: 'B3 ISO006 Transaction',
          email,
        },
        select: { id: true, empresaId: true },
      });

      expect(created.empresaId).toBe(companyA.id);

      const visible = await tx.usuario.findUnique({
        where: { id: userA.id },
        select: { id: true, empresaId: true },
      });
      expect(visible).toEqual({ id: userA.id, empresaId: companyA.id });

      const hidden = await tx.usuario.findUnique({
        where: { id: userB.id },
        select: { id: true, empresaId: true },
      });
      expect(hidden).toBeNull();
    });

    const persisted = await prisma.usuario.findUnique({
      where: { email },
      select: { empresaId: true },
    });
    expect(persisted?.empresaId).toBe(companyA.id);
    await prisma.usuario.deleteMany({ where: { email } });
  });

  it('TX-02: a cross-Business relation write inside the transaction rejects and persists nothing', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const channel = `b3-iso006-negative-${Date.now()}`;

    await expect(
      db.$transaction(async (tx) => {
        await tx.venta.create({
          data: {
            empresaId: companyA.id,
            usuarioId: userA.id,
            estado: 'CONFIRMADA',
            canal: channel,
            total: 10,
            ventaItems: {
              create: {
                productoId: productB.id,
                cantidad: 1,
                precioUnitario: 10,
              },
            },
          },
        });
      }),
    ).rejects.toThrow();

    expect(await prisma.venta.count({ where: { canal: channel } })).toBe(0);
    expect(
      await prisma.ventaItem.count({
        where: { productoId: productB.id, venta: { canal: channel } },
      }),
    ).toBe(0);
  });

  it('TX-03: rollback removes A effects after a later failure in the same transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const email = `b3-iso006-rollback-${Date.now()}@example.test`;

    await expect(
      db.$transaction(async (tx) => {
        await tx.usuario.create({
          data: {
            empresaId: companyA.id,
            nombre: 'B3 ISO006 Rollback',
            email,
          },
        });

        throw new Error('B3 ISO006 forced rollback');
      }),
    ).rejects.toThrow('B3 ISO006 forced rollback');

    expect(await prisma.usuario.findUnique({ where: { email } })).toBeNull();
  });

  it('RAW-01: the production raw-SQL surface updates an A-owned lote under A context', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await inventory.registerAdjustment(
      companyA.id,
      { loteId: batchA.id, cantidad: 2, motivo: 'B3 ISO006 RAW positive' },
      userA.id,
    );

    const batch = await prisma.lote.findUnique({
      where: { id: batchA.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(batch).toEqual({ cantidad: new Prisma.Decimal(12), empresaId: companyA.id });
  });

  it('RAW-02: the production raw-SQL method cannot update a B-owned lote when invoked with A context', async () => {
    const before = await prisma.lote.findUnique({
      where: { id: batchB.id },
      select: { cantidad: true, empresaId: true },
    });

    const db = scopedPrisma.forCompany(companyA.id);

    await db.$transaction(async (tx) => {
      const applyAtomicAdjustment = (
        inventory as unknown as {
          applyAtomicAdjustment(
            tx: unknown,
            companyId: string,
            batchId: string,
            quantity: number,
          ): Promise<{ count: number }>;
        }
      ).applyAtomicAdjustment.bind(inventory);

      const result = await applyAtomicAdjustment(tx, companyA.id, batchB.id, 5);
      expect(result.count).toBe(0);
    });

    const after = await prisma.lote.findUnique({
      where: { id: batchB.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(after).toEqual(before);
  });

  it('RAW-03: a raw-SQL failure does not leave a partial A stock effect', async () => {
    const before = await prisma.lote.findUnique({
      where: { id: batchA.id },
      select: { cantidad: true },
    });

    await expect(
      scopedPrisma.forCompany(companyA.id).$transaction(async (tx) => {
        const applyAtomicAdjustment = (
          inventory as unknown as {
            applyAtomicAdjustment(
              tx: unknown,
              companyId: string,
              batchId: string,
              quantity: number,
            ): Promise<{ count: number }>;
          }
        ).applyAtomicAdjustment.bind(inventory);

        const result = await applyAtomicAdjustment(tx, companyA.id, batchA.id, 3);
        expect(result.count).toBe(1);

        throw new Error('B3 ISO006 forced raw rollback');
      }),
    ).rejects.toThrow('B3 ISO006 forced raw rollback');

    const after = await prisma.lote.findUnique({
      where: { id: batchA.id },
      select: { cantidad: true },
    });
    expect(after).toEqual(before);
  });
});
