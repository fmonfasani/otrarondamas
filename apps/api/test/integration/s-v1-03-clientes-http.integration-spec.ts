import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-03 — Boundary HTTP de CLIENTES contra el stack REAL compilado
// (dist/src/main.js, el mismo binario de producción). Atraviesa la cadena
// completa, sin atajos:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → LegajoAprobadoGuard → ClientesController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveEmpresaId() → ClientesService
//        → EmpresaScopedPrismaService.forEmpresa() → empresaScopeExtension
//        → respuesta
//
// Por qué HTTP real y no TestingModule: @nestjs/jwt v12 es ESM puro y no
// carga bajo jest CJS (mismo límite documentado en
// s-v1-01-memberships-http.integration-spec.ts). Los guards globales y el
// orden JwtAuthGuard → PermissionsGuard solo se pueden comprobar de verdad
// así. No se modifica login, JWT, guards ni configs de test para este spec.
//
// El token se firma con el JWT_SECRET del proceso, igual que lo emite
// AuthService: los claims son LEGACY (con empresaId, sin membershipId ni
// businessId). La slice no toca el JWT.
describe('S-V1-03 — GET/POST /clientes (HTTP, stack real)', () => {
  const PORT = '3398';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let usuarioSinMembresias: { id: string };
  let usuarioSuspendido: { id: string };
  let userSinMembresias: { id: string };
  let clienteA: { id: string };
  let clienteB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenPara = (
    usuarioId: string,
    empresaIdDelToken: string,
    permisos: string[] = ['clientes.gestionar'],
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: usuarioId,
      email: `s-v1-03-${usuarioId}@example.test`,
      nombre: 'S V1-03',
      // Claim legacy: sigue viajando en el token y NO se usa como
      // autoridad de tenant para esta superficie.
      empresaId: empresaIdDelToken,
      permisos,
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
      data: { nombre: `S-V1-03 HTTP A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `S-V1-03 HTTP B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUsuario = (empresaId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId,
          nombre: `S-V1-03 HTTP ${tag} ${suffix}`,
          email: `s-v1-03-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    usuarioA = await mkUsuario(empresaA.id, 'a');
    usuarioB = await mkUsuario(empresaB.id, 'b');
    usuarioSinMembresias = await mkUsuario(empresaA.id, 'sinnmemb');
    usuarioSuspendido = await mkUsuario(empresaA.id, 'susp');

    const mkUser = async (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-03-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-03 HTTP ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(usuarioA.id, 'a');
    const userB = await mkUser(usuarioB.id, 'b');
    userSinMembresias = await mkUser(usuarioSinMembresias.id, 'sinnmemb');
    const userSuspendido = await mkUser(usuarioSuspendido.id, 'susp');

    await prisma.membership.create({
      data: { userId: userA.id, businessId: empresaA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userB.id, businessId: empresaB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: {
        userId: userSuspendido.id,
        businessId: empresaA.id,
        role: 'OWNER',
        status: 'SUSPENDED',
      },
    });
    // userSinMembresias queda deliberadamente sin Membership.

    clienteA = await prisma.cliente.create({
      data: { empresaId: empresaA.id, nombre: `S-V1-03 HTTP Cliente A ${suffix}` },
      select: { id: true },
    });
    clienteB = await prisma.cliente.create({
      data: { empresaId: empresaB.id, nombre: `S-V1-03 HTTP Cliente B ${suffix}` },
      select: { id: true },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await esperarPuerto(Number(PORT));
  }, 120000);

  afterAll(async () => {
    const empresas = [empresaA.id, empresaB.id];
    await prisma.cliente.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: empresas } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV3-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/clientes').expect(401);
  });

  it('SV3-H-02: User A + Membership ACTIVE A → 200 solo con datos de A', async () => {
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioA.id, empresaA.id)}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(clienteA.id);
    expect(ids).not.toContain(clienteB.id);
    expect(res.body.every((c: { empresaId: string }) => c.empresaId === empresaA.id)).toBe(true);
  });

  it('SV3-H-03: User sin Membership → 403 fail-closed', async () => {
    // El fixture es un User canónico existente y SIN ninguna Membership:
    // el 403 viene de la resolución de contexto, no de una identidad
    // desconocida.
    const memberships = await prisma.membership.findMany({
      where: { userId: userSinMembresias.id },
      select: { id: true },
    });
    expect(memberships).toEqual([]);

    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioSinMembresias.id, empresaA.id)}`)
      .expect(403);
    // Tampoco puede crear.
    await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioSinMembresias.id, empresaA.id)}`)
      .send({ nombre: 'no debe existir' })
      .expect(403);
  });

  it('SV3-H-04: Membership SUSPENDED → 403', async () => {
    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioSuspendido.id, empresaA.id)}`)
      .expect(403);
  });

  it('SV3-H-05: empresaId del token NO fija el tenant (gana la Membership)', async () => {
    // Token de A declarando empresaB: la Membership de A es la autoridad.
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioA.id, empresaB.id)}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(clienteA.id);
    expect(ids).not.toContain(clienteB.id);
  });

  it('SV3-H-06: Cliente de B por id directo desde A → 404 (no fuga)', async () => {
    await request(BASE)
      .get(`/clientes/${clienteB.id}`)
      .set('Authorization', `Bearer ${tokenPara(usuarioA.id, empresaA.id)}`)
      .expect(404);
    // Simétrico: B no alcanza el Cliente de A.
    await request(BASE)
      .get(`/clientes/${clienteA.id}`)
      .set('Authorization', `Bearer ${tokenPara(usuarioB.id, empresaB.id)}`)
      .expect(404);
  });

  it('SV3-H-07: B ve su propio Cliente y no el de A', async () => {
    const res = await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioB.id, empresaB.id)}`)
      .expect(200);
    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(clienteB.id);
    expect(ids).not.toContain(clienteA.id);
  });

  it('SV3-H-08: POST persiste bajo la Empresa del contexto, pese a empresaId en el body', async () => {
    const nombre = `S-V1-03 HTTP Creado ${suffix}`;
    const res = await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioA.id, empresaA.id)}`)
      .send({ nombre, empresaId: empresaB.id, email: `s-v1-03-http-creado-${suffix}@example.test` })
      .expect(201);

    expect(res.body.empresaId).toBe(empresaA.id);
    // Verificación en persistencia, no sólo en la respuesta.
    const fila = await prisma.cliente.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true, nombre: true },
    });
    expect(fila.empresaId).toBe(empresaA.id);
    expect(fila.nombre).toBe(nombre);
  });

  it('SV3-H-09: POST sin permisos → 403 (PermissionsGuard legacy intacto)', async () => {
    await request(BASE)
      .post('/clientes')
      .set('Authorization', `Bearer ${tokenPara(usuarioA.id, empresaA.id, [])}`)
      .send({ nombre: `S-V1-03 HTTP Sin Permiso ${suffix}` })
      .expect(403);
    const existe = await prisma.cliente.findFirst({
      where: { nombre: `S-V1-03 HTTP Sin Permiso ${suffix}` },
    });
    expect(existe).toBeNull();
  });

  it('SV3-H-10: legajo PENDIENTE sigue bloqueado por LegajoAprobadoGuard', async () => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: usuarioA.id,
      email: `s-v1-03-${usuarioA.id}@example.test`,
      nombre: 'S V1-03',
      empresaId: empresaA.id,
      permisos: ['clientes.gestionar'],
      rol: 'OWNER',
      estadoLegajo: 'PENDIENTE',
      type: 'usuario',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const firma = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    await request(BASE)
      .get('/clientes')
      .set('Authorization', `Bearer ${header}.${payload}.${firma}`)
      .expect(403);
  });
});
