import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-038 — Wapsell platform administration, first stage: read-only, aggregates only.
 * Only the emails in PLATFORM_ADMIN_EMAILS get in (never a Business role, not even an
 * Owner); a Business's detail never carries its customers' personal data and is written
 * to that Business's audit log.
 */
describe('P14-1 — administración de la plataforma', () => {
  const PORT = '3375';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let hq: { id: string };
  let shopA: { id: string; slug: string };
  let shopB: { id: string; slug: string };
  const people: Record<string, { usuarioId: string; userId: string; email: string; auth: string }> =
    {};
  let customer: { id: string; nombre: string; email: string };

  async function person(companyId: string, role: 'OWNER' | 'VENDEDOR', key: string) {
    const email = `p14-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: companyId, nombre: `Nombre ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `Nombre ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      email,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`,
    };
  }

  const get = (path: string, auth?: string) => {
    const r = request(BASE).get(`/platform-admin${path}`);
    return auth ? r.set('Authorization', auth) : r;
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const company = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P14-1 ${tag} ${suffix}`,
          slug: `p14-1-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    hq = await company('hq');
    shopA = await company('almacen');
    shopB = await company('kiosco');
    await person(hq.id, 'OWNER', 'platform');
    await person(shopA.id, 'OWNER', 'ownerA');
    await person(shopA.id, 'VENDEDOR', 'sellerA');
    await prisma.empresa.update({
      where: { id: shopA.id },
      data: { configuracion: { negocio: { telefono: '11 4444-0000' } } },
    });
    customer = await prisma.cliente.create({
      data: {
        empresaId: shopA.id,
        nombre: 'Clienta Privada',
        email: `privada-${suffix}@example.test`,
      },
      select: { id: true, nombre: true, email: true },
    });
    const product = await createStoreProduct(prisma, shopA.id, 'P14-1', 'A', suffix);
    await createStoreProduct(prisma, shopA.id, 'P14-1', 'B', suffix);
    const sale = (total: number, estado: 'CONFIRMADA' | 'ANULADA', daysAgo: number) =>
      prisma.venta.create({
        data: {
          empresaId: shopA.id,
          usuarioId: people.ownerA.usuarioId,
          clienteId: customer.id,
          estado,
          canal: 'presencial',
          total,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          VentaItem: { create: { productoId: product.id, cantidad: 1, precioUnitario: total } },
        },
      });
    await sale(30, 'CONFIRMADA', 1); // counted
    await sale(99, 'ANULADA', 1); // cancelled
    await sale(40, 'CONFIRMADA', 45); // older than 30 days
    await prisma.pedido.create({
      data: {
        empresaId: shopA.id,
        clienteId: customer.id,
        canalOrigen: 'web',
        estado: 'ENTREGADO',
        total: 50,
      },
    });
    await prisma.pedido.create({
      data: {
        empresaId: shopA.id,
        clienteId: customer.id,
        canalOrigen: 'web',
        estado: 'RECIBIDO',
        total: 70,
      },
    });

    // Case and spaces do not matter in the allowlist.
    server = spawnApi({
      PORT,
      PLATFORM_ADMIN_EMAILS: ` other@example.test , ${people.platform.email.toUpperCase()} `,
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [hq.id, shopA.id, shopB.id];
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { Venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('keeps everyone else out: no session, store customers and even a Business Owner', async () => {
    await get('/overview').expect(401);
    for (const path of ['/overview', '/businesses', `/businesses/${shopA.id}`]) {
      await get(path, people.ownerA.auth).expect(403);
      await get(path, people.sellerA.auth).expect(403);
      await get(path, `Bearer ${signCustomerToken(customer.id, shopA.id)}`).expect(403);
    }
    expect(
      await prisma.auditLog.count({ where: { empresaId: shopA.id, accion: 'PLATFORM_VIEW' } }),
    ).toBe(0);
  });

  it('gives the platform administrator the overview', async () => {
    const res = await get('/overview', people.platform.auth).expect(200);
    expect(res.body.metrics.businesses).toBeGreaterThanOrEqual(3);
    expect(res.body.recentBusinesses.map((b: { id: string }) => b.id)).toEqual(
      expect.arrayContaining([shopA.id, shopB.id, hq.id]),
    );
  });

  it('lists the Businesses with their aggregates, and searches them', async () => {
    const res = await get(
      `/businesses?search=${encodeURIComponent(`P14-1 almacen ${suffix}`)}`,
      people.platform.auth,
    ).expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      id: shopA.id,
      slug: shopA.slug,
      owner: { nombre: 'Nombre ownerA' },
      equipo: 2,
      productos: 2,
      clientes: 1,
      pedidos: 2,
      vendido30: 80, // 30 (counter) + 50 (delivered order); not the cancelled sale, the old one or the unpaid order
      cobraOnline: false,
    });
    expect(res.body.items[0].ultimaActividad).toEqual(expect.any(String));
    const empty = await get(
      `/businesses?search=${encodeURIComponent(`P14-1 kiosco ${suffix}`)}`,
      people.platform.auth,
    ).expect(200);
    expect(empty.body.items[0]).toMatchObject({
      id: shopB.id,
      owner: null,
      equipo: 0,
      vendido30: 0,
      ultimaActividad: null,
    });
  });

  it('shows a Business’s detail without its customers’ data, and leaves it in that Business’s audit log', async () => {
    const res = await get(`/businesses/${shopA.id}`, people.platform.auth).expect(200);
    expect(res.body).toMatchObject({
      id: shopA.id,
      telefono: '11 4444-0000',
      equipoPorRol: { OWNER: 1, VENDEDOR: 1 },
      ultimos30: {
        mostrador: { operaciones: 1, total: 30 },
        tienda: { operaciones: 1, total: 50 },
      },
    });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(customer.nombre);
    expect(body).not.toContain(customer.email);
    const audit = await prisma.auditLog.findFirst({
      where: { empresaId: shopA.id, accion: 'PLATFORM_VIEW' },
    });
    expect(audit).toMatchObject({ usuarioId: people.platform.usuarioId, entidadId: shopA.id });
    await get('/businesses/00000000-0000-4000-8000-000000000000', people.platform.auth).expect(404);
  });
});
