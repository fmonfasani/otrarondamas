import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomersService } from '../../src/customers/customers.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { OrdersService } from '../../src/orders/orders.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SalesService } from '../../src/sales/sales.service';
import { StoreCatalogService } from '../../src/store/store-catalog.service';

/**
 * OR-B4-049 (#165, #168), stage B3: confirming an order reserves its stock; the stock leaves the
 * business at the first of EN_CAMINO / ENTREGADO; a failed delivery brings it back, still
 * reserved; cancelling before the exit only releases the reservation. Reserved units are not sold
 * to anyone else: not at the counter, not to another order, not in the store.
 */
describe('P19-6 — pedidos: reserva al confirmar y salida al salir del local', () => {
  let prisma: PrismaService;
  let scoped: CompanyScopedPrismaService;
  let inventory: InventoryService;
  let orders: OrdersService;
  let sales: SalesService;
  let suffix: number;
  let company: string;
  let user: string;
  let customer: string;
  let product: string;

  type Target =
    'CONFIRMADO' | 'EN_PREPARACION' | 'LISTO' | 'EN_CAMINO' | 'ENTREGADO' | 'ENTREGA_FALLIDA';
  const move = (orderId: string, estado: Target) =>
    orders.updateStatus(orderId, company, { estado }, user);

  /** A new product with a lot of `cantidad` units (cost 10). */
  async function stocked(name: string, cantidad: number) {
    const familia = await prisma.familia.create({
      data: { empresaId: company, nombre: `P19-6 F ${name} ${suffix}`, prefijo: name.slice(0, 2) },
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
        nombre: `P19-6 ${name} ${suffix}`,
        codigoInterno: `P196-${name}-${suffix}`,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
        publicado: true,
      },
    });
    const lot = await prisma.lote.create({
      data: { empresaId: company, productoId: created.id, numeroLote: `L-${name}`, cantidad },
    });
    return { id: created.id, lot: lot.id };
  }

  /** A received (RECIBIDO) order of `cantidad` units of a product. */
  const order = async (productoId: string, cantidad: number) =>
    (
      await prisma.pedido.create({
        data: {
          empresaId: company,
          clienteId: customer,
          estado: 'RECIBIDO',
          canalOrigen: 'web',
          total: cantidad * 20,
          PedidoItem: { create: [{ productoId, cantidad, precioUnitario: 20 }] },
        },
      })
    ).id;

  const lotQuantity = async (lotId: string) =>
    Number((await prisma.lote.findUniqueOrThrow({ where: { id: lotId } })).cantidad);
  const movementsOf = (orderId: string) =>
    prisma.movimientoStock.findMany({
      where: { referenciaId: orderId },
      orderBy: { createdAt: 'asc' },
    });
  const stockRow = async (productoId: string) =>
    (await inventory.consolidatedStock(company)).find((row) => row.productoId === productoId);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scoped = new CompanyScopedPrismaService(prisma);
    inventory = new InventoryService(scoped);
    orders = new OrdersService(scoped, inventory);
    sales = new SalesService(
      scoped,
      inventory,
      new LoyaltyService(scoped),
      new CustomersService(scoped),
    );
    suffix = Date.now();
    company = (
      await prisma.empresa.create({
        data: { nombre: `P19-6 ${suffix}`, slug: `p19-6-${suffix}`, configuracion: {} },
      })
    ).id;
    user = (
      await prisma.usuario.create({
        data: { empresaId: company, nombre: 'P19-6', email: `p19-6-${suffix}@example.test` },
      })
    ).id;
    customer = (
      await prisma.cliente.create({
        data: {
          empresaId: company,
          nombre: 'Cliente P19-6',
          email: `cliente-p19-6-${suffix}@example.test`,
        },
      })
    ).id;
    product = (await stocked('Yerba', 5)).id;
  });

  afterAll(async () => {
    const empresaId = company;
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId } });
    await prisma.pago.deleteMany({ where: { empresaId } });
    await prisma.ventaItem.deleteMany({ where: { Venta: { empresaId } } });
    await prisma.venta.deleteMany({ where: { empresaId } });
    await prisma.pedidoItem.deleteMany({ where: { empresaId } });
    await prisma.pedido.deleteMany({ where: { empresaId } });
    await prisma.cliente.deleteMany({ where: { empresaId } });
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

  it('confirming reserves without moving stock, and nobody else gets the reserved units', async () => {
    const first = await order(product, 3);
    const confirmed = await move(first, 'CONFIRMADO');
    expect(confirmed.estado).toBe('CONFIRMADO');
    expect(await movementsOf(first)).toHaveLength(0);
    expect(await stockRow(product)).toMatchObject({ stockTotal: 5, reservado: 3, disponible: 2 });

    // The counter sells what is free, not what is reserved.
    await expect(
      sales.create(
        { canal: 'presencial', items: [{ productoId: product, cantidad: 3 }] },
        company,
        user,
      ),
    ).rejects.toThrow('disponible 2 (3 reservado para pedidos)');
    await sales.create(
      { canal: 'presencial', items: [{ productoId: product, cantidad: 2 }] },
      company,
      user,
    );
    expect(await stockRow(product)).toMatchObject({ stockTotal: 3, reservado: 3, disponible: 0 });

    // Another order cannot take them either, and stays as it was.
    const second = await order(product, 1);
    await expect(move(second, 'CONFIRMADO')).rejects.toThrow(
      `Stock insuficiente para «P19-6 Yerba ${suffix}»: disponible 0, pedido 1.`,
    );
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: second } })).estado).toBe(
      'RECIBIDO',
    );

    // The store shows what is available.
    const page = await new StoreCatalogService(scoped).product(company, product);
    expect(page).toMatchObject({ disponible: false, stockTotal: 0 });

    // The stock leaves when the order leaves the business, once, at the product's cost.
    await move(first, 'EN_PREPARACION');
    await move(first, 'LISTO');
    expect(await movementsOf(first)).toHaveLength(0);
    await move(first, 'EN_CAMINO');
    const out = await movementsOf(first);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tipoMovimiento: 'Salida', motivo: 'Venta' });
    expect(Number(out[0].cantidad)).toBe(3);
    expect(Number(out[0].costoUnitario)).toBe(10);
    expect(await stockRow(product)).toMatchObject({ stockTotal: 0, reservado: 0, disponible: 0 });
    await move(first, 'ENTREGADO');
    expect(await movementsOf(first)).toHaveLength(1);

    const audit = await prisma.auditLog.findMany({
      where: { empresaId: company, accion: 'PEDIDO_ESTADO', entidadId: first },
    });
    expect(audit).toHaveLength(5);
  });

  it('an order picked up in the business leaves when it is delivered', async () => {
    const pickup = await stocked('Miel', 4);
    const id = await order(pickup.id, 4);
    await move(id, 'CONFIRMADO');
    await move(id, 'ENTREGADO');
    const out = await movementsOf(id);
    expect(out.map((m) => [m.tipoMovimiento, Number(m.cantidad)])).toEqual([['Salida', 4]]);
    expect(await lotQuantity(pickup.lot)).toBe(0);
  });

  it('a failed delivery brings the goods back, still reserved; sending it again takes them out once more', async () => {
    const goods = await stocked('Avena', 6);
    const id = await order(goods.id, 4);
    await move(id, 'CONFIRMADO');
    await move(id, 'EN_CAMINO');
    expect(await lotQuantity(goods.lot)).toBe(2);

    await move(id, 'ENTREGA_FALLIDA');
    expect(await lotQuantity(goods.lot)).toBe(6);
    const back = (await movementsOf(id)).filter((m) => m.tipoMovimiento === 'Entrada');
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ motivo: 'Entrega fallida', loteId: goods.lot });
    expect(Number(back[0].costoUnitario)).toBe(10);
    // Back in the business, but still the order's.
    expect(await stockRow(goods.id)).toMatchObject({ stockTotal: 6, reservado: 4, disponible: 2 });

    await move(id, 'EN_CAMINO');
    expect(await lotQuantity(goods.lot)).toBe(2);
    await move(id, 'ENTREGADO');
    expect((await movementsOf(id)).map((m) => m.tipoMovimiento)).toEqual([
      'Salida',
      'Entrada',
      'Salida',
    ]);
    await expect(orders.cancelOrder(id, company, user)).rejects.toThrow(ConflictException);
  });

  it('cancelling before the exit only releases the reservation; after a failed delivery nothing comes back twice', async () => {
    const goods = await stocked('Arroz', 5);
    const ready = await order(goods.id, 2);
    await move(ready, 'CONFIRMADO');
    await move(ready, 'LISTO');
    const cancelled = await orders.cancelOrder(ready, company, user, 'El cliente ya no lo quiere');
    expect(cancelled).toMatchObject({ estado: 'CANCELADO', stockReversedItems: 0 });
    expect(await movementsOf(ready)).toHaveLength(0);
    expect(await stockRow(goods.id)).toMatchObject({ stockTotal: 5, reservado: 0, disponible: 5 });

    const failed = await order(goods.id, 3);
    await move(failed, 'CONFIRMADO');
    await move(failed, 'EN_CAMINO');
    await move(failed, 'ENTREGA_FALLIDA');
    const second = await orders.cancelOrder(failed, company, user);
    expect(second.stockReversedItems).toBe(0);
    expect(await lotQuantity(goods.lot)).toBe(5);

    const onTheWay = await order(goods.id, 1);
    await move(onTheWay, 'CONFIRMADO');
    await move(onTheWay, 'EN_CAMINO');
    await expect(orders.cancelOrder(onTheWay, company, user)).rejects.toThrow(
      'no puede ser cancelado: su mercadería ya salió del local',
    );
  });

  it('an order confirmed before stage B3 (stock already deducted) does not leave twice, and is reversed once', async () => {
    const goods = await stocked('Fideos', 10);
    const legacy = async () => {
      const id = await order(goods.id, 2);
      await prisma.pedido.update({ where: { id }, data: { estado: 'CONFIRMADO' } });
      await scoped
        .forCompany(company)
        .$transaction((tx) => inventory.deductStock(tx, company, goods.id, 2, 'Venta', id, user));
      return id;
    };
    const shipped = await legacy();
    await move(shipped, 'EN_CAMINO');
    expect((await movementsOf(shipped)).filter((m) => m.tipoMovimiento === 'Salida')).toHaveLength(
      1,
    );
    expect(await lotQuantity(goods.lot)).toBe(8);

    const dropped = await legacy();
    const first = await orders.cancelOrder(dropped, company, user);
    const again = await orders.cancelOrder(dropped, company, user);
    expect([first.stockReversedItems, again.stockReversedItems]).toEqual([1, 0]);
    expect(await lotQuantity(goods.lot)).toBe(8);
  });

  it('follows the transitions: no skipping confirmation, and delivered or cancelled are final', async () => {
    const goods = await stocked('Sal', 3);
    const id = await order(goods.id, 1);
    await expect(move(id, 'EN_CAMINO')).rejects.toThrow(BadRequestException);
    await move(id, 'CONFIRMADO');
    await expect(move(id, 'ENTREGA_FALLIDA')).rejects.toThrow('no se puede pasar');
    await move(id, 'ENTREGADO');
    await expect(move(id, 'EN_CAMINO')).rejects.toThrow('no se puede pasar');
    const other = await order(goods.id, 1);
    await orders.cancelOrder(other, company, user);
    await expect(move(other, 'CONFIRMADO')).rejects.toThrow('no se puede pasar');
  });

  it('two orders competing for the last unit: one is confirmed and the other refused', async () => {
    const last = await stocked('Cafe', 1);
    const ids = [await order(last.id, 1), await order(last.id, 1)];
    const results = await Promise.allSettled(ids.map((id) => move(id, 'CONFIRMADO')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(refused?.reason).toBeInstanceOf(BadRequestException);
    expect(await stockRow(last.id)).toMatchObject({ stockTotal: 1, reservado: 1, disponible: 0 });
  });
});
