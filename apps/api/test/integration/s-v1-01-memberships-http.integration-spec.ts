import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-01 — Minimal HTTP coverage of GET /auth/memberships against the
// REAL production stack: dist/src/main.js (compiled by `nest build`) is
// started on a dedicated port and hit over HTTP. It goes through:
// HTTP → JwtAuthGuard → JwtStrategy → CurrentUser → AuthController →
// MembershipService → response.
//
// Why not TestingModule: @nestjs/jwt v12 is pure ESM and does not load
// under jest CJS (neither directly nor via AuthModule); the server compiled
// with real node does resolve it. Login, JWT, guards and existing test
// configs are not modified for this spec.
describe('S-V1-01 — GET /auth/memberships (HTTP, stack real)', () => {
  const PORT = '3399';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let companyA: { id: string };
  let userWithMembership: { id: string };
  let userWithoutMembership: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (userId: string, companyId: string) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-http-${userId}@example.test`,
      nombre: 'S HTTP',
      empresaId: companyId,
      permisos: [],
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
      data: { nombre: `S-V1-01 HTTP ${suffix}`, slug: `s-v1-01-memberships-http-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUser = (tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyA.id,
          nombre: `S-V1-01 HTTP ${tag} ${suffix}`,
          email: `s-v1-01-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    userWithMembership = await mkUser('con');
    userWithoutMembership = await mkUser('sin');

    const user = await prisma.user.create({
      data: {
        email: `s-v1-01-http-con-${suffix}@example.test`,
        nombre: 'S HTTP Con',
        usuarioId: userWithMembership.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { usuarioId: { in: [userWithMembership.id, userWithoutMembership.id] } },
      select: { id: true },
    });
    await prisma.membership.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await prisma.usuario.deleteMany({
      where: { id: { in: [userWithMembership.id, userWithoutMembership.id] } },
    });
    await prisma.empresa.deleteMany({ where: { id: companyA.id } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV-H-01: sin token → 401', async () => {
    await request(BASE).get('/auth/memberships').expect(401);
  });

  it('SV-H-02: autenticado sin vínculo User → 200 + []', async () => {
    const token = tokenFor(userWithoutMembership.id, companyA.id);
    const res = await request(BASE)
      .get('/auth/memberships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('SV-H-03: autenticado con Membership → 200 + membership correcta', async () => {
    const token = tokenFor(userWithMembership.id, companyA.id);
    const res = await request(BASE)
      .get('/auth/memberships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
      businessId: companyA.id,
    });
    expect(res.body[0].businessNombre).toContain('S-V1-01 HTTP');
  });
});
