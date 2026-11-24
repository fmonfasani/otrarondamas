import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { CustomersService } from '../../src/customers/customers.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SalesService } from '../../src/sales/sales.service';
import { StoreService } from '../../src/store/store.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
  deleteMessagingOf,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-051 (OR-B4-046 D5, D6), stage C4 — discounts never add up: the list price, the product's
 * discount (now in every channel), the offer, a wholesale customer's price, the counter's
 * payment-method discount and the loyalty discount compete, and the customer pays the lowest. Each
 * line keeps which one won. Only who changes prices sets the payment-method discounts and marks
 * wholesale customers, and both are audited. A sale priced with a payment-method discount must be
 * paid with that method.
 */
describe('P20-4 — regla de descuentos', () => {
  const PORT = '3406';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let sales: SalesService;
  let store: StoreService;
  let suffix: number;
  let shop: { id: string; slug: string };
  const ids: Record<string, string> = {};
  const people: Record<string, { usuarioId: string; auth: string }> = {};

  async function person(role: 'OWNER' | 'VENDEDOR', key: string, legacy: string[]) {
    const email = `p20-4-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: shop.id, nombre: `P20-4 ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `P20-4 ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: shop.id, role, status: 'ACTIVE' },
    });
    // In `shadow` the legacy assignment decides the route guards.
    for (const nombre of legacy) {
      const permiso = await prisma.permiso.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
        select: { id: true },
      });
      await prisma.usuarioPermiso.create({
        data: { empresaId: shop.id, usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: shop.id, permisos: [] })}`,
    };
  }

  const api = (method: 'patch' | 'post', path: string, who: string, body: object) =>
    request(BASE)[method](path).set('Authorization', people[who].auth).send(body);
  const quote = async (items: Array<[string, number]>, extra: object = {}) =>
    (await sales.quote(
      {
        canal: 'presencial',
        items: items.map(([productoId, cantidad]) => ({ productoId, cantidad })),
        ...extra,
      } as never,
      shop.id,
    )) as { total: string; items: Array<{ precioUnitario: string }> };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const scoped = new CompanyScopedPrismaService(prisma);
    const inventory = new InventoryService(scoped);
    const loyalty = new LoyaltyService(scoped);
    const customers = new CustomersService(scoped);
    sales = new SalesService(scoped, inventory, loyalty, customers);
    store = new StoreService(scoped, inventory, loyalty, customers);
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `P20-4 ${suffix}`, slug: `p20-4-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    await person('OWNER', 'owner', ['productos.gestionar', 'clientes.gestionar']);
    await person('VENDEDOR', 'seller', ['clientes.gestionar']);
    // Yerba: list 1000, its own 10 % (900), wholesale 700. Mate: list 500, nothing else.
    ids.Yerba = (await createStoreProduct(prisma, shop.id, 'P20-4', 'Y', suffix)).id;
    await prisma.producto.update({
      where: { id: ids.Yerba },
      data: { precioMinorista: 1000, descuentoPorcentaje: 10, precioMayorista: 700 },
    });
    ids.Mate = (await createStoreProduct(prisma, shop.id, 'P20-4', 'M', suffix)).id;
    await prisma.producto.update({ where: { id: ids.Mate }, data: { precioMinorista: 500 } });
    ids.retail = (
      await prisma.cliente.create({
        data: {
          empresaId: shop.id,
          nombre: 'Minorista',
          email: `p20-4-retail-${suffix}@example.test`,
        },
      })
    ).id;
    ids.wholesale = (
      await prisma.cliente.create({
        data: {
          empresaId: shop.id,
          nombre: 'Almacén Don Pepe',
          email: `p20-4-pepe-${suffix}@example.test`,
        },
      })
    ).id;
    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const empresaId = shop.id;
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, [empresaId]);
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId } });
    await prisma.pago.deleteMany({ where: { empresaId } });
    await prisma.ventaItem.deleteMany({ where: { empresaId } });
    await prisma.venta.deleteMany({ where: { empresaId } });
    await prisma.pedidoItem.deleteMany({ where: { empresaId } });
    await prisma.pedido.deleteMany({ where: { empresaId } });
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.membership.deleteMany({ where: { businessId: empresaId } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, [empresaId]);
    await prisma.$disconnect();
  });

  it("the product's own discount now applies at the counter", async () => {
    expect(Number((await quote([[ids.Yerba, 1]])).total)).toBe(900);
  });

  it('only who changes prices sets the payment-method discounts, and it is audited', async () => {
    const body = { descuentoEfectivo: 15, descuentoTransferencia: 5 };
    await api('patch', '/negocio/precios', 'seller', body).expect(403);
    const saved = await api('patch', '/negocio/precios', 'owner', body).expect(200);
    expect(saved.body).toEqual(body);
    const [entry] = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, accion: 'NEGOCIO_DESCUENTOS_MEDIO_PAGO' },
    });
    expect(entry.valoresAnteriores).toEqual({ descuentoEfectivo: 0, descuentoTransferencia: 0 });
    expect(entry.valoresPosteriores).toEqual(body);
  });

  it('paying in cash wins when it is the lowest, and never adds up with the rest', async () => {
    // Yerba: its own 10 % (900) vs cash 15 % (850) → 850. Mate: cash 15 % → 425. Transfer 5 % loses to the 10 %.
    expect(
      Number(
        (
          await quote(
            [
              [ids.Yerba, 1],
              [ids.Mate, 1],
            ],
            { medioPago: 'efectivo' },
          )
        ).total,
      ),
    ).toBe(1275);
    expect(Number((await quote([[ids.Yerba, 1]], { medioPago: 'transferencia' })).total)).toBe(900);
    expect(Number((await quote([[ids.Yerba, 1]], { medioPago: 'QR' })).total)).toBe(900);
  });

  it('a sale priced with the cash discount keeps it, and must be paid in cash', async () => {
    const sale = await sales.create(
      {
        canal: 'presencial',
        items: [{ productoId: ids.Yerba, cantidad: 1 }],
        medioPago: 'efectivo',
      } as never,
      shop.id,
      people.owner.usuarioId,
    );
    expect(sale.medioPagoDescuento).toBe('efectivo');
    expect(Number(sale.total)).toBe(850);
    const [line] = await prisma.ventaItem.findMany({ where: { ventaId: sale.id } });
    expect(line.origenPrecio).toBe('MEDIO_PAGO');
    await expect(
      sales.createPayment(
        sale.id,
        { medio: 'transferencia', monto: 850 } as never,
        shop.id,
        people.owner.usuarioId,
      ),
    ).rejects.toThrow('MEDIO_PAGO_DEL_DESCUENTO');
    // Without the cash discount winning, the sale is free to be paid any way.
    const plain = await sales.create(
      {
        canal: 'presencial',
        items: [{ productoId: ids.Yerba, cantidad: 1 }],
        medioPago: 'transferencia',
      } as never,
      shop.id,
      people.owner.usuarioId,
    );
    expect(plain.medioPagoDescuento).toBeNull();
  });

  it('only who changes prices marks a wholesale customer, and it is audited', async () => {
    await api('patch', `/clientes/${ids.wholesale}`, 'seller', { esMayorista: true }).expect(403);
    // The seller still edits the rest of the customer.
    await api('patch', `/clientes/${ids.wholesale}`, 'seller', { telefono: '223 555-0100' }).expect(
      200,
    );
    const marked = await api('patch', `/clientes/${ids.wholesale}`, 'owner', {
      esMayorista: true,
    }).expect(200);
    expect(marked.body.esMayorista).toBe(true);
    const [entry] = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, accion: 'CLIENTE_MAYORISTA', entidadId: ids.wholesale },
    });
    expect(entry.valoresAnteriores).toMatchObject({ esMayorista: false });
    expect(entry.valoresPosteriores).toMatchObject({ esMayorista: true });
  });

  it('a wholesale customer pays the wholesale price at the counter and in an order', async () => {
    expect(Number((await quote([[ids.Yerba, 2]], { clienteId: ids.wholesale })).total)).toBe(1400);
    // A product without a wholesale price: the customer pays the best of the rest.
    expect(Number((await quote([[ids.Mate, 1]], { clienteId: ids.wholesale })).total)).toBe(500);
    const order = await store.createOrder(
      {
        nombre: 'Almacén Don Pepe',
        email: `p20-4-pepe-${suffix}@example.test`,
        items: [{ productoId: ids.Yerba, cantidad: 1 }],
      },
      shop.id,
      'messaging',
    );
    expect(order.PedidoItem[0]).toMatchObject({ origenPrecio: 'MAYORISTA' });
    expect(Number(order.PedidoItem[0].precioUnitario)).toBe(700);
  });

  it('the loyalty discount competes instead of adding up', async () => {
    await prisma.reglaFidelizacion.create({
      data: {
        empresaId: shop.id,
        nombre: 'Nuevos 20 %',
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 20,
      },
    });
    // Yerba: loyalty 20 % (800) beats its own 10 % (900): kept as list price plus the percent.
    const order = await store.createOrder(
      {
        nombre: 'Minorista',
        email: `p20-4-retail-${suffix}@example.test`,
        items: [
          { productoId: ids.Yerba, cantidad: 1 },
          { productoId: ids.Mate, cantidad: 1 },
        ],
      },
      shop.id,
      'web',
    );
    const line = (id: string) => order.PedidoItem.find((i) => i.productoId === id)!;
    expect(line(ids.Yerba)).toMatchObject({ origenPrecio: 'FIDELIZACION' });
    expect(Number(line(ids.Yerba).precioUnitario)).toBe(1000);
    expect(Number(line(ids.Yerba).descuentoFidelizacionPorcentaje)).toBe(20);
    // Never 1000 × 0.9 × 0.8 = 720: the total is 800 + 400.
    expect(Number(order.total)).toBe(1200);
    // At the counter, cash 15 % (425) still loses to loyalty 20 % (400) on the Mate.
    expect(
      Number(
        (await quote([[ids.Mate, 1]], { clienteId: ids.retail, medioPago: 'efectivo' })).total,
      ),
    ).toBe(400);
  });
});
