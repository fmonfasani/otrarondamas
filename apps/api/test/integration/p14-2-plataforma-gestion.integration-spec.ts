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

const DAY = 24 * 60 * 60 * 1000;

/**
 * OR-B4-040 — platform insights (read-only, aggregates): health alerts per Business,
 * monthly activity, feature adoption and the platform's own audit. Same access rule as
 * OR-B4-038: only PLATFORM_ADMIN_EMAILS, never a Business role. The database is shared
 * with other suites, so platform-wide numbers are checked as lower bounds.
 */
describe('P14-2 — gestión de la plataforma', () => {
  const PORT = '3374';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  const shops: Record<string, { id: string; slug: string }> = {};
  const people: Record<string, { usuarioId: string; email: string; auth: string }> = {};
  let customerId: string;

  async function person(
    companyId: string,
    role: 'OWNER' | 'VENDEDOR',
    key: string,
    extra: {
      passwordHash?: string;
      estadoLegajo?: 'PENDIENTE' | 'APROBADO';
      member?: boolean;
    } = {},
  ) {
    const email = `p14-2-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: companyId,
        nombre: `Nombre ${key}`,
        email,
        activo: true,
        rol: role,
        passwordHash: extra.passwordHash ?? null,
        estadoLegajo: extra.estadoLegajo ?? 'APROBADO',
      },
      select: { id: true },
    });
    if (extra.member !== false) {
      const user = await prisma.user.create({
        data: { email: `user-${email}`, nombre: `Nombre ${key}`, usuarioId: usuario.id },
        select: { id: true },
      });
      await prisma.membership.create({
        data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
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
    const company = async (tag: string, createdAt = new Date(), configuracion = {}) => {
      shops[tag] = await prisma.empresa.create({
        data: {
          nombre: `P14-2 ${tag} ${suffix}`,
          slug: `p14-2-${tag}-${suffix}`,
          configuracion,
          createdAt,
        },
        select: { id: true, slug: true },
      });
    };
    const monthAgo = new Date(Date.now() - 30 * DAY);
    await company('hq');
    // Healthy: Owner with password, products, a recent sale, Mercado Pago connected.
    await company('sano', monthAgo, {
      mercadoPago: { userId: 123 },
      respuestasRapidas: [{ id: 'r1', texto: 'Hola' }],
    });
    // Owner never created the password, no activity in a month, no products, a pending dossier.
    await company('dormido', monthAgo);
    // No Owner at all (and too new to be called inactive).
    await company('huerfano');

    await person(shops.hq.id, 'OWNER', 'platform', { passwordHash: 'x' });
    await person(shops.sano.id, 'OWNER', 'ownerSano', { passwordHash: 'x' });
    await person(shops.dormido.id, 'OWNER', 'ownerDormido');
    await person(shops.dormido.id, 'VENDEDOR', 'pendiente', {
      estadoLegajo: 'PENDIENTE',
      member: false,
    });

    const product = await createStoreProduct(prisma, shops.sano.id, 'P14-2', 'A', suffix);
    customerId = (
      await prisma.cliente.create({
        data: { empresaId: shops.sano.id, nombre: 'Clienta', email: `c-${suffix}@example.test` },
        select: { id: true },
      })
    ).id;
    await prisma.venta.create({
      data: {
        empresaId: shops.sano.id,
        usuarioId: people.ownerSano.usuarioId,
        clienteId: customerId,
        estado: 'CONFIRMADA',
        canal: 'presencial',
        total: 30,
        VentaItem: { create: { productoId: product.id, cantidad: 1, precioUnitario: 30 } },
      },
    });

    server = spawnApi({ PORT, PLATFORM_ADMIN_EMAILS: people.platform.email });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = Object.values(shops).map((s) => s.id);
    // By Business, so a half-done setup is cleaned too.
    const usuarioIds = (
      await prisma.usuario.findMany({
        where: { empresaId: { in: companies } },
        select: { id: true },
      })
    ).map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { Venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('keeps everyone else out: no session, a store customer and a Business Owner', async () => {
    const customer = `Bearer ${signCustomerToken(customerId, shops.sano.id)}`;
    await Promise.all(
      ['/health', '/activity', '/adoption', '/audit'].flatMap((path) => [
        get(path).expect(401),
        get(path, people.ownerSano.auth).expect(403),
        get(path, customer).expect(403),
      ]),
    );
  });

  it('lists what each Business needs, most urgent first, with what to do', async () => {
    const res = await get('/health', people.platform.auth).expect(200);
    const of = (tag: string) =>
      (
        res.body.items as Array<{
          id: string;
          alertas: Array<{ tipo: string; severidad: string; accion: string }>;
        }>
      ).find((b) => b.id === shops[tag].id);
    expect(of('sano')).toBeUndefined();
    const sleepy = of('dormido');
    expect(sleepy?.alertas.map((a) => a.tipo)).toEqual([
      'OWNER_SIN_ACCESO',
      'SIN_ACTIVIDAD',
      'SIN_PRODUCTOS',
      'LEGAJOS_PENDIENTES',
      'SIN_COBROS_ONLINE',
    ]);
    expect(sleepy?.alertas.every((a) => a.accion.length > 0)).toBe(true);
    const orphan = of('huerfano');
    expect(orphan?.alertas[0]).toMatchObject({ tipo: 'SIN_OWNER', severidad: 'alta' });
    expect(orphan?.alertas.map((a) => a.tipo)).not.toContain('SIN_ACTIVIDAD');
    // Urgent ones come before the rest.
    const firstSeverity = (res.body.items as Array<{ alertas: Array<{ severidad: string }> }>).map(
      (b) => b.alertas[0].severidad,
    );
    const ranks = firstSeverity.map((s) => (s === 'alta' ? 0 : 1));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // Aggregates only: no customer data and no emails in the report.
    expect(JSON.stringify(res.body)).not.toContain('@example.test');
  });

  it('shows the platform month by month', async () => {
    const res = await get('/activity?months=12', people.platform.auth).expect(200);
    expect(res.body.meses).toHaveLength(12);
    const current = res.body.meses[11];
    expect(current.mes).toMatch(/^\d{4}-\d{2}$/);
    expect(current.negociosNuevos).toBeGreaterThanOrEqual(2);
    expect(current.negociosActivos).toBeGreaterThanOrEqual(1);
    expect(current.ventas).toBeGreaterThanOrEqual(1);
    expect(current.vendido).toBeGreaterThanOrEqual(30);
    const short = await get('/activity?months=999', people.platform.auth).expect(200);
    expect(short.body.meses).toHaveLength(24);
  });

  it('says how many Businesses use each part of Wapsell', async () => {
    const res = await get('/adoption', people.platform.auth).expect(200);
    const use = Object.fromEntries(
      (res.body.funciones as Array<{ clave: string; negocios: number; porcentaje: number }>).map(
        (f) => [f.clave, f],
      ),
    );
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect(Object.keys(use).sort(byName)).toEqual(
      ['chat', 'cobros', 'contacto', 'devoluciones', 'mostrador', 'respuestas', 'tienda'].sort(
        byName,
      ),
    );
    expect(use.mostrador.negocios).toBeGreaterThanOrEqual(1);
    expect(use.cobros.negocios).toBeGreaterThanOrEqual(1);
    expect(use.respuestas.negocios).toBeGreaterThanOrEqual(1);
    for (const f of Object.values(use)) {
      expect(f.porcentaje).toBeGreaterThanOrEqual(0);
      expect(f.porcentaje).toBeLessThanOrEqual(100);
    }
  });

  it('records what the Wapsell team did and shows it in the platform audit', async () => {
    await get(`/businesses/${shops.sano.id}`, people.platform.auth).expect(200);
    const res = await get('/audit', people.platform.auth).expect(200);
    const mine = (
      res.body.items as Array<{
        accion: string;
        negocio: { id: string; nombre: string };
        quien: { email: string } | null;
      }>
    ).find((r) => r.negocio.id === shops.sano.id);
    expect(mine).toMatchObject({
      accion: 'PLATFORM_VIEW',
      negocio: { nombre: `P14-2 sano ${suffix}` },
      quien: { email: people.platform.email },
    });
  });
});
