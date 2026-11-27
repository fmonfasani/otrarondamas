import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteMessagingOf,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-054 — delivery and pickup of a store: the Owner turns delivery on (only once the store is
 * on the map, never below Wapsell's $ 2.500 + $ 500 per km); the team only sees it; anyone can ask
 * what a delivery to a point costs, without learning where a home store is.
 */
describe('Envíos y retiro del negocio', () => {
  const PORT = '3408';
  const BASE = `http://127.0.0.1:${PORT}`;
  const DOOR = { lat: -32.946812, lng: -60.639347 };
  // About 1 km per 0,009° of latitude.
  const north = (km: number) => ({ lat: DOOR.lat + km / 111.2, lng: DOOR.lng });
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  const companies: Record<string, { id: string; slug: string }> = {};
  const people: Record<string, { usuarioId: string; auth: string }> = {};
  const password = randomUUID();

  async function person(company: string, role: 'OWNER' | 'VENDEDOR', key: string) {
    const empresaId = companies[company].id;
    const email = `envios-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId,
        nombre: key,
        email,
        activo: true,
        rol: role,
        passwordHash: await bcrypt.hash(password, 4),
        estadoLegajo: 'APROBADO',
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: empresaId, role, status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId, permisos: [] })}`,
    };
  }

  const quote = (point: { lat: number; lng: number }, slug = companies.main.slug) =>
    request(BASE).get(`/${slug}/tienda/envio`).query(point);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    await Promise.all(
      ['main', 'other'].map(async (key) => {
        companies[key] = await prisma.empresa.create({
          data: {
            nombre: `Envios ${key} ${suffix}`,
            slug: `envios-${key}-${suffix}`,
            configuracion: { perfil: { ciudad: 'Rosario', provincia: 'Santa Fe' } },
          },
          select: { id: true, slug: true },
        });
        await createStoreProduct(prisma, companies[key].id, 'Env', key.slice(0, 1), suffix);
      }),
    );
    await person('main', 'OWNER', 'owner');
    await person('main', 'VENDEDOR', 'vendedor');
    await person('other', 'OWNER', 'otherOwner');
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const ids = Object.values(companies).map((c) => c.id);
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await deleteMessagingOf(prisma, ids);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: ids } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: ids } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, ids);
    await prisma.$disconnect();
  });

  it('starts with pickup only; the team sees it, only the Owner changes it', async () => {
    const seen = await request(BASE)
      .get('/negocio/envios')
      .set('Authorization', people.vendedor.auth)
      .expect(200);
    expect(seen.body).toEqual({
      envios: { envio: false, retiro: true, radioKm: 5, base: 2500, porKm: 500 },
      ubicacionConfirmada: false,
      minimos: { base: 2500, porKm: 500 },
      puedeEditar: false,
    });
    await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.vendedor.auth)
      .send({ envio: false, retiro: true, radioKm: 5, base: 2500, porKm: 500 })
      .expect(403);
    await request(BASE).get('/negocio/envios').expect(401);
    const pickupOnly = await quote(north(1)).expect(200);
    expect(pickupOnly.body).toMatchObject({ retiro: true, envio: { disponible: false } });
  });

  it('asks for the pin first, and never charges less than Wapsell', async () => {
    const noPin = await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.owner.auth)
      .send({ envio: true, retiro: true, radioKm: 5, base: 2500, porKm: 500 })
      .expect(400);
    expect(noPin.body.message).toContain('marcá tu negocio en el mapa');
    await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .send({ ...DOOR, zona: false, direccion: 'Córdoba 1000' })
      .expect(200);
    await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.owner.auth)
      .send({ envio: true, retiro: true, radioKm: 5, base: 2000, porKm: 500 })
      .expect(400);
    await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.owner.auth)
      .send({ envio: false, retiro: false, radioKm: 5, base: 2500, porKm: 500 })
      .expect(400);
    const saved = await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.owner.auth)
      .send({ envio: true, retiro: true, radioKm: 5, base: 2500, porKm: 500 })
      .expect(200);
    expect(saved.body.envios).toEqual({
      envio: true,
      retiro: true,
      radioKm: 5,
      base: 2500,
      porKm: 500,
    });
    expect(
      await prisma.auditLog.count({
        where: { empresaId: companies.main.id, accion: 'NEGOCIO_ENVIOS' },
      }),
    ).toBe(1);
  });

  it('tells anyone what a delivery costs: every km or fraction, inside the radius', async () => {
    const near = await quote(north(2.1)).expect(200);
    expect(near.body).toEqual({
      retiro: true,
      envio: { disponible: true, km: 2.1, kmCobrados: 3, base: 2500, porKm: 500, costo: 4000 },
    });
    const far = await quote(north(8)).expect(200);
    expect(far.body.envio).toEqual({
      disponible: false,
      km: 8,
      motivo: 'Tu dirección está a 8 km y el negocio envía hasta 5 km.',
    });
    await quote({ lat: 40.4, lng: -3.7 }).expect(400);
    await request(BASE).get(`/${companies.main.slug}/tienda/envio`).expect(400);
  });

  it('measures a home store from its public zone, so the fee never finds the door', async () => {
    await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .send({ ...DOOR, zona: true, direccion: 'Córdoba 1000' })
      .expect(200);
    const point = north(0.3);
    const home = await quote(point).expect(200);
    // The public zone is the point rounded to 0,01° (-32.95, -60.64), not the door.
    const fromZone = Math.hypot((point.lat + 32.95) * 111.2, (point.lng + 60.64) * 93.3);
    expect(home.body.envio.km).toBeCloseTo(fromZone, 0);
    expect(Math.abs(home.body.envio.km - 0.3)).toBeGreaterThan(0.05);
  });

  it('keeps each store’s settings to itself', async () => {
    await request(BASE)
      .put('/negocio/envios')
      .set('Authorization', people.otherOwner.auth)
      .send({ envio: false, retiro: true, radioKm: 9, base: 9000, porKm: 900 })
      .expect(200);
    const main = await request(BASE)
      .get('/negocio/envios')
      .set('Authorization', people.owner.auth)
      .expect(200);
    expect(main.body.envios).toMatchObject({ envio: true, radioKm: 5, base: 2500 });
    const other = await request(BASE)
      .get('/negocio/envios')
      .set('Authorization', people.otherOwner.auth)
      .expect(200);
    expect(other.body.envios).toMatchObject({ envio: false, radioKm: 9, base: 9000, porKm: 900 });
    const otherQuote = await quote(north(1), companies.other.slug).expect(200);
    expect(otherQuote.body.envio.disponible).toBe(false);
  });
});
