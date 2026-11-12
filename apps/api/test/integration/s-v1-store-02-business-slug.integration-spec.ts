import type { ChildProcess } from 'child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

describe('STORE-V1-02 — public Business slug resolution', () => {
  const PORT = '3392';
  const LEGACY_PORT = '3393';
  const BASE = `http://127.0.0.1:${PORT}`;
  const LEGACY_BASE = `http://127.0.0.1:${LEGACY_PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let legacyServer: ChildProcess;
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
    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    legacyServer = spawnApi({ PORT: LEGACY_PORT, TIENDA_EMPRESA_ID: companyA.id });
    await Promise.all([waitPort(Number(PORT)), waitPort(Number(LEGACY_PORT))]);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    if (legacyServer && !legacyServer.killed) legacyServer.kill();
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

  it('uses the slug-scoped Business for order creation and tracking', async () => {
    const email = `store-v1-02-${suffix}@example.test`;
    const order = await request(BASE)
      .post(`/${companyA.slug}/tienda/pedidos`)
      .send({
        nombre: 'Slug Buyer',
        email,
        items: [{ productoId: productA.id, cantidad: 1 }],
      })
      .expect(201);
    expect(order.body.empresaId).toBe(companyA.id);
    const tracking = await request(BASE)
      .get(`/${companyA.slug}/tienda/pedidos/${order.body.id}`)
      .expect(200);
    expect(tracking.body.id).toBe(order.body.id);
  });

  it('does not allow a product from another Business through a slug-scoped order', async () => {
    const res = await request(BASE)
      .post(`/${companyA.slug}/tienda/pedidos`)
      .send({
        nombre: 'Cross Tenant',
        email: `cross-${suffix}@example.test`,
        items: [{ productoId: productB.id, cantidad: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`Producto ${productB.id} no disponible`);
  });

  it('returns 404 for an unknown or invalid public Business slug', async () => {
    await request(BASE).get('/does-not-exist/tienda/jerarquia').expect(404);
    await request(BASE).get('/INVALID_SLUG/tienda/jerarquia').expect(404);
  });

  it('keeps the legacy /tienda surface as the explicit transitional fallback', async () => {
    const res = await request(LEGACY_BASE).get('/tienda/productos').expect(200);
    expect(res.body.map((p: { productoId: string }) => p.productoId)).toEqual([productA.id]);
  });

  it('does not use TIENDA_EMPRESA_ID when the slug route is used', async () => {
    const res = await request(BASE).get(`/${companyB.slug}/tienda/jerarquia`).expect(200);
    expect(res.body.familias[0].empresaId).toBe(companyB.id);
  });
});
