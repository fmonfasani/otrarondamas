import type { ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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
 * Marketplace, step 4 (Owner, 2026-11-26) — the store on the map: the Owner searches the
 * address (Georef, here a fake one: tests never leave the machine), confirms the pin, can show
 * only the zone; the team only sees it; the explorer shows the point (rounded for a zone).
 */
describe('Ubicación del negocio en el mapa', () => {
  const PORT = '3405';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let georef: Server;
  let suffix: number;
  let company: { id: string; slug: string };
  const asked: string[] = [];
  const people: Record<string, { usuarioId: string; auth: string }> = {};
  const password = randomUUID();

  async function person(role: 'OWNER' | 'VENDEDOR', key: string) {
    const email = `ubic-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: company.id,
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
      data: { userId: user.id, businessId: company.id, role, status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company.id, permisos: [] })}`,
    };
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    // A fake Georef: «Córdoba 1000» is found; anything else only finds the city.
    georef = createServer((req, res) => {
      asked.push(req.url ?? '');
      res.setHeader('Content-Type', 'application/json');
      if (req.url?.startsWith('/api/direcciones')) {
        const found =
          new URL(req.url, 'http://georef').searchParams.get('direccion') === 'Córdoba 1000';
        res.end(
          JSON.stringify({
            direcciones: found
              ? [
                  {
                    nomenclatura: 'CORDOBA 1000, Rosario, Santa Fe',
                    ubicacion: { lat: -32.946812, lon: -60.639347 },
                  },
                ]
              : [],
          }),
        );
      } else {
        res.end(
          JSON.stringify({
            localidades: [
              {
                nombre: 'Rosario',
                provincia: { nombre: 'Santa Fe' },
                centroide: { lat: -32.95, lon: -60.66 },
              },
            ],
          }),
        );
      }
    }).listen(0, '127.0.0.1');
    await new Promise((resolve) => georef.once('listening', resolve));
    const georefUrl = `http://127.0.0.1:${(georef.address() as AddressInfo).port}/api`;
    company = await prisma.empresa.create({
      data: {
        nombre: `Ubicacion ${suffix}`,
        slug: `ubicacion-${suffix}`,
        configuracion: {
          negocio: { direccion: 'Córdoba 1000' },
          perfil: { ciudad: 'Rosario', provincia: 'Santa Fe', rubro: 'Almacén' },
        },
      },
      select: { id: true, slug: true },
    });
    await createStoreProduct(prisma, company.id, 'Ubic', 'A', suffix);
    await person('OWNER', 'owner');
    await person('VENDEDOR', 'vendedor');
    server = spawnApi({ PORT, GEOREF_URL: georefUrl });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    georef?.close();
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await deleteMessagingOf(prisma, [company.id]);
    await prisma.auditLog.deleteMany({ where: { empresaId: company.id } });
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
  });

  it('suggests the address of Ajustes, and only the Owner searches and confirms', async () => {
    const seen = await request(BASE)
      .get('/negocio/ubicacion')
      .set('Authorization', people.vendedor.auth)
      .expect(200);
    expect(seen.body).toEqual({
      ubicacion: null,
      sugerida: { direccion: 'Córdoba 1000', ciudad: 'Rosario', provincia: 'Santa Fe' },
      puedeEditar: false,
    });
    await request(BASE)
      .post('/negocio/ubicacion/buscar')
      .set('Authorization', people.vendedor.auth)
      .send({ direccion: 'Córdoba 1000' })
      .expect(403);
    await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.vendedor.auth)
      .send({ lat: -32.9, lng: -60.6, zona: false, direccion: 'x' })
      .expect(403);
    await request(BASE).get('/negocio/ubicacion').expect(401);
  });

  it('finds the exact address, or the city centre to drag the pin from', async () => {
    const exact = await request(BASE)
      .post('/negocio/ubicacion/buscar')
      .set('Authorization', people.owner.auth)
      .send({ direccion: 'Córdoba 1000', ciudad: 'Rosario', provincia: 'Santa Fe' })
      .expect(200);
    expect(exact.body.candidatos).toEqual([
      {
        lat: -32.946812,
        lng: -60.639347,
        etiqueta: 'CORDOBA 1000, Rosario, Santa Fe',
        exacta: true,
      },
    ]);
    expect(asked[0]).toContain('localidad=Rosario');
    const city = await request(BASE)
      .post('/negocio/ubicacion/buscar')
      .set('Authorization', people.owner.auth)
      .send({ direccion: 'Calle Nueva 99', ciudad: 'Rosario' })
      .expect(200);
    expect(city.body.candidatos[0]).toMatchObject({ exacta: false, etiqueta: 'Rosario, Santa Fe' });
  });

  it('keeps the confirmed pin (audited), refuses points outside Argentina, and the explorer shows it', async () => {
    await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .send({ lat: 40.4, lng: -3.7, zona: false, direccion: 'Madrid' })
      .expect(400);
    const saved = await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .send({ lat: -32.946812, lng: -60.639347, zona: false, direccion: ' Córdoba 1000 ' })
      .expect(200);
    expect(saved.body.ubicacion).toMatchObject({
      lat: -32.946812,
      lng: -60.639347,
      zona: false,
      direccion: 'Córdoba 1000',
    });
    expect(
      await prisma.auditLog.count({
        where: { empresaId: company.id, accion: 'NEGOCIO_UBICACION' },
      }),
    ).toBe(1);
    const explorer = await request(BASE).get('/explorar').expect(200);
    const store = explorer.body.negocios.find((n: { slug: string }) => n.slug === company.slug);
    expect(store.ubicacion).toEqual({ lat: -32.94681, lng: -60.63935, zona: false });
  });

  it('shows only the zone when the Owner asks, and nothing once taken off the map', async () => {
    await request(BASE)
      .put('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .send({ lat: -32.946812, lng: -60.639347, zona: true, direccion: 'Córdoba 1000' })
      .expect(200);
    // The explorer caches a minute: read what it would show from the stored configuration.
    const config = (await prisma.empresa.findUnique({ where: { id: company.id } }))
      ?.configuracion as { ubicacion: { zona: boolean } };
    expect(config.ubicacion.zona).toBe(true);
    await request(BASE)
      .delete('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .expect(200, { ubicacion: null });
    const after = await request(BASE)
      .get('/negocio/ubicacion')
      .set('Authorization', people.owner.auth)
      .expect(200);
    expect(after.body).toMatchObject({ ubicacion: null, puedeEditar: true });
  });
});
