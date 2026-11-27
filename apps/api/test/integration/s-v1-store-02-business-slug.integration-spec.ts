import type { ChildProcess } from 'child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { FakeMercadoPago, placePaidOrder } from './helpers/mercadopago.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

describe('STORE-V1-02 — public Business slug resolution', () => {
  const PORT = '3392';
  // OR-B4-055: orders are paid at checkout; store A takes payments with a fake Mercado Pago.
  const mp = new FakeMercadoPago(3416);
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let companyA: { id: string; slug: string };
  let companyB: { id: string; slug: string };
  let productA: { id: string; nombre: string };
  let productB: { id: string; nombre: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    companyA = await prisma.empresa.create({
      data: {
        nombre: `STORE-V1-02 A ${suffix}`,
        slug: `store-v1-02-a-${suffix}`,
        configuracion: {},
      },
      select: { id: true, slug: true },
    });
    companyB = await prisma.empresa.create({
      data: {
        nombre: `STORE-V1-02 B ${suffix}`,
        slug: `store-v1-02-b-${suffix}`,
        configuracion: {},
      },
      select: { id: true, slug: true },
    });
    productA = await createStoreProduct(prisma, companyA.id, 'STORE-V1-02', 'A', suffix);
    productB = await createStoreProduct(prisma, companyB.id, 'STORE-V1-02', 'B', suffix);
    await mp.start();
    await mp.connect(prisma, companyA.id);
    server = spawnApi({ PORT, ...mp.env(BASE) });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    await mp.close();
    if (server && !server.killed) server.kill();
    await deleteStoreCompanies(prisma, [companyA.id, companyB.id]);
    await prisma.$disconnect();
  });

  it('resolves Business A by slug and scopes the public catalog to A', async () => {
    const res = await request(BASE).get(`/${companyA.slug}/tienda/productos`).expect(200);
    expect(res.body.map((p: { productoId: string }) => p.productoId)).toEqual([productA.id]);
    expect(res.body[0]).not.toHaveProperty('empresaId');
  });

  it('resolves Business B independently and never leaks A data', async () => {
    const res = await request(BASE).get(`/${companyB.slug}/tienda/productos`).expect(200);
    expect(res.body.map((p: { productoId: string }) => p.productoId)).toEqual([productB.id]);
  });

  it('resolves hierarchy inside the selected BusinessContext', async () => {
    const res = await request(BASE).get(`/${companyA.slug}/tienda/jerarquia`).expect(200);
    expect(res.body.familias).toHaveLength(1);
    expect(res.body.subfamilias).toHaveLength(1);
    expect(res.body.familias[0].empresaId).toBe(companyA.id);
    expect(res.body.subfamilias[0].empresaId).toBe(companyA.id);
  });

  /** A signed-in customer of A (OR-B4-055: only a signed-in customer pays an order). */
  const customerOfA = async (tag: string) => {
    const cliente = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: tag, email: `${tag}-${suffix}@example.test` },
      select: { id: true },
    });
    return `Bearer ${signCustomerToken(cliente.id, companyA.id)}`;
  };

  it('uses the slug-scoped Business for order creation and tracking', async () => {
    const { order } = await placePaidOrder(BASE, mp, prisma, {
      slug: companyA.slug,
      companyId: companyA.id,
      auth: await customerOfA('store-v1-02'),
      items: [{ productoId: productA.id, cantidad: 1 }],
    });
    expect(order.empresaId).toBe(companyA.id);
    const tracking = await request(BASE)
      .get(`/${companyA.slug}/tienda/pedidos/${order.id}`)
      .expect(200);
    expect(tracking.body.id).toBe(order.id);
  });

  it('does not allow a product from another Business through a slug-scoped order', async () => {
    const res = await request(BASE)
      .post(`/${companyA.slug}/tienda/mis-pedidos`)
      .set('Authorization', await customerOfA('cross'))
      .send({ items: [{ productoId: productB.id, cantidad: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`Producto ${productB.id} no disponible`);
  });

  it('returns 404 for an unknown or invalid public Business slug', async () => {
    await request(BASE).get('/does-not-exist/tienda/jerarquia').expect(404);
    await request(BASE).get('/INVALID_SLUG/tienda/jerarquia').expect(404);
  });

  it('the slug alone decides the Business', async () => {
    const res = await request(BASE).get(`/${companyB.slug}/tienda/jerarquia`).expect(200);
    expect(res.body.familias[0].empresaId).toBe(companyB.id);
  });
});
