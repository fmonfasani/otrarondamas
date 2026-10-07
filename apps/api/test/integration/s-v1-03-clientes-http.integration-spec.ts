import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-03 — HTTP boundary of CLIENTES against the REAL compiled stack
// (dist/src/main.js, the same production binary). It goes through the
// whole chain, no shortcuts:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → CustomersController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CustomersService
//        → CompanyScopedPrismaService.forCompany() → companyScopeExtension
//        → response
//
// Why real HTTP and not a TestingModule: @nestjs/jwt v12 is pure ESM and does
// not load under jest CJS (same limit documented in
// s-v1-01-memberships-http.integration-spec.ts). The global guards and the
// JwtAuthGuard → PermissionsGuard order can only be truly verified this way.
// Login, JWT, guards and test configs are not modified for this spec.
//
// The token is signed with the process JWT_SECRET, the same way AuthService
// issues it: the claims are LEGACY (with empresaId, without membershipId or
// businessId). The slice does not touch the JWT.
describe('S-V1-03 — GET/POST /clientes (HTTP, stack real)', () => {
  const PORT = '3398';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string };
  let legacyUserB: { id: string };
  let legacyUserWithoutMemberships: { id: string };
  let legacySuspendedUser: { id: string };
  let userWithoutMemberships: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['clientes.gestionar'],
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-03-${userId}@example.test`,
      nombre: 'S V1-03',
      // Legacy claim: it still travels in the token and is NOT used as the
      // tenant authority for this surface.
      empresaId: tokenCompanyId,
      permisos: permissions,
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  };

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        const socket = net.connect(port, '127.0.0.1');
        socket.on('connect', () => {
          socket.end();
          resolve();
        });
        socket.on('error', () => {
          if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta`));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-03 HTTP A ${suffix}`, slug: `s-v1-03-clientes-http-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-03 HTTP B ${suffix}`, slug: `s-v1-03-clientes-http-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-03 HTTP ${tag} ${suffix}`,
          email: `s-v1-03-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyUserWithoutMemberships = await mkLegacyUser(companyA.id, 'sinnmemb');
    legacySuspendedUser = await mkLegacyUser(companyA.id, 'susp');

    const mkUser = async (userId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-03-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-03 HTTP ${tag}`,
          usuarioId: userId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    userWithoutMemberships = await mkUser(legacyUserWithoutMemberships.id, 'sinnmemb');
    const suspendedUser = await mkUser(legacySuspendedUser.id, 'susp');

    await prisma.membership.create({
      data: { userId: userA.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userB.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: {
        userId: suspendedUser.id,
        businessId: companyA.id,
        role: 'OWNER',
        status: 'SUSPENDED',
      },
    });
    // userWithoutMemberships is deliberately left without a Membership.

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-03 HTTP Cliente A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `S-V1-03 HTTP Cliente B ${suffix}` },
      select: { id: true },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV3-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/clientes').expect(401);
  });

  it('SV3-H-02: User A + Membership ACTIVE A → 200 solo con datos de A', async () => {
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(customerA.id);
    expect(ids).not.toContain(customerB.id);
    expect(res.body.every((c: { empresaId: string }) => c.empresaId === companyA.id)).toBe(true);
  });

  it('SV3-H-03: User sin Membership → 403 fail-closed', async () => {
    // The fixture is an existing canonical User with NO Membership at all:
    // the 403 comes from context resolution, not from an unknown
    // identity.
    const memberships = await prisma.membership.findMany({
      where: { userId: userWithoutMemberships.id },
      select: { id: true },
    });
    expect(memberships).toEqual([]);

    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    // It cannot create either.
    await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .send({ nombre: 'no debe existir' })
      .expect(403);
  });

  it('SV3-H-04: Membership SUSPENDED → 403', async () => {
    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .expect(403);
  });

  it('SV3-H-05: empresaId del token NO fija el tenant (gana la Membership)', async () => {
    // A's token declaring companyB: A's Membership is the authority.
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(customerA.id);
    expect(ids).not.toContain(customerB.id);
  });

  it('SV3-H-06: Cliente de B por id directo desde A → 404 (no fuga)', async () => {
    await request(BASE)
      .get(`/clientes/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(404);
    // Symmetric: B cannot reach A's Cliente.
    await request(BASE)
      .get(`/clientes/${customerA.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(404);
  });

  it('SV3-H-07: B ve su propio Cliente y no el de A', async () => {
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(customerB.id);
    expect(ids).not.toContain(customerA.id);
  });

  it('SV3-H-08: POST persiste bajo la Empresa del contexto, pese a empresaId en el body', async () => {
    const name = `S-V1-03 HTTP Creado ${suffix}`;
    const res = await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({
        nombre: name,
        empresaId: companyB.id,
        email: `s-v1-03-http-creado-${suffix}@example.test`,
      })
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    // Verification at the persistence level, not only in the response.
    const row = await prisma.cliente.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true, nombre: true },
    });
    expect(row.empresaId).toBe(companyA.id);
    expect(row.nombre).toBe(name);
  });

  it('SV3-H-09: POST sin permisos → 403 (PermissionsGuard legacy intacto)', async () => {
    await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id, [])}`)
      .send({ nombre: `S-V1-03 HTTP Sin Permiso ${suffix}` })
      .expect(403);
    const exists = await prisma.cliente.findFirst({
      where: { nombre: `S-V1-03 HTTP Sin Permiso ${suffix}` },
    });
    expect(exists).toBeNull();
  });

  it('SV3-H-10: legajo PENDIENTE sigue bloqueado por ApprovedDossierGuard', async () => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: legacyUserA.id,
      email: `s-v1-03-${legacyUserA.id}@example.test`,
      nombre: 'S V1-03',
      empresaId: companyA.id,
      permisos: ['clientes.gestionar'],
      rol: 'OWNER',
      estadoLegajo: 'PENDIENTE',
      type: 'usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${header}.${payload}.${signature}`)
      .expect(403);
  });
});
