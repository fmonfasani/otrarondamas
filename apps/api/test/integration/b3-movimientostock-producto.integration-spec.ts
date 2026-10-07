import { PurchasesService } from '../../src/purchases/purchases.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — MovimientoStock.producto ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let purchases: PurchasesService;
  let inventory: InventoryService;
  let suffix: number;
  let sequence = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let supplierA: { id: string };
  let userA: { id: string };
  let purchaseA: { id: string };
  let purchaseItemA: { id: string };
  let batchA: { id: string };
  let batchD: { id: string };

  // Each test uses its own reason: no count depends on rows from another
  // test.
  const uniqueReason = (id: string) => `B3MS-${id}-${suffix}-${++sequence}`;
  const uniqueCode = (id: string) => `B3MS-${id}-${suffix}-${++sequence}`;

  const rejectionCode = async (operation: Promise<unknown>): Promise<string> => {
    try {
      await operation;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const movementData = (companyId: string, productId: string, reason: string) => ({
    empresaId: companyId,
    productoId: productId,
    tipoMovimiento: 'Ajuste',
    cantidad: 1,
    motivo: reason,
  });

  const createHierarchy = async (label: 'A' | 'B', s: number, prefix: string) => {
    const company = await prisma.empresa.create({
      data: { nombre: `B3 MS ${label} ${s}`, slug: `b3-movimientostock-producto-${label.toLowerCase()}-${s}`, configuracion: {} },
      select: { id: true },
    });
    const family = await prisma.familia.create({
      data: { empresaId: company.id, nombre: `B3 MS Familia ${label} ${s}`, prefijo: `${prefix}F` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: company.id,
        familiaId: family.id,
        nombre: `B3 MS Sub ${label} ${s}`,
        prefijo: `${prefix}S`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: company.id,
        subfamiliaId: subfamily.id,
        nombre: `B3 MS Tipo ${label} ${s}`,
        prefijo: `${prefix}T`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: company.id,
        tipoId: type.id,
        nombre: `B3 MS Subtipo ${label} ${s}`,
        prefijo: `${prefix}X`,
      },
      select: { id: true },
    });
    return {
      empresa: company,
      familia: family,
      subfamilia: subfamily,
      tipo: type,
      subtipo: subtype,
    };
  };

  const future = () => new Date(Date.now() + 365 * 24 * 3600 * 1000);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    purchases = new PurchasesService(scopedPrisma);
    inventory = new InventoryService(scopedPrisma);
    suffix = Date.now();

    const hierA = await createHierarchy('A', suffix, 'Q');
    const hierB = await createHierarchy('B', suffix, 'W');
    companyA = hierA.empresa;
    companyB = hierB.empresa;

    productA = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: `B3 MS Producto A ${suffix}`,
        codigoInterno: `B3MSPA${suffix}`,
        familiaId: hierA.familia.id,
        subfamiliaId: hierA.subfamilia.id,
        tipoId: hierA.tipo.id,
        subtipoId: hierA.subtipo.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: {
        empresaId: companyB.id,
        nombre: `B3 MS Producto B ${suffix}`,
        codigoInterno: `B3MSPB${suffix}`,
        familiaId: hierB.familia.id,
        subfamiliaId: hierB.subfamilia.id,
        tipoId: hierB.tipo.id,
        subtipoId: hierB.subtipo.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 MS Proveedor A ${suffix}` },
      select: { id: true },
    });
    userA = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 MS User A',
        email: `b3-ms-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    const purchase = await prisma.compra.create({
      data: {
        empresaId: companyA.id,
        proveedorId: supplierA.id,
        usuarioId: userA.id,
        estado: 'EMITIDA',
        total: 100,
        totalPagado: 0,
        saldo: 100,
        items: {
          create: [
            {
              productoId: productA.id,
              cantidadPedida: 10,
              cantidadRecibida: 0,
              costoUnitario: 5,
            },
          ],
        },
      },
      include: { items: true },
    });
    purchaseA = { id: purchase.id };
    purchaseItemA = { id: purchase.items[0].id };

    batchA = await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA.id,
        numeroLote: `B3MS-LOTEA-${suffix}`,
        vencimiento: future(),
        cantidad: 100,
      },
      select: { id: true },
    });
    batchD = await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA.id,
        numeroLote: `B3MS-LOTED-${suffix}`,
        vencimiento: future(),
        cantidad: 10,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    const returns = await prisma.devolucionProveedor.findMany({
      where: { empresaId: { in: companies } },
      select: { id: true },
    });
    await prisma.devolucionProveedorItem.deleteMany({
      where: { devolucionId: { in: returns.map((d) => d.id) } },
    });
    await prisma.devolucionProveedor.deleteMany({
      where: { id: { in: returns.map((d) => d.id) } },
    });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.compraItem.deleteMany({ where: { compraId: purchaseA.id } });
    await prisma.compra.deleteMany({ where: { id: purchaseA.id } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.proveedor.deleteMany({ where: { id: supplierA.id } });
    await prisma.usuario.deleteMany({ where: { id: userA.id } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('MS-P-01: same-Business Producto reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const reason = uniqueReason('01');
    const created = await db.movimientoStock.create({
      data: movementData(companyA.id, productA.id, reason),
      select: { empresaId: true, productoId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.productoId).toBe(productA.id);
  });

  it('MS-P-02: cross-Business Producto create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const reason = uniqueReason('02');

    expect(
      await rejectionCode(
        db.movimientoStock.create({ data: movementData(companyA.id, productB.id, reason) }),
      ),
    ).toBe('P2025');

    expect(await prisma.movimientoStock.count({ where: { motivo: reason } })).toBe(0);
  });

  it('MS-P-03: cross-Business Producto update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const movement = await prisma.movimientoStock.create({
      data: movementData(companyA.id, productA.id, uniqueReason('03-base')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.movimientoStock.update({
          where: { id: movement.id },
          data: { productoId: productB.id },
        }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.movimientoStock.findUnique({
      where: { id: movement.id },
      select: { productoId: true },
    });
    expect(persisted?.productoId).toBe(productA.id);
  });

  it('MS-P-04: same-Business Producto references commit inside an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const reason1 = uniqueReason('04-a');
    const reason2 = uniqueReason('04-b');

    await db.$transaction(async (tx) => {
      await tx.movimientoStock.create({ data: movementData(companyA.id, productA.id, reason1) });
      await tx.movimientoStock.create({ data: movementData(companyA.id, productA.id, reason2) });
    });

    expect(
      await prisma.movimientoStock.count({ where: { motivo: { in: [reason1, reason2] } } }),
    ).toBe(2);
  });

  it('MS-P-05: rejected cross-Business create rolls back the valid MovimientoStock of the same transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const valid = uniqueReason('05-OK');
    const invalid = uniqueReason('05-BAD');

    expect(
      await rejectionCode(
        db.$transaction(async (tx) => {
          await tx.movimientoStock.create({ data: movementData(companyA.id, productA.id, valid) });
          await tx.movimientoStock.create({
            data: movementData(companyA.id, productB.id, invalid),
          });
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.movimientoStock.count({ where: { motivo: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('MS-P-06: nonexistent Producto fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const reason = uniqueReason('06');

    expect(
      await rejectionCode(
        db.movimientoStock.create({
          data: movementData(companyA.id, `no-existe-${suffix}`, reason),
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.movimientoStock.count({ where: { motivo: reason } })).toBe(0);
  });

  it('MS-P-07: productive ajuste flow keeps working (registrarAjuste, W-3)', async () => {
    const reason = uniqueReason('07');
    await inventory.registerAdjustment(
      companyA.id,
      { loteId: batchA.id, cantidad: 5, motivo: reason },
      userA.id,
    );

    const movements = await prisma.movimientoStock.findMany({
      where: { motivo: `AjusteManual: ${reason}` },
    });
    expect(movements.length).toBe(1);
    expect(movements[0].productoId).toBe(productA.id);
    expect(movements[0].tipoMovimiento).toBe('Entrada');
  });

  it('MS-P-08: productive recepcion flow keeps working (recibirCompra, W-1)', async () => {
    const batchNumber = `B3MS-R08-${suffix}`;
    const reception = await purchases.receivePurchase(
      companyA.id,
      purchaseA.id,
      {
        items: [
          {
            compraItemId: purchaseItemA.id,
            numeroLote: batchNumber,
            vencimiento: future().toISOString(),
            cantidadRecibida: 3,
          },
        ],
      },
      userA.id,
    );

    expect(reception.movimientosStock.length).toBe(1);
    expect(reception.movimientosStock[0].productoId).toBe(productA.id);
    expect(reception.movimientosStock[0].motivo).toBe('Compra');
    expect(reception.movimientosStock[0].tipoMovimiento).toBe('Entrada');
  });

  it('MS-P-09: productive devolucion flow keeps working (crearDevolucion, W-2)', async () => {
    const reason = uniqueReason('09');
    await purchases.createReturn(
      companyA.id,
      purchaseA.id,
      {
        motivo: reason,
        items: [{ productoId: productA.id, loteId: batchD.id, cantidad: 1, costoUnitario: 5 }],
      },
      userA.id,
    );

    const movements = await prisma.movimientoStock.findMany({ where: { motivo: 'Devolucion' } });
    const own = movements.filter((m) => m.productoId === productA.id);
    expect(own.length).toBeGreaterThanOrEqual(1);
    expect(own[0].tipoMovimiento).toBe('Salida');
  });

  it('MS-P-10: productive devolucion flow with cross-Business Producto rejects with P2025 and rolls back', async () => {
    const reason = uniqueReason('10');

    expect(
      await rejectionCode(
        purchases.createReturn(
          companyA.id,
          purchaseA.id,
          {
            motivo: reason,
            items: [{ productoId: productB.id, cantidad: 1, costoUnitario: 5 }],
          },
          userA.id,
        ),
      ),
    ).toBe('P2025');

    expect(await prisma.devolucionProveedor.count({ where: { motivo: reason } })).toBe(0);
    const movements = await prisma.movimientoStock.findMany({ where: { motivo: 'Devolucion' } });
    expect(movements.filter((m) => m.productoId === productB.id).length).toBe(0);
  });

  it('MS-P-11: productive FIFO discount flow keeps working (descontarStock, W-4)', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const reference = uniqueCode('11');

    await db.$transaction(async (tx) =>
      inventory.deductStock(tx, companyA.id, productA.id, 2, 'Venta', reference, userA.id),
    );

    const movements = await prisma.movimientoStock.findMany({ where: { referenciaId: reference } });
    expect(movements.length).toBeGreaterThanOrEqual(1);
    for (const m of movements) {
      expect(m.productoId).toBe(productA.id);
      expect(m.tipoMovimiento).toBe('Salida');
    }
  });

  it('MS-P-12: control — update to a nonexistent Producto is P2025, distinguishable from the FK violation', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const movement = await prisma.movimientoStock.create({
      data: movementData(companyA.id, productA.id, uniqueReason('12-base')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.movimientoStock.update({
          where: { id: movement.id },
          data: { productoId: `no-existe-${suffix}` },
        }),
      ),
    ).toBe('P2025');
  });
});
