import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-01 — Cobertura HTTP mínima de GET /auth/memberships contra el stack
// REAL de producción: se levanta dist/src/main.js (compilado por
// `nest build`) en un puerto dedicado y se le pega por HTTP. Atraviesa:
// HTTP → JwtAuthGuard → JwtStrategy → CurrentUser → AuthController →
// MembershipService → response.
//
// Por qué no TestingModule: @nestjs/jwt v12 es ESM puro y no carga bajo
// jest CJS (ni directo ni vía AuthModule); el servidor compilado con node
// real sí lo resuelve. No se modifica login, JWT, guards ni configs de
// test existentes para este spec.
describe('S-V1-01 — GET /auth/memberships (HTTP, stack real)', () => {
  const PORT = '3399';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let empresaA: { id: string };
  let usuarioConMembership: { id: string };
  let usuarioSinMembership: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenPara = (usuarioId: string, empresaId: string) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: usuarioId,
      email: `s-http-${usuarioId}@example.test`,
      nombre: 'S HTTP',
      empresaId,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const firma = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${firma}`;
  };

  const esperarPuerto = (puerto: number, intentos = 60) =>
    new Promise<void>((resolve, reject) => {
      const probar = (restantes: number) => {
        const socket = net.connect(puerto, '127.0.0.1');
        socket.on('connect', () => {
          socket.end();
          resolve();
        });
        socket.on('error', () => {
          if (restantes <= 0) reject(new Error(`puerto ${puerto} sin respuesta`));
          else setTimeout(() => probar(restantes - 1), 1000);
        });
      };
      probar(intentos);
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `S-V1-01 HTTP ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUsuario = (tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: empresaA.id,
          nombre: `S-V1-01 HTTP ${tag} ${suffix}`,
          email: `s-v1-01-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    usuarioConMembership = await mkUsuario('con');
    usuarioSinMembership = await mkUsuario('sin');

    const user = await prisma.user.create({
      data: {
        email: `s-v1-01-http-con-${suffix}@example.test`,
        nombre: 'S HTTP Con',
        usuarioId: usuarioConMembership.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: empresaA.id, role: 'OWNER', status: 'ACTIVE' },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await esperarPuerto(Number(PORT));
  }, 120000);

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { usuarioId: { in: [usuarioConMembership.id, usuarioSinMembership.id] } },
      select: { id: true },
    });
    await prisma.membership.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioConMembership.id, usuarioSinMembership.id] } },
    });
    await prisma.empresa.deleteMany({ where: { id: empresaA.id } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV-H-01: sin token → 401', async () => {
    await request(BASE).get('/auth/memberships').expect(401);
  });

  it('SV-H-02: autenticado sin vínculo User → 200 + []', async () => {
    const token = tokenPara(usuarioSinMembership.id, empresaA.id);
    const res = await request(BASE)
      .get('/auth/memberships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('SV-H-03: autenticado con Membership → 200 + membership correcta', async () => {
    const token = tokenPara(usuarioConMembership.id, empresaA.id);
    const res = await request(BASE)
      .get('/auth/memberships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
      businessId: empresaA.id,
    });
    expect(res.body[0].businessNombre).toContain('S-V1-01 HTTP');
  });
});
