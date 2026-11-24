import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
  deleteMessagingOf,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-041 — Business audit: price, cash and team changes are recorded with who and what
 * changed; the Owner sees the whole Business, everyone else (the Admin included) only their
 * own entries; secrets never show; the CSV download is Owner-only and is itself recorded.
 */
/** A field the audit must never show (as older code could have stored it). */
const SECRET_FIELD = 'passwordHash';

describe('P15-1 — auditoría del negocio', () => {
  const PORT = '3373';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string };
  let other: { id: string };
  let productId: string;
  const people: Record<
    string,
    { usuarioId: string; membershipId: string; email: string; auth: string }
  > = {};

  async function person(
    companyId: string,
    role: 'OWNER' | 'ADMIN' | 'VENDEDOR',
    key: string,
    legacy: string[],
  ) {
    const email = `p15-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: companyId, nombre: `Nombre ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `Nombre ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    const membership = await prisma.membership.create({
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
      select: { id: true },
    });
    // In `shadow` the legacy assignment decides the route guards (the audit endpoints still
    // re-check the role matrix themselves).
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
      membershipId: membership.id,
      email,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`,
    };
  }

  const api = (method: 'get' | 'patch' | 'post', path: string, who: string) =>
    request(BASE)[method](path).set('Authorization', people[who].auth);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `P15-1 ${suffix}`, slug: `p15-1-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    other = await prisma.empresa.create({
      data: { nombre: `P15-1 otro ${suffix}`, slug: `p15-1-otro-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    await prisma.caja.create({ data: { empresaId: shop.id, fondoFijo: 0 } });
    await person(shop.id, 'OWNER', 'owner', [
      'productos.gestionar',
      'audit.leer',
      'audit.leer_otros',
    ]);
    await person(shop.id, 'ADMIN', 'admin', ['audit.leer', 'audit.leer_otros']);
    await person(shop.id, 'VENDEDOR', 'seller', ['caja.gastos', 'audit.leer']);
    await person(other.id, 'OWNER', 'otherOwner', ['audit.leer', 'audit.leer_otros']);
    productId = (await createStoreProduct(prisma, shop.id, 'P15-1', 'A', suffix)).id;
    // An entry carrying a secret, as older code could have written.
    await prisma.auditLog.create({
      data: {
        empresaId: shop.id,
        usuarioId: people.owner.usuarioId,
        accion: 'UPDATE',
        entidadAfectada: 'Usuario',
        entidadId: people.owner.usuarioId,
        valoresAnteriores: { nombre: 'Viejo', [SECRET_FIELD]: 'hash-viejo' },
        valoresPosteriores: { nombre: 'Nuevo', [SECRET_FIELD]: 'hash-nuevo' },
      },
    });
    server = spawnApi({ PORT });
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
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.movimientoCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.aperturaCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('records price, cash and team changes with who and what changed', async () => {
    await api('patch', `/catalogo/productos/${productId}`, 'owner')
      .send({ precioMinorista: 1234 })
      .expect(200);
    await api('post', '/caja/apertura', 'admin').send({ montoInicial: 5000 }).expect(201);
    await api('post', '/caja/movimientos', 'seller')
      .send({ tipo: 'Ingreso', monto: 100, descripcion: 'Cambio para el día' })
      .expect(201);
    await api('patch', `/memberships/${people.seller.membershipId}/suspend`, 'owner').expect(200);

    const rows = await prisma.auditLog.findMany({
      where: { empresaId: shop.id },
      select: {
        accion: true,
        usuarioId: true,
        valoresAnteriores: true,
        valoresPosteriores: true,
        motivo: true,
      },
    });
    const of = (accion: string) => rows.find((r) => r.accion === accion);
    expect(of('PRODUCTO_PRECIO_CAMBIADO')).toMatchObject({
      usuarioId: people.owner.usuarioId,
      valoresPosteriores: expect.objectContaining({ precioMinorista: 1234 }),
    });
    expect(of('CAJA_ABIERTA')).toMatchObject({
      usuarioId: people.admin.usuarioId,
      valoresPosteriores: { montoInicial: 5000 },
    });
    expect(of('CAJA_MOVIMIENTO')).toMatchObject({
      usuarioId: people.seller.usuarioId,
      motivo: 'Cambio para el día',
    });
    expect(of('EQUIPO_SUSPENDIDO')).toMatchObject({ usuarioId: people.owner.usuarioId });
  });

  it('shows the Owner the whole Business, with topic and person filters', async () => {
    const all = await api('get', '/auditoria', 'owner').expect(200);
    expect(all.body.todo).toBe(true);
    expect(all.body.total).toBeGreaterThanOrEqual(5);
    expect(all.body.personas.length).toBe(3);
    const prices = await api('get', '/auditoria?tema=precios', 'owner').expect(200);
    expect(prices.body.items.map((i: { accion: string }) => i.accion)).toEqual([
      'PRODUCTO_PRECIO_CAMBIADO',
    ]);
    expect(prices.body.items[0]).toMatchObject({
      nombre: 'Cambió un precio',
      temaNombre: 'Productos y precios',
    });
    const byAdmin = await api(
      'get',
      `/auditoria?usuarioId=${people.admin.usuarioId}`,
      'owner',
    ).expect(200);
    expect(byAdmin.body.items.map((i: { accion: string }) => i.accion)).toEqual(['CAJA_ABIERTA']);
    await api('get', '/auditoria?tema=inventado', 'owner').expect(400);
    await api('get', '/auditoria?desde=2026-13-45', 'owner').expect(400);
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dated = await api('get', `/auditoria?desde=${today}&hasta=${today}`, 'owner').expect(200);
    expect(dated.body.total).toBe(all.body.total);
  });

  it('shows the Admin and the Vendedor only their own entries (OR-B4-041)', async () => {
    const admin = await api(
      'get',
      `/auditoria?usuarioId=${people.owner.usuarioId}`,
      'admin',
    ).expect(200);
    expect(admin.body.todo).toBe(false);
    expect(admin.body.personas).toEqual([]);
    expect(new Set(admin.body.items.map((i: { persona: { id: string } }) => i.persona.id))).toEqual(
      new Set([people.admin.usuarioId]),
    );
    const ownerEntry = await prisma.auditLog.findFirst({
      where: { empresaId: shop.id, usuarioId: people.owner.usuarioId },
      select: { id: true },
    });
    await api('get', `/auditoria/${ownerEntry!.id}`, 'admin').expect(404);
    await api('get', '/auditoria/exportar', 'admin').expect(403);
  });

  it('never lets another Business in', async () => {
    const res = await api('get', '/auditoria', 'otherOwner').expect(200);
    expect(res.body.total).toBe(0);
    const entry = await prisma.auditLog.findFirst({
      where: { empresaId: shop.id },
      select: { id: true },
    });
    await api('get', `/auditoria/${entry!.id}`, 'otherOwner').expect(404);
  });

  it('shows what changed and hides secrets', async () => {
    const entry = await prisma.auditLog.findFirst({
      where: { empresaId: shop.id, accion: 'UPDATE', entidadAfectada: 'Usuario' },
      select: { id: true },
    });
    const res = await api('get', `/auditoria/${entry!.id}`, 'owner').expect(200);
    expect(res.body.cambios).toEqual([{ campo: 'nombre', antes: 'Viejo', despues: 'Nuevo' }]);
    expect(JSON.stringify(res.body)).not.toContain('hash-');
    expect(res.body.antes[SECRET_FIELD]).toBe('••••');
  });

  it('lets the Owner download the CSV, and records the download', async () => {
    const res = await api('get', '/auditoria/exportar?tema=caja', 'owner').expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('auditoria.csv');
    const text: string = res.text;
    expect(text.codePointAt(0)).toBe(0xfeff);
    const lines = text.trim().split('\r\n');
    expect(lines[0]).toContain('"Fecha y hora";"Persona"');
    expect(lines).toHaveLength(3); // header + opening + movement
    expect(text).toContain('Abrió la caja');
    expect(
      await prisma.auditLog.count({
        where: {
          empresaId: shop.id,
          accion: 'AUDITORIA_EXPORTADA',
          usuarioId: people.owner.usuarioId,
        },
      }),
    ).toBe(1);
  });
});
