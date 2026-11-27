import type { ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * Login por rol (Owner, 2026-11-26) — the work account and the customer account of the same
 * person join once by email (the customer account's password, one click when there is none, or an
 * emailed link opened with the work session). The work key opens both; the buyer session never
 * opens the panel. Real API and PostgreSQL.
 */
describe('Login por rol — unir la cuenta de trabajo con la de cliente', () => {
  const PORT = '3402';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  const people: Record<string, { usuarioId: string; userId: string; email: string; auth: string }> =
    {};

  async function person(key: string) {
    const email = `rol-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: `Persona ${key}`, email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email, nombre: `Persona ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      email,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company.id, permisos: [] })}`,
    };
  }

  const status = (key: string) =>
    request(BASE).get('/auth/comprador/vinculo').set('Authorization', people[key].auth);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `Rol ${suffix}`, slug: `rol-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    for (const key of ['nueva', 'conclave', 'google', 'otra', 'tomada']) await person(key);
    // A customer account with a password and the same email as «conclave».
    await prisma.comprador.create({
      data: {
        email: people.conclave.email,
        nombre: 'Cliente',
        passwordHash: await bcrypt.hash('clave-cliente-1', 4),
        emailVerificadoAt: new Date(),
      },
    });
    // A Google customer account (no password) with the same email as «google».
    await prisma.comprador.create({
      data: {
        email: people.google.email,
        nombre: 'Cliente Google',
        googleId: `g-${suffix}`,
        emailVerificadoAt: new Date(),
      },
    });
    // Someone signed up with «tomada»'s email but never proved it.
    await prisma.comprador.create({
      data: {
        email: people.tomada.email,
        nombre: 'Intruso',
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const emails = Object.values(people).map((p) => p.email);
    await prisma.compradorToken.deleteMany({ where: { Comprador: { email: { in: emails } } } });
    await prisma.comprador.deleteMany({ where: { email: { in: emails } } });
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(people).map((p) => p.userId) } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: Object.values(people).map((p) => p.usuarioId) } },
    });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
  });

  it('without a customer account: one click creates it and joins it; the buyer session never opens the panel', async () => {
    expect((await status('nueva').expect(200)).body).toEqual({
      estado: 'sin-cuenta',
      email: people.nueva.email,
    });
    const created = await request(BASE)
      .post('/auth/comprador/vinculo/crear')
      .set('Authorization', people.nueva.auth)
      .expect(200);
    expect(created.body.comprador.email).toBe(people.nueva.email);
    expect((await status('nueva').expect(200)).body.estado).toBe('unida');
    const again = await request(BASE)
      .post('/auth/comprador/vinculo/entrar')
      .set('Authorization', people.nueva.auth)
      .expect(200);
    const buyer = `Bearer ${again.body.accessToken}`;
    await request(BASE).get('/auth/comprador/me').set('Authorization', buyer).expect(200);
    await request(BASE).get('/messaging/conversations').set('Authorization', buyer).expect(401);
  });

  it('with a customer account: its password joins them; a wrong one does not, and tries are braked', async () => {
    expect((await status('conclave').expect(200)).body).toEqual({
      estado: 'por-confirmar',
      email: people.conclave.email,
      tieneClave: true,
    });
    await request(BASE)
      .post('/auth/comprador/vinculo/clave')
      .set('Authorization', people.conclave.auth)
      .send({ password: 'mal' })
      .expect(401);
    await request(BASE)
      .post('/auth/comprador/vinculo/crear')
      .set('Authorization', people.conclave.auth)
      .expect(409);
    const ok = await request(BASE)
      .post('/auth/comprador/vinculo/clave')
      .set('Authorization', people.conclave.auth)
      .send({ password: 'clave-cliente-1' })
      .expect(200);
    expect(ok.body.comprador.email).toBe(people.conclave.email);
    expect((await status('conclave').expect(200)).body.estado).toBe('unida');
    // «otra»: five wrong passwords, then braked.
    for (let i = 0; i < 5; i += 1) {
      await request(BASE)
        .post('/auth/comprador/vinculo/clave')
        .set('Authorization', people.otra.auth)
        .send({ password: 'x' });
    }
    await request(BASE)
      .post('/auth/comprador/vinculo/clave')
      .set('Authorization', people.otra.auth)
      .send({ password: 'x' })
      .expect(429);
  });

  it('a Google customer account joins with the emailed link, opened with the same work session only', async () => {
    expect((await status('google').expect(200)).body).toMatchObject({
      estado: 'por-confirmar',
      tieneClave: false,
    });
    const sent = await request(BASE)
      .post('/auth/comprador/vinculo/mail')
      .set('Authorization', people.google.auth)
      .expect(200);
    expect(sent.body.email).toBe(people.google.email);
    // The emailed token (only its hash is kept): a known one, as if read from the inbox.
    const token = `token-de-prueba-${suffix}`;
    const buyer = await prisma.comprador.findUniqueOrThrow({
      where: { email: people.google.email },
    });
    await prisma.compradorToken.create({
      data: {
        compradorId: buyer.id,
        tipo: 'UNIR_CUENTA',
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    // Someone else's work session cannot use it.
    await request(BASE)
      .post('/auth/comprador/vinculo/confirmar')
      .set('Authorization', people.otra.auth)
      .send({ token })
      .expect(401);
    await request(BASE)
      .post('/auth/comprador/vinculo/confirmar')
      .set('Authorization', people.google.auth)
      .send({ token })
      .expect(200);
    expect((await status('google').expect(200)).body.estado).toBe('unida');
    // A link works once.
    await request(BASE)
      .post('/auth/comprador/vinculo/confirmar')
      .set('Authorization', people.google.auth)
      .send({ token })
      .expect(401);
  });

  it('an unproven sign-up with the same email goes to the proven owner of the email', async () => {
    expect((await status('tomada').expect(200)).body.estado).toBe('sin-cuenta');
    await request(BASE)
      .post('/auth/comprador/vinculo/crear')
      .set('Authorization', people.tomada.auth)
      .expect(200);
    const buyer = await prisma.comprador.findUniqueOrThrow({
      where: { email: people.tomada.email },
    });
    expect(buyer).toMatchObject({ userId: people.tomada.userId, passwordHash: null });
    expect(buyer.emailVerificadoAt).not.toBeNull();
  });

  it('is only for work sessions', async () => {
    const customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente tienda',
        email: `rol-c-${suffix}@example.test`,
      },
      select: { id: true },
    });
    await request(BASE)
      .get('/auth/comprador/vinculo')
      .set('Authorization', `Bearer ${signCustomerToken(customer.id, company.id)}`)
      .expect(403);
    await request(BASE).get('/auth/comprador/vinculo').expect(401);
  });
});
