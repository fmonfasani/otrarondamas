import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { codeAt, stepAt } from '../../src/auth/mfa/totp';
import { spawnApi } from './helpers/api-server.fixture';
import { deleteStoreCompanies, waitPort, deleteMessagingOf } from './helpers/store-catalog.fixture';

/**
 * OR-B4-044 — second factor with an authenticator app (TOTP).
 * Owner and Admin enrol at sign-in; Vendedor and Gestor de stock may opt in; a session without
 * the second factor is refused for those who need it; codes are never accepted twice; recovery
 * codes; remembered devices; lockout after 5 failures; the Owner resets a teammate's factor.
 */
describe('P17-1 — verificación en dos pasos (MFA)', () => {
  const PORT = '3372';
  const BASE = `http://127.0.0.1:${PORT}`;
  const password = `${randomUUID()}-Aa1`; // a fresh secret each run
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string };
  const people: Record<string, { usuarioId: string; email: string; membershipId: string }> = {};
  const secrets: Record<string, string> = {};

  async function person(role: 'OWNER' | 'ADMIN' | 'VENDEDOR', key: string) {
    const email = `p17-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: shop.id,
        nombre: `Nombre ${key}`,
        email,
        activo: true,
        rol: role,
        passwordHash: await bcrypt.hash(password, 4),
      },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `Nombre ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    const membership = await prisma.membership.create({
      data: { userId: user.id, businessId: shop.id, role, status: 'ACTIVE' },
      select: { id: true },
    });
    await prisma.userEmpresa.create({
      data: {
        usuarioId: usuario.id,
        empresaId: shop.id,
        role: role === 'OWNER' ? 'owner' : 'user',
      },
    });
    people[key] = { usuarioId: usuario.id, email, membershipId: membership.id };
  }

  const login = (key: string, extra: Record<string, unknown> = {}) =>
    request(BASE)
      .post('/auth/login')
      .send({ email: people[key].email, password, ...extra });
  const me = (token: string) =>
    request(BASE).get('/auth/me').set('Authorization', `Bearer ${token}`);
  const now = () => stepAt(Date.now());

  /**
   * A code the API will accept now. A code is never accepted twice, and only three are valid at
   * a time, so tests that sign in several times rewind the "last used" step first. The replay
   * test below checks the real behaviour without rewinding.
   */
  async function freshCode(key: string) {
    await prisma.mfaFactor.update({
      where: { usuarioId: people[key].usuarioId },
      data: { lastStep: now() - 2 },
    });
    return codeAt(secrets[key], now());
  }

  /** Enrols `key` from the sign-in ticket; returns the session (with the recovery codes). */
  async function enrol(key: string) {
    const first = await login(key).expect(200);
    expect(first.body).toEqual({ mfa: 'activar', ticket: expect.any(String) });
    const started = await request(BASE)
      .post('/auth/mfa/activar/iniciar')
      .send({ ticket: first.body.ticket })
      .expect(200);
    expect(started.body.enlace).toMatch(/^otpauth:\/\/totp\/Wapsell/);
    secrets[key] = started.body.clave;
    const done = await request(BASE)
      .post('/auth/mfa/activar/confirmar')
      .send({ ticket: first.body.ticket, codigo: codeAt(secrets[key], now()) })
      .expect(200);
    return done.body as { accessToken: string; codigosRecuperacion: string[] };
  }

  /** A full sign-in with the second factor. */
  async function signIn(key: string) {
    const { ticket } = (await login(key).expect(200)).body;
    const res = await request(BASE)
      .post('/auth/mfa/verificar')
      .send({ ticket, codigo: await freshCode(key) })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `P17-1 ${suffix}`, slug: `p17-1-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    await person('OWNER', 'owner');
    await person('ADMIN', 'admin');
    await person('VENDEDOR', 'seller');
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const ids = Object.values(people).map((p) => p.usuarioId);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, [shop.id]);
    await prisma.auditLog.deleteMany({ where: { empresaId: shop.id } });
    await prisma.mfaFactor.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.membership.deleteMany({ where: { businessId: shop.id } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.userEmpresa.deleteMany({ where: { empresaId: shop.id } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await deleteStoreCompanies(prisma, [shop.id]);
    await prisma.$disconnect();
  });

  it('lets a Vendedor in with the password alone', async () => {
    const res = await login('seller').expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    await me(res.body.accessToken).expect(200);
  });

  it('makes an Owner enrol before any session, with 10 recovery codes shown once', async () => {
    const session = await enrol('owner');
    expect(session.codigosRecuperacion).toHaveLength(10);
    await me(session.accessToken).expect(200);
    const factor = await prisma.mfaFactor.findUniqueOrThrow({
      where: { usuarioId: people.owner.usuarioId },
    });
    expect(factor.confirmedAt).not.toBeNull();
    // Only hashes are stored, and the secret is encrypted.
    expect(JSON.stringify(factor)).not.toContain(session.codigosRecuperacion[0]);
    expect(factor.secretEnc).not.toContain(secrets.owner);
    expect(
      await prisma.auditLog.count({ where: { empresaId: shop.id, accion: 'MFA_ACTIVADO' } }),
    ).toBe(1);
  });

  it('never gives a session to someone who needs MFA without it', async () => {
    const res = await login('admin').expect(200);
    expect(res.body).toEqual({ mfa: 'activar', ticket: expect.any(String) });
    await me(res.body.ticket).expect(401); // a ticket is not a session
  });

  it('asks the code at sign-in and never accepts the same code twice', async () => {
    await enrol('admin');
    const { ticket } = (await login('admin').expect(200)).body;
    await request(BASE).post('/auth/mfa/verificar').send({ ticket, codigo: '000000' }).expect(401);
    // The enrolment used the current step: it is not accepted again; the next one is, once.
    const used = codeAt(secrets.admin, now());
    const next = codeAt(secrets.admin, now() + 1);
    if (used !== next) {
      await request(BASE).post('/auth/mfa/verificar').send({ ticket, codigo: used }).expect(401);
    }
    await request(BASE).post('/auth/mfa/verificar').send({ ticket, codigo: next }).expect(200);
    await request(BASE).post('/auth/mfa/verificar').send({ ticket, codigo: next }).expect(401);
  });

  it('remembers a device for 30 days, only for that account', async () => {
    const { ticket } = (await login('admin').expect(200)).body;
    const ok = await request(BASE)
      .post('/auth/mfa/verificar')
      .send({ ticket, codigo: await freshCode('admin'), recordar: true })
      .expect(200);
    expect(ok.body.dispositivo).toEqual(expect.any(String));
    const again = await login('admin', { dispositivo: ok.body.dispositivo }).expect(200);
    expect(again.body.accessToken).toEqual(expect.any(String));
    const other = await login('owner', { dispositivo: ok.body.dispositivo }).expect(200);
    expect(other.body.mfa).toBe('verificar');
  });

  it('lets in with a recovery code exactly once', async () => {
    const session = await (async () => {
      // A fresh set of codes for the Owner (needs a current code).
      const token = await signIn('owner');
      return request(BASE)
        .post('/auth/mfa/codigos')
        .set('Authorization', `Bearer ${token}`)
        .send({ codigo: await freshCode('owner') })
        .expect(200);
    })();
    const recovery = session.body.codigosRecuperacion[0] as string;
    const first = (await login('owner').expect(200)).body.ticket;
    await request(BASE)
      .post('/auth/mfa/verificar')
      .send({ ticket: first, codigoRecuperacion: recovery.toUpperCase().replace('-', ' ') })
      .expect(200);
    const second = (await login('owner').expect(200)).body.ticket;
    await request(BASE)
      .post('/auth/mfa/verificar')
      .send({ ticket: second, codigoRecuperacion: recovery })
      .expect(401);
    expect(
      await prisma.auditLog.count({
        where: { empresaId: shop.id, accion: 'MFA_CODIGO_RECUPERACION' },
      }),
    ).toBe(1);
  });

  it('locks for 15 minutes after 5 wrong codes', async () => {
    // Start from zero (the previous test left one failed recovery attempt on purpose).
    await prisma.mfaFactor.update({
      where: { usuarioId: people.owner.usuarioId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    const { ticket } = (await login('owner').expect(200)).body;
    for (let i = 0; i < 4; i += 1) {
      await request(BASE)
        .post('/auth/mfa/verificar')
        .send({ ticket, codigo: '111111' })
        .expect(401);
    }
    await request(BASE).post('/auth/mfa/verificar').send({ ticket, codigo: '111111' }).expect(401);
    await request(BASE)
      .post('/auth/mfa/verificar')
      .send({ ticket, codigo: await freshCode('owner') })
      .expect(429);
    expect(
      await prisma.auditLog.count({ where: { empresaId: shop.id, accion: 'MFA_BLOQUEADO' } }),
    ).toBe(1);
    await prisma.mfaFactor.update({
      where: { usuarioId: people.owner.usuarioId },
      data: { lockedUntil: null, failedAttempts: 0 },
    });
  });

  it('lets a Vendedor turn it on and off by choice, but not someone who needs it', async () => {
    const seller = (await login('seller').expect(200)).body.accessToken as string;
    const started = await request(BASE)
      .post('/auth/mfa/iniciar')
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    secrets.seller = started.body.clave;
    const confirmed = await request(BASE)
      .post('/auth/mfa/confirmar')
      .set('Authorization', `Bearer ${seller}`)
      .send({ codigo: codeAt(secrets.seller, now()) })
      .expect(200);
    await me(seller).expect(401); // the old session had no second factor
    const fresh = confirmed.body.accessToken as string;
    const status = await request(BASE)
      .get('/auth/mfa')
      .set('Authorization', `Bearer ${fresh}`)
      .expect(200);
    expect(status.body).toMatchObject({ activo: true, obligatorio: false, codigosRestantes: 10 });
    await request(BASE)
      .post('/auth/mfa/desactivar')
      .set('Authorization', `Bearer ${fresh}`)
      .send({ codigo: await freshCode('seller') })
      .expect(200);
    expect(await prisma.mfaFactor.count({ where: { usuarioId: people.seller.usuarioId } })).toBe(0);

    const owner = await signIn('owner');
    await request(BASE)
      .post('/auth/mfa/desactivar')
      .set('Authorization', `Bearer ${owner}`)
      .send({ codigo: await freshCode('owner') })
      .expect(403);
  });

  it('lets only the Owner reset a teammate who lost the phone', async () => {
    const owner = await signIn('owner');
    const admin = await signIn('admin');
    await request(BASE)
      .patch(`/auth/mfa/equipo/${people.owner.membershipId}/resetear`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(403);
    await request(BASE)
      .patch(`/auth/mfa/equipo/${people.owner.membershipId}/resetear`)
      .set('Authorization', `Bearer ${owner}`)
      .expect(403); // never an Owner (nor oneself)
    await request(BASE)
      .patch(`/auth/mfa/equipo/${people.admin.membershipId}/resetear`)
      .set('Authorization', `Bearer ${owner}`)
      .expect(200);
    expect(await prisma.mfaFactor.count({ where: { usuarioId: people.admin.usuarioId } })).toBe(0);
    expect((await login('admin').expect(200)).body.mfa).toBe('activar');
    expect(
      await prisma.auditLog.count({ where: { empresaId: shop.id, accion: 'MFA_RESETEADO' } }),
    ).toBe(1);
  });
});
