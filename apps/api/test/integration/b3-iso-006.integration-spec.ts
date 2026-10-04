import { Prisma } from '@prisma/client';
import { InventarioService } from '../../src/inventario/inventario.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 ISO-006 — transaction and raw SQL isolation', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let inventario: InventarioService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };
  let subfamiliaA: { id: string };
  let subfamiliaB: { id: string };
  let tipoA: { id: string };
  let tipoB: { id: string };
  let subtipoA: { id: string };
  let subtipoB: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let loteA: { id: string };
  let loteB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };

  const unique = () => Date.now().toString();

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    inventario = new InventarioService(scopedPrisma);

    const suffix = unique();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 ISO006 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 ISO006 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    familiaA = await prisma.familia.create({
      data: { empresaId: empresaA.id, nombre: `B3 ISO006 Familia A ${suffix}`, prefijo: 'I6A' },
      select: { id: true },
    });
    subfamiliaA = await prisma.subfamilia.create({
      data: { empresaId: empresaA.id, familiaId: familiaA.id, nombre: `B3 ISO006 Subfamilia A ${suffix}`, prefijo: 'I6A' },
      select: { id: true },
    });
    tipoA = await prisma.tipo.create({
      data: { empresaId: empresaA.id, subfamiliaId: subfamiliaA.id, nombre: `B3 ISO006 Tipo A ${suffix}`, prefijo: 'I6A' },
      select: { id: true },
    });
    subtipoA = await prisma.subtipo.create({
      data: { empresaId: empresaA.id, tipoId: tipoA.id, nombre: `B3 ISO006 Subtipo A ${suffix}`, prefijo: 'I6A' },
      select: { id: true },
    });

    familiaB = await prisma.familia.create({
      data: { empresaId: empresaB.id, nombre: `B3 ISO006 Familia B ${suffix}`, prefijo: 'I6B' },
      select: { id: true },
    });
    subfamiliaB = await prisma.subfamilia.create({
      data: { empresaId: empresaB.id, familiaId: familiaB.id, nombre: `B3 ISO006 Subfamilia B ${suffix}`, prefijo: 'I6B' },
      select: { id: true },
    });
    tipoB = await prisma.tipo.create({
      data: { empresaId: empresaB.id, subfamiliaId: subfamiliaB.id, nombre: `B3 ISO006 Tipo B ${suffix}`, prefijo: 'I6B' },
      select: { id: true },
    });
    subtipoB = await prisma.subtipo.create({
      data: { empresaId: empresaB.id, tipoId: tipoB.id, nombre: `B3 ISO006 Subtipo B ${suffix}`, prefijo: 'I6B' },
      select: { id: true },
    });

    productoA = await prisma.producto.create({
      data: {
        empresaId: empresaA.id,
        nombre: `B3 ISO006 Product A ${suffix}`,
        codigoInterno: `I6PA${suffix}`,
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
        nombre: `B3 ISO006 Product B ${suffix}`,
        codigoInterno: `I6PB${suffix}`,
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

    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 ISO006 User A',
        email: `b3-iso006-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    usuarioB = await prisma.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 ISO006 User B',
        email: `b3-iso006-user-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    loteA = await prisma.lote.create({
      data: {
        empresaId: empresaA.id,
        productoId: productoA.id,
        numeroLote: `I6A-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
    loteB = await prisma.lote.create({
      data: {
        empresaId: empresaB.id,
        productoId: productoB.id,
        numeroLote: `I6B-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 20,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.movimientoStock.deleteMany({
      where: { loteId: { in: [loteA.id, loteB.id] } },
    });
    await prisma.lote.deleteMany({
      where: { id: { in: [loteA.id, loteB.id] } },
    });
    await prisma.producto.deleteMany({
      where: { id: { in: [productoA.id, productoB.id] } },
    });
    await prisma.subtipo.deleteMany({
      where: { id: { in: [subtipoA.id, subtipoB.id] } },
    });
    await prisma.tipo.deleteMany({
      where: { id: { in: [tipoA.id, tipoB.id] } },
    });
    await prisma.subfamilia.deleteMany({
      where: { id: { in: [subfamiliaA.id, subfamiliaB.id] } },
    });
    await prisma.familia.deleteMany({
      where: { id: { in: [familiaA.id, familiaB.id] } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: [usuarioA.id, usuarioB.id] } } });
    await prisma.empresa.deleteMany({
      where: { id: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.$disconnect();
  });

  it('TX-01: scoped Business A transaction preserves A ownership for create/read', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const email = `b3-iso006-tx-${Date.now()}@example.test`;

    await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          empresaId: empresaB.id,
          nombre: 'B3 ISO006 Transaction',
          email,
        },
        select: { id: true, empresaId: true },
      });

      expect(created.empresaId).toBe(empresaA.id);

      const visible = await tx.usuario.findUnique({
        where: { id: usuarioA.id },
        select: { id: true, empresaId: true },
      });
      expect(visible).toEqual({ id: usuarioA.id, empresaId: empresaA.id });

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
    await prisma.usuario.deleteMany({ where: { email } });
  });

  it('TX-02: a cross-Business relation write inside the transaction rejects and persists nothing', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const canal = `b3-iso006-negative-${Date.now()}`;

    await expect(
      db.$transaction(async (tx) => {
        await tx.venta.create({
          data: {
            empresaId: empresaA.id,
            usuarioId: usuarioA.id,
            estado: 'CONFIRMADA',
            canal,
            total: 10,
            ventaItems: {
              create: {
                productoId: productoB.id,
                cantidad: 1,
                precioUnitario: 10,
              },
            },
          },
        });
      }),
    ).rejects.toThrow();

    expect(await prisma.venta.count({ where: { canal } })).toBe(0);
    expect(await prisma.ventaItem.count({ where: { productoId: productoB.id, venta: { canal } } })).toBe(0);
  });

  it('TX-03: rollback removes A effects after a later failure in the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const email = `b3-iso006-rollback-${Date.now()}@example.test`;

    await expect(
      db.$transaction(async (tx) => {
        await tx.usuario.create({
          data: {
            empresaId: empresaA.id,
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
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await inventario.registrarAjuste(
      empresaA.id,
      { loteId: loteA.id, cantidad: 2, motivo: 'B3 ISO006 RAW positive' },
      usuarioA.id,
    );

    const lote = await prisma.lote.findUnique({
      where: { id: loteA.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(lote).toEqual({ cantidad: new Prisma.Decimal(12), empresaId: empresaA.id });
  });

  it('RAW-02: the production raw-SQL method cannot update a B-owned lote when invoked with A context', async () => {
    const before = await prisma.lote.findUnique({
      where: { id: loteB.id },
      select: { cantidad: true, empresaId: true },
    });

    const db = scopedPrisma.forEmpresa(empresaA.id);

    await db.$transaction(async (tx) => {
      const aplicarAjusteAtomico = (
        inventario as unknown as {
          aplicarAjusteAtomico(
            tx: unknown,
            empresaId: string,
            loteId: string,
            cantidad: number,
          ): Promise<{ count: number }>;
        }
      ).aplicarAjusteAtomico.bind(inventario);

      const resultado = await aplicarAjusteAtomico(tx, empresaA.id, loteB.id, 5);
      expect(resultado.count).toBe(0);
    });

    const after = await prisma.lote.findUnique({
      where: { id: loteB.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(after).toEqual(before);
  });

  it('RAW-03: a raw-SQL failure does not leave a partial A stock effect', async () => {
    const before = await prisma.lote.findUnique({
      where: { id: loteA.id },
      select: { cantidad: true },
    });

    await expect(
      scopedPrisma.forEmpresa(empresaA.id).$transaction(async (tx) => {
        const aplicarAjusteAtomico = (
          inventario as unknown as {
            aplicarAjusteAtomico(
              tx: unknown,
              empresaId: string,
              loteId: string,
              cantidad: number,
            ): Promise<{ count: number }>;
          }
        ).aplicarAjusteAtomico.bind(inventario);

        const resultado = await aplicarAjusteAtomico(tx, empresaA.id, loteA.id, 3);
        expect(resultado.count).toBe(1);

        throw new Error('B3 ISO006 forced raw rollback');
      }),
    ).rejects.toThrow('B3 ISO006 forced raw rollback');

    const after = await prisma.lote.findUnique({
      where: { id: loteA.id },
      select: { cantidad: true },
    });
    expect(after).toEqual(before);
  });
});
