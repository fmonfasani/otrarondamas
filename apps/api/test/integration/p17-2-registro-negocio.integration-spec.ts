import type { ChildProcess } from 'node:child_process';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { deleteStoreCompanies, waitPort, deleteMessagingOf } from './helpers/store-catalog.fixture';

/**
 * OR-B4-045 — public sign-up of a new Business with its Owner: with email (welcome link, no
 * password on the form) or with Google (verified identity, then MFA enrolment). Nobody joins an
 * existing Business this way.
 */
describe('P17-2 — alta de negocio (registro)', () => {
  const PORT = '3371';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;

  /** A Google sign-up ticket as the API signs it after a Google sign-in with no account. */
  const googleTicket = (email: string, nombre: string, googleId: string) => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const header = b64({ alg: 'HS256', typ: 'JWT' });
    const payload = b64({
      typ: 'signup-google',
      googleId,
      email,
      nombre,
      fotoUrl: null,
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    const sig = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${sig}`;
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = (
      await prisma.empresa.findMany({
        where: { nombre: { contains: `P17-2 ${suffix}` } },
        select: { id: true },
      })
    ).map((c) => c.id);
    const usuarios = (
      await prisma.usuario.findMany({
        where: { empresaId: { in: companies } },
        select: { id: true },
      })
    ).map((u) => u.id);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, companies);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.passwordResetToken.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.userEmpresa.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('registers a Business with email: Owner without password, welcome link, audited', async () => {
    const email = `p17-2-ana-${suffix}@example.test`;
    const res = await request(BASE)
      .post('/auth/registro')
      .send({ nombreNegocio: `Almacén P17-2 ${suffix}`, nombre: 'Ana Pérez', email })
      .expect(201);
    expect(res.body).toMatchObject({
      negocio: `Almacén P17-2 ${suffix}`,
      tienda: `almacen-p17-2-${suffix}`,
      email,
      mailEnviado: false, // no email provider in tests
    });
    const owner = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(owner).toMatchObject({ rol: 'OWNER', passwordHash: null });
    expect(await prisma.passwordResetToken.count({ where: { usuarioId: owner.id } })).toBe(1);
    expect(
      await prisma.membership.count({
        where: { businessId: owner.empresaId, role: 'OWNER', status: 'ACTIVE' },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { empresaId: owner.empresaId, accion: 'NEGOCIO_REGISTRADO' },
      }),
    ).toBe(1);
    // The response never carries the password link.
    expect(JSON.stringify(res.body)).not.toContain('token');
  });

  it('refuses a repeated email or business name, and finds a free store address', async () => {
    await request(BASE)
      .post('/auth/registro')
      .send({
        nombreNegocio: `Otro P17-2 ${suffix}`,
        nombre: 'Otra',
        email: `P17-2-ANA-${suffix}@example.test`,
      })
      .expect(409);
    await request(BASE)
      .post('/auth/registro')
      .send({
        nombreNegocio: `Almacén P17-2 ${suffix}`,
        nombre: 'Otra',
        email: `p17-2-b-${suffix}@example.test`,
      })
      .expect(409);
    // Same address from a different name ("Almacen" without accent) → «-2».
    const res = await request(BASE)
      .post('/auth/registro')
      .send({
        nombreNegocio: `Almacen P17-2 ${suffix}`,
        nombre: 'Beto',
        email: `p17-2-c-${suffix}@example.test`,
      })
      .expect(201);
    expect(res.body.tienda).toBe(`almacen-p17-2-${suffix}-2`);
    await request(BASE)
      .post('/auth/registro')
      .send({ nombreNegocio: 'X', nombre: 'Beto', email: 'no-es-email' })
      .expect(400);
  });

  it('registers with Google: verified identity, linked to Google, next step MFA', async () => {
    const email = `p17-2-g-${suffix}@example.test`;
    const ticket = googleTicket(email, 'Gabi Google', `g-${suffix}`);
    const who = await request(BASE)
      .post('/auth/registro/google/datos')
      .send({ ticket })
      .expect(200);
    expect(who.body).toEqual({ nombre: 'Gabi Google', email });
    const res = await request(BASE)
      .post('/auth/registro/google')
      .send({ ticket, nombreNegocio: `Kiosco P17-2 ${suffix}` })
      .expect(201);
    expect(res.body).toMatchObject({ mfa: 'activar', ticket: expect.any(String) });
    const owner = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(owner).toMatchObject({ rol: 'OWNER', googleId: `g-${suffix}` });
    // The MFA ticket starts the enrolment (and is not a session).
    await request(BASE)
      .post('/auth/mfa/activar/iniciar')
      .send({ ticket: res.body.ticket })
      .expect(200);
    await request(BASE)
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.ticket}`)
      .expect(401);
    // A forged or expired ticket is refused.
    await request(BASE)
      .post('/auth/registro/google')
      .send({ ticket: `${ticket}x`, nombreNegocio: `Otro kiosco P17-2 ${suffix}` })
      .expect(401);
  });

  it('«Vendé en Wapsell» stores the business profile, starting at INICIAL (ADR-IDN-008)', async () => {
    const catalog = await request(BASE).get('/auth/registro/catalogo').expect(200);
    expect(catalog.body.provincias).toContain('Santa Fe');
    expect(catalog.body.rubros.Bebidas).toContain('Vinoteca');

    const email = `p17-2-perfil-${suffix}@example.test`;
    const profile = {
      apellido: 'Pérez',
      cuit: '20-12345678-6',
      direccion: 'Av. Pellegrini 1200',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      codigoPostal: '2000',
      rubro: 'Bebidas',
      subrubro: 'Vinoteca',
    };
    // An invalid CUIT is refused before anything is created.
    await request(BASE)
      .post('/auth/registro')
      .send({
        nombreNegocio: `Vinoteca P17-2 ${suffix}`,
        nombre: 'Lucía',
        email,
        ...profile,
        cuit: '20-12345678-9',
      })
      .expect(400);
    expect(await prisma.usuario.findUnique({ where: { email } })).toBeNull();

    await request(BASE)
      .post('/auth/registro')
      .send({ nombreNegocio: `Vinoteca P17-2 ${suffix}`, nombre: 'Lucía', email, ...profile })
      .expect(201);
    const owner = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(owner.nombre).toBe('Lucía Pérez');
    const business = await prisma.empresa.findUniqueOrThrow({ where: { id: owner.empresaId } });
    expect(business.configuracion).toMatchObject({
      perfil: {
        cuit: '20123456786',
        nivel: 'INICIAL',
        provincia: 'Santa Fe',
        codigoPostal: '2000',
        rubro: 'Bebidas',
        subrubro: 'Vinoteca',
      },
      negocio: { direccion: 'Av. Pellegrini 1200, Rosario, Santa Fe' },
    });
  });
});
