import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * Mi perfil and Ajustes del negocio, against the real API and database: each person changes
 * their own name and password (knowing the current one); the Owner changes the Business's
 * name and contact details, which the store shows.
 */
describe('P12-1 — mi perfil y ajustes del negocio', () => {
  const PORT = '3379';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  let other: { id: string };
  const people: Record<string, { usuarioId: string; email: string; auth: string }> = {};
  const password = randomUUID();

  async function person(role: 'OWNER' | 'ADMIN' | 'VENDEDOR', companyId: string, key: string) {
    const email = `p12-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: companyId,
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
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      email,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`,
    };
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const newCompany = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P12-1 ${tag} ${suffix}`,
          slug: `p12-1-${tag}-${suffix}`,
          configuracion: { devoluciones: { plazoDias: 15 } },
        },
        select: { id: true },
      });
    company = await newCompany('a');
    other = await newCompany('b');
    await person('OWNER', company.id, 'owner');
    await person('ADMIN', company.id, 'admin');
    await person('VENDEDOR', company.id, 'vendedor');
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [company.id, other.id];
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await prisma.passwordResetToken.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('lets each person change their own name', async () => {
    await request(BASE)
      .patch('/auth/me')
      .set('Authorization', people.vendedor.auth)
      .send({ nombre: 'x' })
      .expect(400);
    const res = await request(BASE)
      .patch('/auth/me')
      .set('Authorization', people.vendedor.auth)
      .send({ nombre: ' Diego Pérez ' })
      .expect(200);
    expect(res.body).toEqual({ nombre: 'Diego Pérez' });
    const me = await request(BASE)
      .get('/auth/me')
      .set('Authorization', people.vendedor.auth)
      .expect(200);
    expect(me.body.nombre).toBe('Diego Pérez');
    expect(
      (await prisma.user.findFirst({ where: { usuarioId: people.vendedor.usuarioId } }))?.nombre,
    ).toBe('Diego Pérez');
  });

  it('changes the password only knowing the current one; pending reset links stop working', async () => {
    const change = (actual: string, nueva: string) =>
      request(BASE)
        .post('/auth/password/change')
        .set('Authorization', people.vendedor.auth)
        .send({ actual, nueva });
    const wrong = await change('no-es-esta', 'otra-clave-123');
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toContain('actual no es correcta');
    expect((await change(password, 'corta')).status).toBe(400);
    expect((await change(password, password)).status).toBe(400);

    await prisma.passwordResetToken.create({
      data: {
        usuarioId: people.vendedor.usuarioId,
        tokenHash: `p12-1-${suffix}`,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const next = `${randomUUID()}-nueva`;
    await change(password, next).expect(200);
    await request(BASE)
      .post('/auth/login')
      .send({ email: people.vendedor.email, password })
      .expect(401);
    await request(BASE)
      .post('/auth/login')
      .send({ email: people.vendedor.email, password: next })
      .expect(200);
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: `p12-1-${suffix}` },
    });
    expect(token?.usedAt).not.toBeNull();
  });

  it('shows the Business data to the team and lets only the Owner change it', async () => {
    const seen = await request(BASE)
      .get('/negocio')
      .set('Authorization', people.vendedor.auth)
      .expect(200);
    expect(seen.body).toMatchObject({
      nombre: `P12-1 a ${suffix}`,
      slug: `p12-1-a-${suffix}`,
      telefono: '',
      puedeEditar: false,
    });
    const body = {
      nombre: `Almacén Ronda ${suffix}`,
      telefono: '11 5555-0000',
      direccion: 'Av. Siempreviva 742',
      horario: 'Lun a sáb 9 a 20',
      descripcion: 'Bebidas y almacén',
    };
    await request(BASE)
      .patch('/negocio')
      .set('Authorization', people.vendedor.auth)
      .send(body)
      .expect(403);
    await request(BASE)
      .patch('/negocio')
      .set('Authorization', people.admin.auth)
      .send(body)
      .expect(403);
    const res = await request(BASE)
      .patch('/negocio')
      .set('Authorization', people.owner.auth)
      .send(body)
      .expect(200);
    expect(res.body).toEqual({ ...body, slug: `p12-1-a-${suffix}`, puedeEditar: true });

    // The rest of the configuration is kept, and the store shows the contact details.
    const config = (await prisma.empresa.findUnique({ where: { id: company.id } }))
      ?.configuracion as Record<string, unknown>;
    expect(config.devoluciones).toEqual({ plazoDias: 15 });
    const store = await request(BASE).get(`/p12-1-a-${suffix}/tienda`).expect(200);
    expect(store.body).toMatchObject({
      nombre: body.nombre,
      contacto: { telefono: '11 5555-0000', horario: 'Lun a sáb 9 a 20' },
    });
  });

  it('refuses a name another Business already uses', async () => {
    const res = await request(BASE)
      .patch('/negocio')
      .set('Authorization', people.owner.auth)
      .send({ nombre: `P12-1 b ${suffix}` })
      .expect(409);
    expect(res.body.message).toContain('otro negocio');
  });
});
