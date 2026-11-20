import { ConflictException } from '@nestjs/common';
import { InventoryService } from '../../src/inventory/inventory.service';
import {
  COUNT_REASON,
  OPENING_REASON,
  StockEntriesService,
} from '../../src/inventory/stock-entries.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * OR-B4-046 D8, stage B2: stock that does not come from a purchase.
 * - The opening stock: what a business already has, without inventing a purchase. Only while the
 *   product has had no other stock operation.
 * - The physical count: the stock becomes what was counted, and the difference is a movement with
 *   its cost and an audit entry. A count against a stock that changed in between is refused whole.
 */
describe('P19-5 — stock: carga inicial y conteo físico', () => {
  const DAY = 24 * 60 * 60 * 1000;
  let prisma: PrismaService;
  let entries: StockEntriesService;
  let inventory: InventoryService;
  let suffix: number;
  let company: string;
  let user: string;
  let familia: string;
  let plain: string;
  let dated: string;
  let other: string;

  async function product(name: string, controlaVencimiento: boolean, costo: number) {
    const fam = await prisma.familia.create({
      data: { empresaId: company, nombre: `P19-5 F ${name} ${suffix}`, prefijo: name.slice(0, 2) },
    });
    const sub = await prisma.subfamilia.create({
      data: { empresaId: company, familiaId: fam.id, nombre: 'General', prefijo: 'GEN' },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: company, subfamiliaId: sub.id, nombre: 'General', prefijo: 'GEN' },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: company, tipoId: tipo.id, nombre: 'General', prefijo: 'GEN' },
    });
    const created = await prisma.producto.create({
      data: {
        empresaId: company,
        nombre: `P19-5 ${name} ${suffix}`,
        codigoInterno: `P195-${name}-${suffix}`,
        familiaId: fam.id,
        subfamiliaId: sub.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        unidadBase: 'UNIDAD',
        costo,
        precioMinorista: costo * 2,
        controlaVencimiento,
      },
    });
    return { id: created.id, familiaId: fam.id };
  }

  const lotsOf = (productoId: string) =>
    prisma.lote.findMany({ where: { productoId }, orderBy: { createdAt: 'asc' } });
  const stockOf = async (productoId: string) =>
    (await lotsOf(productoId)).reduce((sum, l) => sum + Number(l.cantidad), 0);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const scoped = new CompanyScopedPrismaService(prisma);
    inventory = new InventoryService(scoped);
    entries = new StockEntriesService(scoped, inventory);
    suffix = Date.now();
    company = (
      await prisma.empresa.create({
        data: { nombre: `P19-5 ${suffix}`, slug: `p19-5-${suffix}`, configuracion: {} },
      })
    ).id;
    user = (
      await prisma.usuario.create({
        data: { empresaId: company, nombre: 'P19-5', email: `p19-5-${suffix}@example.test` },
      })
    ).id;
    const yerba = await product('Yerba', false, 10);
    plain = yerba.id;
    familia = yerba.familiaId;
    dated = (await product('Leche', true, 20)).id;
    other = (await product('Azucar', false, 5)).id;
  });

  afterAll(async () => {
    const empresaId = company;
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId } });
    await prisma.lote.deleteMany({ where: { empresaId } });
    await prisma.producto.deleteMany({ where: { empresaId } });
    await prisma.subtipo.deleteMany({ where: { empresaId } });
    await prisma.tipo.deleteMany({ where: { empresaId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId } });
    await prisma.familia.deleteMany({ where: { empresaId } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  });

  it('the opening stock enters without a purchase, names its lot, keeps its cost and is audited', async () => {
    const sheet = await entries.openingSheet(company);
    expect(sheet.productos.map((p) => p.productoId)).toEqual(
      expect.arrayContaining([plain, dated, other]),
    );

    const load = await entries.openingStock(
      company,
      { items: [{ productoId: plain, cantidad: 2, costoUnitario: 8 }] },
      user,
    );
    const [lot] = await lotsOf(plain);
    expect(lot.vencimiento).toBeNull();
    expect(lot.numeroLote).toMatch(/^INI-\d{8}-[0-9A-F-]{6}$/);
    const movement = await prisma.movimientoStock.findFirstOrThrow({
      where: { referenciaId: load.referenciaId },
    });
    expect(movement).toMatchObject({ tipoMovimiento: 'Entrada', motivo: OPENING_REASON });
    expect(Number(movement.costoUnitario)).toBe(8);
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { empresaId: company, accion: 'STOCK_CARGA_INICIAL', entidadId: plain },
    });
    expect(entry.valoresAnteriores).toMatchObject({ cantidad: 0 });
    expect(entry.valoresPosteriores).toMatchObject({ cantidad: 2, lote: lot.numeroLote });

    // Until it operates, a product may take another opening load; without a cost, the product's.
    await entries.openingStock(company, { items: [{ productoId: plain, cantidad: 3 }] }, user);
    const lots = await lotsOf(plain);
    expect(lots.map((l) => Number(l.cantidad))).toEqual([2, 3]);
    const second = await prisma.movimientoStock.findFirstOrThrow({
      where: { loteId: lots[1].id },
    });
    expect(Number(second.costoUnitario)).toBe(10);
  });

  it('the opening stock follows the expiry rule, and refuses a product that already operated', async () => {
    const soon = new Date(Date.now() + 30 * DAY).toISOString();
    const later = new Date(Date.now() + 90 * DAY).toISOString();
    await expect(
      entries.openingStock(company, { items: [{ productoId: dated, cantidad: 5 }] }, user),
    ).rejects.toThrow('controla vencimiento: indicá la fecha del lote.');
    await expect(
      entries.openingStock(
        company,
        { items: [{ productoId: other, cantidad: 1, vencimiento: soon }] },
        user,
      ),
    ).rejects.toThrow('no controla vencimiento: su stock entra sin fecha.');
    await expect(
      entries.openingStock(
        company,
        {
          items: [
            { productoId: other, cantidad: 1 },
            { productoId: other, cantidad: 2 },
          ],
        },
        user,
      ),
    ).rejects.toThrow('está dos veces');

    // A product that controls expiry takes one lot per date.
    await entries.openingStock(
      company,
      {
        items: [
          { productoId: dated, cantidad: 5, vencimiento: soon },
          { productoId: dated, cantidad: 5, vencimiento: later, numeroLote: 'L-90' },
        ],
      },
      user,
    );
    expect((await lotsOf(dated)).map((l) => l.numeroLote)).toEqual(
      expect.arrayContaining(['L-90']),
    );

    // After a sale, a purchase, an adjustment or a count, the stock is corrected with a count.
    await entries.openingStock(company, { items: [{ productoId: other, cantidad: 4 }] }, user);
    const [otherLot] = await lotsOf(other);
    await inventory.registerAdjustment(
      company,
      { loteId: otherLot.id, cantidad: -1, motivo: 'Rotura' },
      user,
    );
    await expect(
      entries.openingStock(
        company,
        {
          items: [
            { productoId: plain, cantidad: 1 },
            { productoId: other, cantidad: 1 },
          ],
        },
        user,
      ),
    ).rejects.toThrow('ya tuvo ventas, compras o ajustes: corregí su stock con un conteo físico.');
    // All or nothing: the row of the product that could take it did not enter either.
    expect(await stockOf(plain)).toBe(5);
    const sheet = await entries.openingSheet(company);
    expect(sheet.productos.map((p) => p.productoId)).not.toContain(other);
  });

  it('a count per product takes what is missing from the oldest lot and adds what appeared to the newest', async () => {
    const down = await entries.count(
      company,
      {
        nota: 'depósito',
        items: [{ productoId: plain, cantidadSistema: 5, cantidadContada: 4 }],
      },
      user,
    );
    expect(down).toMatchObject({ contados: 1, ajustados: 1 });
    expect(down.diferencias[0]).toMatchObject({ sistema: 5, contado: 4, diferencia: -1 });
    expect((await lotsOf(plain)).map((l) => Number(l.cantidad))).toEqual([1, 3]);
    const out = await prisma.movimientoStock.findFirstOrThrow({
      where: { referenciaId: down.referenciaId },
    });
    expect(out).toMatchObject({ tipoMovimiento: 'Salida', motivo: `${COUNT_REASON}: depósito` });
    expect(Number(out.costoUnitario)).toBe(10);

    const up = await entries.count(
      company,
      { items: [{ productoId: plain, cantidadSistema: 4, cantidadContada: 6 }] },
      user,
    );
    expect(up.ajustados).toBe(1);
    expect((await lotsOf(plain)).map((l) => Number(l.cantidad))).toEqual([1, 5]);
    const audit = await prisma.auditLog.findMany({
      where: { empresaId: company, accion: 'STOCK_CONTEO', entidadId: plain },
      orderBy: { fechaHora: 'asc' },
    });
    expect(audit.map((a) => [a.valoresAnteriores, a.valoresPosteriores])).toEqual([
      [expect.objectContaining({ cantidad: 5 }), expect.objectContaining({ cantidad: 4 })],
      [expect.objectContaining({ cantidad: 4 }), expect.objectContaining({ cantidad: 6 })],
    ]);

    // A row without a difference changes nothing and writes nothing.
    const same = await entries.count(
      company,
      { items: [{ productoId: plain, cantidadSistema: 6, cantidadContada: 6 }] },
      user,
    );
    expect(same).toMatchObject({ contados: 1, ajustados: 0 });
    expect(await prisma.movimientoStock.count({ where: { referenciaId: same.referenciaId } })).toBe(
      0,
    );
  });

  it('a product that controls expiry is counted lot by lot, and a lot the count found is created', async () => {
    const [first, second] = await prisma.lote.findMany({
      where: { productoId: dated },
      orderBy: { vencimiento: 'asc' },
    });
    await expect(
      entries.count(
        company,
        { items: [{ productoId: dated, cantidadSistema: 10, cantidadContada: 9 }] },
        user,
      ),
    ).rejects.toThrow('controla vencimiento: contalo lote por lote.');

    const found = new Date(Date.now() + 120 * DAY).toISOString();
    const result = await entries.count(
      company,
      {
        items: [
          { productoId: dated, loteId: first.id, cantidadSistema: 5, cantidadContada: 3 },
          { productoId: dated, loteId: second.id, cantidadSistema: 5, cantidadContada: 5 },
          { productoId: dated, vencimiento: found, cantidadSistema: 0, cantidadContada: 4 },
        ],
      },
      user,
    );
    expect(result).toMatchObject({ contados: 3, ajustados: 2 });
    const lots = await prisma.lote.findMany({
      where: { productoId: dated },
      orderBy: { vencimiento: 'asc' },
    });
    expect(lots.map((l) => Number(l.cantidad))).toEqual([3, 5, 4]);
    expect(lots[2].numeroLote).toMatch(/^CONTEO-\d{8}-[0-9A-F-]{6}$/);
  });

  it('a count against a stock that changed in between is refused whole', async () => {
    const before = await stockOf(other);
    await expect(
      entries.count(
        company,
        {
          items: [
            { productoId: plain, cantidadSistema: 6, cantidadContada: 2 },
            { productoId: other, cantidadSistema: before + 1, cantidadContada: 0 },
          ],
        },
        user,
      ),
    ).rejects.toThrow(
      `El stock cambió mientras contabas: «P19-5 Azucar ${suffix}» (ahora ${before})`,
    );
    expect(await stockOf(plain)).toBe(6);
    expect(await stockOf(other)).toBe(before);
    await expect(
      entries.count(
        company,
        {
          items: [
            { productoId: plain, cantidadSistema: 6, cantidadContada: 2 },
            { productoId: plain, cantidadSistema: 6, cantidadContada: 3 },
          ],
        },
        user,
      ),
    ).rejects.toThrow('está dos veces en el conteo.');
  });

  it('the count sheet lists lots only for products that control expiry, and filters by category', async () => {
    const sheet = await entries.countSheet(company, 'P19-5');
    const byId = new Map(sheet.productos.map((p) => [p.productoId, p]));
    expect(byId.get(plain)).toMatchObject({ stockTotal: 6, lotes: [] });
    expect(byId.get(dated)?.stockTotal).toBe(12);
    expect(byId.get(dated)?.lotes.map((l) => Number(l.cantidad))).toEqual([3, 5, 4]);
    const filtered = await entries.countSheet(company, undefined, familia);
    expect(filtered.productos.map((p) => p.productoId)).toEqual([plain]);
  });

  it('two counts of the same stock at once: one applies and the other is refused', async () => {
    const current = await stockOf(plain);
    const results = await Promise.allSettled(
      [1, 2].map((less) =>
        entries.count(
          company,
          {
            items: [
              { productoId: plain, cantidadSistema: current, cantidadContada: current - less },
            ],
          },
          user,
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(refused?.reason).toBeInstanceOf(ConflictException);
    expect([current - 1, current - 2]).toContain(await stockOf(plain));
  });
});
