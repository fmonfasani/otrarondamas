import { InventoryService } from '../../src/inventory/inventory.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PurchasesService } from '../../src/purchases/purchases.service';

/**
 * OR-B4-046 rule 9 (D9) and ADR-DAT-009, stage B1. A product says whether it controls expiry: only
 * then a received lot needs its date, and its lots leave expiring first (FEFO). The rest enter
 * without a date or a lot number and leave in arrival order (FIFO); such a lot never counts as
 * expired. Every stock movement keeps its unit cost, and every adjustment is in the audit trail.
 */
describe('P19-4 — stock: lote opcional y costo en cada movimiento', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let prisma: PrismaService;
  let scoped: CompanyScopedPrismaService;
  let purchases: PurchasesService;
  let inventory: InventoryService;
  let suffix: number;
  let company: string;
  let user: string;
  let supplier: string;
  let plain: string;
  let dated: string;

  async function product(name: string, controlaVencimiento: boolean, costo: number) {
    const familia = await prisma.familia.create({
      data: {
        empresaId: company,
        nombre: `P19-4 F ${name} ${suffix}`,
        prefijo: name.slice(0, 2).toUpperCase(),
      },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: { empresaId: company, familiaId: familia.id, nombre: 'General', prefijo: 'GEN' },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: company, subfamiliaId: subfamilia.id, nombre: 'General', prefijo: 'GEN' },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: company, tipoId: tipo.id, nombre: 'General', prefijo: 'GEN' },
    });
    const created = await prisma.producto.create({
      data: {
        empresaId: company,
        nombre: `P19-4 ${name} ${suffix}`,
        codigoInterno: `P194-${name}-${suffix}`,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        unidadBase: 'UNIDAD',
        costo,
        precioMinorista: costo * 2,
        controlaVencimiento,
      },
    });
    return created.id;
  }

  /** An issued purchase of one product, ready to be received. */
  async function issued(productId: string, costoUnitario: number) {
    const purchase = await purchases.createPurchase(
      company,
      {
        proveedorId: supplier,
        items: [{ productoId: productId, cantidadPedida: 10, costoUnitario }],
      },
      user,
    );
    await purchases.issuePurchase(company, purchase.id);
    const full = await purchases.getPurchase(company, purchase.id);
    return { id: purchase.id, itemId: full.CompraItem[0].id };
  }

  const lot = (
    productId: string,
    numeroLote: string,
    cantidad: number,
    vencimiento: Date | null,
    createdAt: Date,
  ) =>
    prisma.lote.create({
      data: {
        empresaId: company,
        productoId: productId,
        numeroLote,
        cantidad,
        vencimiento,
        createdAt,
      },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scoped = new CompanyScopedPrismaService(prisma);
    purchases = new PurchasesService(scoped);
    inventory = new InventoryService(scoped);
    suffix = Date.now();
    company = (
      await prisma.empresa.create({
        data: { nombre: `P19-4 ${suffix}`, slug: `p19-4-${suffix}`, configuracion: {} },
      })
    ).id;
    user = (
      await prisma.usuario.create({
        data: { empresaId: company, nombre: 'P19-4', email: `p19-4-${suffix}@example.test` },
      })
    ).id;
    supplier = (
      await prisma.proveedor.create({ data: { empresaId: company, nombre: `P19-4 ${suffix}` } })
    ).id;
    plain = await product('Yerba', false, 10);
    dated = await product('Leche', true, 20);
  });

  afterAll(async () => {
    const empresaId = company;
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId } });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId } });
    await prisma.compraItem.deleteMany({ where: { empresaId } });
    await prisma.compra.deleteMany({ where: { empresaId } });
    await prisma.lote.deleteMany({ where: { empresaId } });
    // Stage D1: each reception links the product to its supplier.
    await prisma.productoProveedor.deleteMany({ where: { empresaId } });
    await prisma.proveedor.deleteMany({ where: { empresaId } });
    await prisma.producto.deleteMany({ where: { empresaId } });
    await prisma.subtipo.deleteMany({ where: { empresaId } });
    await prisma.tipo.deleteMany({ where: { empresaId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId } });
    await prisma.familia.deleteMany({ where: { empresaId } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  });

  it('a product that does not control expiry enters without a date or a lot number, at the purchase cost', async () => {
    const purchase = await issued(plain, 7);
    const reception = await purchases.receivePurchase(
      company,
      purchase.id,
      { items: [{ compraItemId: purchase.itemId, cantidadRecibida: 4 }] },
      user,
    );
    const movement = reception.MovimientoStock[0];
    const received = await prisma.lote.findUniqueOrThrow({
      where: { id: movement.loteId as string },
    });
    expect(received.vencimiento).toBeNull();
    expect(received.numeroLote).toMatch(/^REC-\d{8}-[0-9A-F-]{6}$/);
    expect(Number(movement.costoUnitario)).toBe(7);
  });

  it('a product that controls expiry needs the date of its lot', async () => {
    const purchase = await issued(dated, 15);
    await expect(
      purchases.receivePurchase(
        company,
        purchase.id,
        { items: [{ compraItemId: purchase.itemId, cantidadRecibida: 2, numeroLote: 'A1' }] },
        user,
      ),
    ).rejects.toThrow('controla vencimiento: indicá la fecha del lote.');
    const reception = await purchases.receivePurchase(
      company,
      purchase.id,
      {
        items: [
          {
            compraItemId: purchase.itemId,
            cantidadRecibida: 2,
            numeroLote: 'A1',
            vencimiento: new Date(Date.now() + 90 * DAY).toISOString(),
          },
        ],
      },
      user,
    );
    expect(reception.MovimientoStock).toHaveLength(1);
  });

  it('lots without a date leave in arrival order, dated ones expiring first, and none counts as expired', async () => {
    const older = await lot(plain, `FIFO-1-${suffix}`, 2, null, new Date(Date.now() - 3 * DAY));
    const newer = await lot(plain, `FIFO-2-${suffix}`, 2, null, new Date(Date.now() - DAY));
    await scoped
      .forCompany(company)
      .$transaction((tx) =>
        inventory.deductStock(tx, company, plain, 3, 'Venta', `p19-4-${suffix}`, user),
      );
    const plainLeft = await prisma.lote.findMany({
      where: { id: { in: [older.id, newer.id] } },
      select: { id: true, cantidad: true },
    });
    expect(Object.fromEntries(plainLeft.map((l) => [l.id, Number(l.cantidad)]))).toEqual({
      [older.id]: 0,
      [newer.id]: 1,
    });
    const outs = await prisma.movimientoStock.findMany({
      where: { referenciaId: `p19-4-${suffix}`, productoId: plain },
      select: { loteVencidoAlMomento: true, costoUnitario: true },
    });
    // Stage C1 (ADR-DAT-009): what leaves is valued at the average cost. The only entry with a cost
    // was the first test's reception of 4 at 7, with nothing on hand, so the average is 7.
    expect(
      outs.every((m) => m.loteVencidoAlMomento === false && Number(m.costoUnitario) === 7),
    ).toBe(true);

    // The dated product: the lot expiring sooner leaves first, even if it arrived later.
    const late = await lot(
      dated,
      `FEFO-late-${suffix}`,
      5,
      new Date(Date.now() + 60 * DAY),
      new Date(Date.now() - 2 * DAY),
    );
    const soon = await lot(
      dated,
      `FEFO-soon-${suffix}`,
      5,
      new Date(Date.now() + 10 * DAY),
      new Date(),
    );
    await scoped
      .forCompany(company)
      .$transaction((tx) =>
        inventory.deductStock(tx, company, dated, 1, 'Venta', `p19-4-d-${suffix}`, user),
      );
    const out = await prisma.movimientoStock.findFirstOrThrow({
      where: { referenciaId: `p19-4-d-${suffix}` },
    });
    expect(out.loteId).toBe(soon.id);
    expect(Number((await prisma.lote.findUniqueOrThrow({ where: { id: late.id } })).cantidad)).toBe(
      5,
    );
  });

  it('an adjustment keeps its cost and lands in the audit trail with its reason', async () => {
    const target = await lot(plain, `AJ-${suffix}`, 5, null, new Date());
    const movement = await inventory.registerAdjustment(
      company,
      { loteId: target.id, cantidad: -2, motivo: 'Rotura' },
      user,
    );
    // At the average cost (stage C1), 7: see the test above.
    expect(Number(movement.costoUnitario)).toBe(7);
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { empresaId: company, accion: 'STOCK_AJUSTE', entidadId: plain },
      orderBy: { fechaHora: 'desc' },
    });
    expect(entry).toMatchObject({
      motivo: 'Rotura',
      valoresAnteriores: { lote: `AJ-${suffix}`, cantidad: 5 },
      valoresPosteriores: { lote: `AJ-${suffix}`, cantidad: 3 },
    });
  });

  it('a lot without a date is never in the expiry alerts', async () => {
    const alerts = await inventory.alerts(company);
    expect(alerts.lotesPorVencer.every((l) => l.vencimiento !== null)).toBe(true);
    expect(alerts.lotesPorVencer.map((l) => l.productoId)).not.toContain(plain);
  });
});
