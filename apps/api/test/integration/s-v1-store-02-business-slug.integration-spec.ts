import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

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

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        const socket = net.connect(port, '127.0.0.1');
        socket.on('connect', () => { socket.end(); resolve(); });
        socket.on('error', () => {
          if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta`));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  const createCatalog = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `STORE-V1-02 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: { empresaId: companyId, familiaId: family.id, nombre: `STORE-V1-02 Sub ${tag} ${suffix}`, prefijo: `S${tag}` },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: { empresaId: companyId, subfamiliaId: subfamily.id, nombre: `STORE-V1-02 Tipo ${tag} ${suffix}`, prefijo: `T${tag}` },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: { empresaId: companyId, tipoId: type.id, nombre: `STORE-V1-02 Subtipo ${tag} ${suffix}`, prefijo: `U${tag}` },
      select: { id: true },
    });
    const product = await prisma.producto.create({
      data: {
        empresaId: companyId, nombre: `STORE-V1-02 Product ${tag} ${suffix}`,
        codigoInterno: `SV102-${tag}-${suffix}`, familiaId: family.id, subfamiliaId: subfamily.id,
        tipoId: type.id, subtipoId: subtype.id, unidadBase: 'UNIDAD', costo: 1,
        precioMinorista: 10, activo: true,
      },
      select: { id: true, nombre: true },
    });
    await prisma.lote.create({
      data: { empresaId: companyId, productoId: product.id, numeroLote: `L-${tag}-${suffix}`, vencimiento: new Date('2099-01-01'), cantidad: 5 },
    });
    return product;
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    companyA = await prisma.empresa.create({
      data: { nombre: `STORE-V1-02 A ${suffix}`, slug: `store-v1-02-a-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `STORE-V1-02 B ${suffix}`, slug: `store-v1-02-b-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    productA = await createCatalog(companyA.id, 'A');
    productB = await createCatalog(companyB.id, 'B');
    server = spawn('node', ['dist/src/main.js'], { cwd: process.cwd(), env: { ...process.env, PORT, TIENDA_EMPRESA_ID: '' }, stdio: 'ignore' });
    legacyServer = spawn('node', ['dist/src/main.js'], { cwd: process.cwd(), env: { ...process.env, PORT: LEGACY_PORT, TIENDA_EMPRESA_ID: companyA.id }, stdio: 'ignore' });
    await Promise.all([waitPort(Number(PORT)), waitPort(Number(LEGACY_PORT))]);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    if (legacyServer && !legacyServer.killed) legacyServer.kill();
    const companies = [companyA.id, companyB.id];
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
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
    const order = await request(BASE).post(`/${companyA.slug}/tienda/pedidos`).send({
      nombre: 'Slug Buyer', email, items: [{ productoId: productA.id, cantidad: 1 }],
    }).expect(201);
    expect(order.body.empresaId).toBe(companyA.id);
    const tracking = await request(BASE).get(`/${companyA.slug}/tienda/pedidos/${order.body.id}`).expect(200);
    expect(tracking.body.id).toBe(order.body.id);
  });

  it('does not allow a product from another Business through a slug-scoped order', async () => {
    const res = await request(BASE).post(`/${companyA.slug}/tienda/pedidos`).send({
      nombre: 'Cross Tenant', email: `cross-${suffix}@example.test`, items: [{ productoId: productB.id, cantidad: 1 }],
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
