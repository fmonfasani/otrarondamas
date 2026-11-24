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
 * OR-B4-046 §4.4 (D4) and D5, stage C3 — offers between two days. Only who holds PROMOTIONS_MANAGE
 * (Owner, Admin) creates and ends them. In force they set the price in the store, at the counter
 * and in the chat (a «solo tienda» offer only in the store); the product's discount and an offer
 * never add up, the lowest price wins. Every order and sale line keeps the offer that set its
 * price. A scheduled offer does not apply yet; an ended one no longer does.
 */
describe('P20-3 — ofertas con fecha', () => {
  const PORT = '3405';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let sales: SalesService;
  let store: StoreService;
  let suffix: number;
  let shop: { id: string; slug: string };
  let other: { id: string; slug: string };
  const ids: Record<string, string> = {};
  let arrozFamilia: string;
  const people: Record<string, { usuarioId: string; auth: string }> = {};

  const day = (offset: number) => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + offset * 86_400_000);
    return d.toISOString().slice(0, 10);
  };

  async function person(role: 'OWNER' | 'VENDEDOR', key: string, legacy: string[]) {
    const email = `p20-3-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: shop.id, nombre: `P20-3 ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `P20-3 ${key}`, usuarioId: usuario.id },
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
        data: { usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: shop.id, permisos: [] })}`,
    };
  }

  const offer = (who: string, body: object) =>
    request(BASE).post('/ofertas').set('Authorization', people[who].auth).send(body);
  const storeRow = async (id: string) => {
    const res = await request(BASE).get(`/${shop.slug}/tienda/productos/${id}`).expect(200);
    return res.body as {
      precio: string;
      precioSinDescuento: string | null;
      oferta: { nombre: string } | null;
    };
  };
  const counterPrice = async (id: string) => {
    const quote = await sales.quote({ items: [{ productoId: id, cantidad: 1 }] } as never, shop.id);
    return Number((quote as { total: string }).total);
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const scoped = new CompanyScopedPrismaService(prisma);
    const inventory = new InventoryService(scoped);
    sales = new SalesService(
      scoped,
      inventory,
      new LoyaltyService(scoped),
      new CustomersService(scoped),
    );
    store = new StoreService(
      scoped,
      inventory,
      new LoyaltyService(scoped),
      new CustomersService(scoped),
    );
    suffix = Date.now();
    const company = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P20-3 ${tag} ${suffix}`,
          slug: `p20-3-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    shop = await company('shop');
    other = await company('other');
    await person('OWNER', 'owner', ['productos.gestionar']);
    await person('VENDEDOR', 'seller', []);
    // Yerba 1500; Fideos 600 with its own 10 % discount (540); Arroz 800, in its own category.
    for (const [key, price] of [
      ['Yerba', 1500],
      ['Fideos', 600],
      ['Arroz', 800],
    ] as const) {
      // The fixture's tag is part of a 3-letter category prefix: one letter each.
      ids[key] = (await createStoreProduct(prisma, shop.id, 'P20-3', key.slice(0, 1), suffix)).id;
      await prisma.producto.update({ where: { id: ids[key] }, data: { precioMinorista: price } });
    }
    await prisma.producto.update({ where: { id: ids.Fideos }, data: { descuentoPorcentaje: 10 } });
    arrozFamilia = (await prisma.producto.findUniqueOrThrow({ where: { id: ids.Arroz } }))
      .familiaId;
    ids.Ajeno = (await createStoreProduct(prisma, other.id, 'P20-3', 'Z', suffix)).id;

    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [shop.id, other.id];
    const usuarioIds = (
      await prisma.usuario.findMany({
        where: { empresaId: { in: companies } },
        select: { id: true },
      })
    ).map((u) => u.id);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, companies);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    // The counter sale moved stock in the name of a person: its movements go before the people.
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pago.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pedidoItem.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ofertaProducto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.oferta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('only who manages promotions creates an offer, and a wrong one is refused', async () => {
    const yerba = {
      nombre: 'Semana de la yerba',
      tipo: 'PORCENTAJE',
      descuentoPorcentaje: 20,
      desde: day(0),
      hasta: day(6),
      productoIds: [ids.Yerba],
    };
    await offer('seller', yerba).expect(403);
    await offer('owner', {
      ...yerba,
      tipo: 'PRECIO',
      descuentoPorcentaje: undefined,
      precioOferta: 2000,
    }).expect(400);
    await offer('owner', {
      ...yerba,
      productoIds: undefined,
      tipo: 'PRECIO',
      precioOferta: 100,
      familiaId: arrozFamilia,
    }).expect(400);
    await offer('owner', { ...yerba, desde: day(-9), hasta: day(-2) }).expect(400);
    await offer('owner', { ...yerba, productoIds: [ids.Ajeno] }).expect(404);
    const created = await offer('owner', yerba).expect(201);
    ids.yerbaOffer = created.body.id;
    const [entry] = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, accion: 'OFERTA_CREADA', entidadId: ids.yerbaOffer },
    });
    expect(entry.valoresPosteriores).toMatchObject({
      nombre: 'Semana de la yerba',
      descuentoPorcentaje: 20,
    });
  });

  it('the store shows the offer price and the «Oferta» mark; «En oferta» lists what is lowered', async () => {
    expect(await storeRow(ids.Yerba)).toMatchObject({
      precio: '1200.00',
      precioSinDescuento: '1500.00',
      oferta: { nombre: 'Semana de la yerba' },
    });
    const onSale = await request(BASE).get(`/${shop.slug}/tienda/catalogo?oferta=1`).expect(200);
    const byId = (a: string, b: string) => a.localeCompare(b);
    expect(
      onSale.body.productos.map((p: { productoId: string }) => p.productoId).sort(byId),
    ).toEqual([ids.Fideos, ids.Yerba].sort(byId));
  });

  it("an offer and the product's discount never add up: the lowest price wins", async () => {
    await offer('owner', {
      nombre: 'Fideos 5 %',
      tipo: 'PORCENTAJE',
      descuentoPorcentaje: 5,
      desde: day(0),
      hasta: day(3),
      productoIds: [ids.Fideos],
    }).expect(201);
    // Its own 10 % (540) beats the offer's 5 % (570); never 513.
    expect(await storeRow(ids.Fideos)).toMatchObject({ precio: '540.00', oferta: null });
  });

  it('a «solo tienda» category offer lowers the store and leaves the counter and the chat alone', async () => {
    const arroz = await offer('owner', {
      nombre: 'Arroz online',
      tipo: 'PORCENTAJE',
      descuentoPorcentaje: 10,
      desde: day(0),
      hasta: day(3),
      familiaId: arrozFamilia,
      soloTienda: true,
    }).expect(201);
    expect((await storeRow(ids.Arroz)).precio).toBe('720.00');
    expect(await counterPrice(ids.Arroz)).toBe(800);
    expect(await counterPrice(ids.Yerba)).toBe(1200);

    // An order taken in the chat skips it; one placed in the store keeps it, with its offer.
    const chat = await store.createOrder(
      {
        nombre: 'Chat',
        email: `p20-3-chat-${suffix}@example.test`,
        items: [{ productoId: ids.Arroz, cantidad: 1 }],
      },
      shop.id,
      'messaging',
    );
    expect(chat.PedidoItem[0]).toMatchObject({ ofertaId: null });
    expect(Number(chat.PedidoItem[0].precioUnitario)).toBe(800);
    const web = await request(BASE)
      .post(`/${shop.slug}/tienda/pedidos`)
      .send({
        nombre: 'Web',
        email: `p20-3-web-${suffix}@example.test`,
        items: [{ productoId: ids.Arroz, cantidad: 1 }],
      })
      .expect(201);
    const line = await prisma.pedidoItem.findFirstOrThrow({ where: { pedidoId: web.body.id } });
    expect(Number(line.precioUnitario)).toBe(720);
    expect(line.ofertaId).toBe(arroz.body.id);
  });

  it('the counter sale keeps the offer that set its price', async () => {
    const sale = await sales.create(
      { canal: 'presencial', items: [{ productoId: ids.Yerba, cantidad: 2 }] } as never,
      shop.id,
      people.owner.usuarioId,
    );
    const line = await prisma.ventaItem.findFirstOrThrow({ where: { ventaId: sale.id } });
    expect(Number(line.precioUnitario)).toBe(1200);
    expect(line.ofertaId).toBe(ids.yerbaOffer);
    expect(Number(sale.total)).toBe(2400);
  });

  it('a scheduled offer does not apply yet, and the list says where each one stands', async () => {
    await offer('owner', {
      nombre: 'Arroz a 500 desde mañana',
      tipo: 'PRECIO',
      precioOferta: 500,
      desde: day(1),
      hasta: day(5),
      productoIds: [ids.Arroz],
    }).expect(201);
    expect((await storeRow(ids.Arroz)).precio).toBe('720.00');
    const list = await request(BASE)
      .get('/ofertas')
      .set('Authorization', people.seller.auth)
      .expect(200);
    const states = Object.fromEntries(
      list.body.map((o: { nombre: string; estado: string }) => [o.nombre, o.estado]),
    );
    expect(states).toMatchObject({
      'Semana de la yerba': 'vigente',
      'Arroz online': 'vigente',
      'Arroz a 500 desde mañana': 'programada',
    });
  });

  it('ending an offer brings the price back, once, and is recorded', async () => {
    await request(BASE)
      .post(`/ofertas/${ids.yerbaOffer}/terminar`)
      .set('Authorization', people.seller.auth)
      .expect(403);
    await request(BASE)
      .post(`/ofertas/${ids.yerbaOffer}/terminar`)
      .set('Authorization', people.owner.auth)
      .expect(200);
    expect(await storeRow(ids.Yerba)).toMatchObject({ precio: '1500.00', oferta: null });
    expect(await counterPrice(ids.Yerba)).toBe(1500);
    await request(BASE)
      .post(`/ofertas/${ids.yerbaOffer}/terminar`)
      .set('Authorization', people.owner.auth)
      .expect(409);
    const ended = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, accion: 'OFERTA_TERMINADA', entidadId: ids.yerbaOffer },
    });
    expect(ended).toHaveLength(1);
    // The sale made under the offer still points at it.
    expect(await prisma.ventaItem.count({ where: { ofertaId: ids.yerbaOffer } })).toBe(1);
  });
});
