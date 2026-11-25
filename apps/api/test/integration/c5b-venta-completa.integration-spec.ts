import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { createStoreProduct, deleteStoreCompanies } from './helpers/store-catalog.fixture';

/**
 * C5B — a complete sale in a Business's store, end to end over HTTP, on the store customers use
 * today (`/:slug/tienda`, OR-B4-046/047): catalog → cart → order → tracking.
 *
 * - The order is RECIBIDO and touches no stock: the Business confirming it reserves the stock
 *   (OR-B4-049 / R8-ORD-002).
 * - Each store only sells and shows its own Business's products and orders.
 *
 * This suite replaces the old `test/e2e/commerce-venta-completa`, which tested the single-store
 * routes (`/store/*`, TIENDA_EMPRESA_ID) and never ran in CI.
 */
describe('C5B — venta completa en la tienda del negocio', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: number;
  let shop: { id: string; slug: string };
  let other: { id: string; slug: string };
  let product: { id: string; nombre: string };
  let otherProduct: { id: string; nombre: string };
  let customerId: string;
  const auth = () => `Bearer ${signCustomerToken(customerId, shop.id)}`;
  const http = () => request(app.getHttpServer());

  /** Stock left in the product's lots. */
  const stockOf = async (productoId: string) =>
    (await prisma.lote.findMany({ where: { productoId }, select: { cantidad: true } })).reduce(
      (sum, lot) => sum + Number(lot.cantidad),
      0,
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    suffix = Date.now();
    const business = (label: string) =>
      prisma.empresa.create({
        data: {
          nombre: `C5B ${label} ${suffix}`,
          slug: `c5b-${label.toLowerCase()}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    shop = await business('Tienda');
    other = await business('Otro');
    // Price 10, stock 5, published in the Catálogo.
    product = await createStoreProduct(prisma, shop.id, 'C5B', 'A', suffix);
    otherProduct = await createStoreProduct(prisma, other.id, 'C5B', 'B', suffix);
    customerId = (
      await prisma.cliente.create({
        data: {
          empresaId: shop.id,
          nombre: 'C5B Cliente',
          email: `c5b-cliente-${suffix}@example.test`,
          telefono: '+5491100000000',
        },
        select: { id: true },
      })
    ).id;
  }, 60000);

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { businessId: { in: [shop.id, other.id] } } });
    await prisma.cart.deleteMany({ where: { businessId: { in: [shop.id, other.id] } } });
    await deleteStoreCompanies(prisma, [shop.id, other.id]);
    await app.close();
  });

  describe('catalog (anonymous)', () => {
    it('lists the store’s product with its price and stock, and not another Business’s', async () => {
      const res = await http()
        .get(`/${shop.slug}/tienda/productos`)
        .query({ search: product.nombre })
        .expect(200);

      const listed = res.body.find((p: { productoId: string }) => p.productoId === product.id);
      expect(listed).toMatchObject({
        nombre: product.nombre,
        precio: '10.00',
        disponible: true,
        stockTotal: 5,
      });
      expect(
        res.body.find((p: { productoId: string }) => p.productoId === otherProduct.id),
      ).toBeUndefined();
    });

    it('returns the store’s category tree', async () => {
      const res = await http().get(`/${shop.slug}/tienda/jerarquia`).expect(200);
      expect(res.body.familias).toBeInstanceOf(Array);
      expect(res.body.familias.length).toBeGreaterThan(0);
    });
  });

  describe('cart (signed-in customer)', () => {
    let cartId: string;
    const lines = async () =>
      (await http().get(`/cart/${cartId}`).set('Authorization', auth()).expect(200)).body
        .CartItem as Array<{ id: string; productoId: string; cantidad: string; precio: string }>;

    it('creates the customer’s cart', async () => {
      const res = await http().post('/cart').set('Authorization', auth()).expect(201);
      expect(res.body.customerId).toBe(customerId);
      cartId = res.body.id;
    });

    it('adds, changes and removes a line, with the catalog price', async () => {
      await http()
        .post(`/cart/${cartId}/items`)
        .set('Authorization', auth())
        .send({ productoId: product.id, cantidad: 2 })
        .expect(201);
      let cart = await lines();
      expect(cart).toHaveLength(1);
      expect(cart[0].productoId).toBe(product.id);
      expect(Number(cart[0].cantidad)).toBe(2);
      expect(cart[0].precio).toBe('10.00');

      await http()
        .patch(`/cart/${cartId}/items/${cart[0].id}`)
        .set('Authorization', auth())
        .send({ cantidad: 3 })
        .expect(200);
      cart = await lines();
      expect(Number(cart[0].cantidad)).toBe(3);

      await http()
        .delete(`/cart/${cartId}/items/${cart[0].id}`)
        .set('Authorization', auth())
        .expect(204);
      expect(await lines()).toHaveLength(0);
    });
  });

  describe('order and tracking', () => {
    let orderId: string;

    it('a signed-in customer orders: RECIBIDO, filed under their account, stock untouched', async () => {
      const res = await http()
        .post(`/${shop.slug}/tienda/mis-pedidos`)
        .set('Authorization', auth())
        .send({ items: [{ productoId: product.id, cantidad: 2 }] })
        .expect(201);
      expect(res.body.estado).toBe('RECIBIDO');
      orderId = res.body.id;

      const mine = await http()
        .get(`/${shop.slug}/tienda/mis-pedidos`)
        .set('Authorization', auth())
        .expect(200);
      const placed = mine.body.find((o: { id: string }) => o.id === orderId);
      expect(placed.items).toEqual([{ producto: product.nombre, cantidad: 2 }]);
      expect(Number(placed.total)).toBe(20);

      // OR-B4-049: receiving the order neither reserves nor deducts stock.
      expect(await stockOf(product.id)).toBe(5);
    });

    it('anyone with the order’s id can follow it, only in its own store', async () => {
      const res = await http().get(`/${shop.slug}/tienda/pedidos/${orderId}`).expect(200);
      expect(res.body).toMatchObject({ id: orderId, estado: 'RECIBIDO' });
      expect(res.body.items).toHaveLength(1);

      const elsewhere = await http().get(`/${other.slug}/tienda/pedidos/${orderId}`);
      expect([400, 404]).toContain(elsewhere.status);
      expect(elsewhere.body.estado).toBeUndefined();
    });

    it('an anonymous order also starts RECIBIDO', async () => {
      const res = await http()
        .post(`/${shop.slug}/tienda/pedidos`)
        .send({
          nombre: 'C5B Anónimo',
          email: `c5b-anonimo-${suffix}@example.test`,
          telefono: '+5491100000001',
          items: [{ productoId: product.id, cantidad: 1 }],
        })
        .expect(201);
      expect(res.body.estado).toBe('RECIBIDO');
      expect(await stockOf(product.id)).toBe(5);
    });

    it('refuses more than the available stock, and another Business’s product, writing nothing', async () => {
      const before = await prisma.pedido.count({ where: { empresaId: shop.id } });

      await http()
        .post(`/${shop.slug}/tienda/mis-pedidos`)
        .set('Authorization', auth())
        .send({ items: [{ productoId: product.id, cantidad: 99 }] })
        .expect(400);
      const foreign = await http()
        .post(`/${shop.slug}/tienda/mis-pedidos`)
        .set('Authorization', auth())
        .send({ items: [{ productoId: otherProduct.id, cantidad: 1 }] });
      expect(foreign.status).toBeGreaterThanOrEqual(400);
      expect(foreign.status).toBeLessThan(500);

      expect(await prisma.pedido.count({ where: { empresaId: shop.id } })).toBe(before);
      expect(await stockOf(otherProduct.id)).toBe(5);
    });
  });
});
