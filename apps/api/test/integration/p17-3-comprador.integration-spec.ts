import type { ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { deleteStoreCompanies, waitPort, deleteMessagingOf } from './helpers/store-catalog.fixture';

/**
 * ADR-IDN-001/008 — the universal buyer: one Wapsell account (Comprador) that works in any
 * business. Email sign-up needs the verification link; the buyer session is never a staff or
 * store-customer session; entering a store links (or creates) that store's Cliente.
 */
describe('P17-3 — comprador universal', () => {
  const PORT = '3372';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let slug: string;
  let businessId: string;
  const email = () => `p17-3-ana-${suffix}@example.test`;
  const password = randomBytes(9).toString('base64url');

  /** The verification link as the email would carry it (only its hash is stored). */
  const verificationLink = async (compradorId: string) => {
    const token = randomBytes(32).toString('base64url');
    await prisma.compradorToken.create({
      data: {
        compradorId,
        tipo: 'VERIFICAR_EMAIL',
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    return token;
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
    const res = await request(BASE)
      .post('/auth/registro')
      .send({
        nombreNegocio: `Almacén P17-3 ${suffix}`,
        nombre: 'Owner',
        email: `p17-3-owner-${suffix}@example.test`,
      })
      .expect(201);
    slug = res.body.tienda;
    businessId = (await prisma.empresa.findUniqueOrThrow({ where: { slug } })).id;
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const buyers = await prisma.comprador.findMany({
      where: { email: { contains: 'p17-3' } },
      select: { id: true },
    });
    const usuarios = (
      await prisma.usuario.findMany({ where: { empresaId: businessId }, select: { id: true } })
    ).map((u) => u.id);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, [businessId]);
    await prisma.cliente.deleteMany({ where: { empresaId: businessId } });
    await prisma.comprador.deleteMany({ where: { id: { in: buyers.map((b) => b.id) } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: businessId } });
    await prisma.passwordResetToken.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.userEmpresa.deleteMany({ where: { empresaId: businessId } });
    await prisma.caja.deleteMany({ where: { empresaId: businessId } });
    await prisma.membership.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await deleteStoreCompanies(prisma, [businessId]);
    await prisma.$disconnect();
  });

  it('signs up with email, needs the verification link, then signs in', async () => {
    await request(BASE)
      .post('/auth/comprador/registro')
      .send({ nombre: 'Ana Pérez', email: email().toUpperCase(), password })
      .expect(201);
    const buyer = await prisma.comprador.findUniqueOrThrow({ where: { email: email() } });
    expect(buyer.emailVerificadoAt).toBeNull();
    // Not verified yet: no sign-in.
    await request(BASE)
      .post('/auth/comprador/login')
      .send({ email: email(), password })
      .expect(401);

    const token = await verificationLink(buyer.id);
    const verified = await request(BASE)
      .post('/auth/comprador/verificar')
      .send({ token })
      .expect(200);
    expect(verified.body.comprador).toMatchObject({ nombre: 'Ana Pérez', email: email() });
    // Single use.
    await request(BASE).post('/auth/comprador/verificar').send({ token }).expect(401);

    const login = await request(BASE)
      .post('/auth/comprador/login')
      .send({ email: email(), password })
      .expect(200);
    const me = await request(BASE)
      .get('/auth/comprador/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email: email() });
    await request(BASE)
      .post('/auth/comprador/login')
      .send({ email: email(), password: 'wrong-password' })
      .expect(401);
    // A verified email cannot be registered again.
    await request(BASE)
      .post('/auth/comprador/registro')
      .send({ nombre: 'Otra', email: email(), password })
      .expect(409);
  });

  it('the buyer session is not a staff or store-customer session', async () => {
    const login = await request(BASE)
      .post('/auth/comprador/login')
      .send({ email: email(), password })
      .expect(200);
    const bearer = `Bearer ${login.body.accessToken}`;
    await request(BASE).get('/auth/me').set('Authorization', bearer).expect(401);
    await request(BASE).get('/auth/cliente/me').set('Authorization', bearer).expect(401);
  });

  it('enters a store: links the store account with the same email, once', async () => {
    // The store already had an account with this email (per-store sign-up, before).
    const old = await prisma.cliente.create({
      data: { empresaId: businessId, nombre: 'Ana (tienda)', email: email(), esMayorista: false },
    });
    const login = await request(BASE)
      .post('/auth/comprador/login')
      .send({ email: email(), password })
      .expect(200);
    const bearer = `Bearer ${login.body.accessToken}`;

    const first = await request(BASE)
      .post(`/auth/comprador/negocio/${slug}`)
      .set('Authorization', bearer)
      .expect(200);
    expect(first.body.cliente.id).toBe(old.id);
    const again = await request(BASE)
      .post(`/auth/comprador/negocio/${slug}`)
      .set('Authorization', bearer)
      .expect(200);
    expect(again.body.cliente.id).toBe(old.id);
    expect(await prisma.cliente.count({ where: { empresaId: businessId, email: email() } })).toBe(
      1,
    );

    // The store session works in the store.
    await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', `Bearer ${first.body.accessToken}`)
      .expect(200);
    // Without a buyer session there is no entering.
    await request(BASE).post(`/auth/comprador/negocio/${slug}`).expect(401);
    await request(BASE)
      .post(`/auth/comprador/negocio/no-existe-${suffix}`)
      .set('Authorization', bearer)
      .expect(404);
  });

  it('lists the businesses on Wapsell with public store data only', async () => {
    const res = await request(BASE).get('/auth/comprador/negocios').expect(200);
    const mine = res.body.find((b: { slug: string }) => b.slug === slug);
    expect(mine).toMatchObject({ nombre: `Almacén P17-3 ${suffix}`, slug });
    expect(Object.keys(mine).sort((a, b) => a.localeCompare(b))).toEqual([
      'ciudad',
      'nombre',
      'provincia',
      'rubro',
      'slug',
    ]);
  });
});
