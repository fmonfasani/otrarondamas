import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * STORE-V1-03 — customer account per Business store: register and sign in through the
 * store's slug, order as the signed-in customer and list their own orders. Accounts never
 * cross Businesses.
 */
describe('STORE-V1-03 — customer account in a Business store', () => {
  const PORT = '3389';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let companyA: { id: string; slug: string; nombre: string };
  let companyB: { id: string; slug: string; nombre: string };
  let productA: { id: string; nombre: string };
  let productB: { id: string; nombre: string };
  let email: string;
  let tokenA: string;
  let customerAId: string;
  // Generated per run: no credential literals in the repository.
  const secretA = randomUUID();
  const secretB = randomUUID();
  const wrongSecret = randomUUID();

  const createCompany = (tag: string) =>
    prisma.empresa.create({
      data: {
        nombre: `STORE-V1-03 ${tag} ${suffix}`,
        slug: `store-v1-03-${tag.toLowerCase()}-${suffix}`,
        configuracion: {},
      },
      select: { id: true, slug: true, nombre: true },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    email = `store-v1-03-${suffix}@example.test`;
    companyA = await createCompany('A');
    companyB = await createCompany('B');
    productA = await createStoreProduct(prisma, companyA.id, 'STORE-V1-03', 'A', suffix);
    productB = await createStoreProduct(prisma, companyB.id, 'STORE-V1-03', 'B', suffix);
    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await deleteStoreCompanies(prisma, [companyA.id, companyB.id]);
    await prisma.$disconnect();
  });

  it('shows the store name by slug and 404s an unknown store', async () => {
    const res = await request(BASE).get(`/${companyA.slug}/tienda`).expect(200);
    expect(res.body).toEqual({ nombre: companyA.nombre, slug: companyA.slug });
    await request(BASE).get('/no-such-store/tienda').expect(404);
  });

  it('registers a customer in the Business of the slug', async () => {
    const res = await request(BASE)
      .post(`/auth/cliente/negocio/${companyA.slug}/registro`)
      .send({ nombre: 'Ana Compradora', email, password: secretA })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.cliente).toMatchObject({ email, empresaId: companyA.id, esMayorista: false });
    expect(res.body.cliente).not.toHaveProperty('passwordHash');
    tokenA = res.body.accessToken;
    customerAId = res.body.cliente.id;
  });

  it('refuses a second account with the same email in the same store', async () => {
    const res = await request(BASE)
      .post(`/auth/cliente/negocio/${companyA.slug}/registro`)
      .send({ nombre: 'Otra Ana', email, password: secretB });
    expect(res.status).toBe(400);
  });

  it('signs in only in the store where the account exists', async () => {
    const ok = await request(BASE)
      .post(`/auth/cliente/negocio/${companyA.slug}/login`)
      .send({ email, password: secretA })
      .expect(200);
    expect(ok.body.cliente.id).toBe(customerAId);
    await request(BASE)
      .post(`/auth/cliente/negocio/${companyB.slug}/login`)
      .send({ email, password: secretA })
      .expect(401);
    await request(BASE)
      .post(`/auth/cliente/negocio/${companyA.slug}/login`)
      .send({ email, password: wrongSecret })
      .expect(401);
  });

  it('keeps accounts per store: the same email can register in another Business', async () => {
    const res = await request(BASE)
      .post(`/auth/cliente/negocio/${companyB.slug}/registro`)
      .send({ nombre: 'Ana en B', email, password: secretB })
      .expect(201);
    expect(res.body.cliente.empresaId).toBe(companyB.id);
    expect(res.body.cliente.id).not.toBe(customerAId);
  });

  it('orders as the signed-in customer, filed under their account', async () => {
    const res = await request(BASE)
      .post(`/${companyA.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ productoId: productA.id, cantidad: 2 }] })
      .expect(201);
    expect(res.body).toMatchObject({ empresaId: companyA.id, clienteId: customerAId });
    const customer = await prisma.cliente.findUnique({ where: { id: customerAId } });
    expect(customer?.nombre).toBe('Ana Compradora');
  });

  it('refuses a product of another Business in a customer order', async () => {
    const res = await request(BASE)
      .post(`/${companyA.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ productoId: productB.id, cantidad: 1 }] });
    expect(res.status).toBe(400);
  });

  it('lists only the customer’s own orders', async () => {
    const res = await request(BASE)
      .get(`/${companyA.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].items).toEqual([{ producto: productA.nombre, cantidad: 2 }]);
  });

  it('refuses the account in another Business’s store', async () => {
    await request(BASE)
      .get(`/${companyB.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
    await request(BASE)
      .post(`/${companyB.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ items: [{ productoId: productB.id, cantidad: 1 }] })
      .expect(403);
  });

  it('requires a customer session', async () => {
    await request(BASE).get(`/${companyA.slug}/tienda/mis-pedidos`).expect(401);
    await request(BASE)
      .post(`/${companyA.slug}/tienda/mis-pedidos`)
      .send({ items: [{ productoId: productA.id, cantidad: 1 }] })
      .expect(401);
  });

  it('ignores a token whose empresaId claim points at the store: the account decides', async () => {
    const forged = signCustomerToken(customerAId, companyB.id);
    await request(BASE)
      .get(`/${companyB.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${forged}`)
      .expect(403);
  });
});
