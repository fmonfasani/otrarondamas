import { createHmac, randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as net from 'net';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-13 — Cash (/caja) + /autorizaciones: tenant boundary over real HTTP.
//
// Proves that CashRegisterController (7 handlers) and AuthorizationsController
// resolve the Business through BusinessContextService (ACTIVE Membership) and
// NOT through the legacy `empresaId` claim of the JWT:
//
//   token (legacy claim) → JwtAuthGuard → PermissionsGuard → ApprovedDossierGuard
//        → BusinessContextService (Membership ACTIVE → Business → Empresa)
//        → CashRegisterService / AuthorizationsService (untouched) → companyScopeExtension
//
// Real HTTP instead of a TestingModule for the same reason documented in
// s-v1-04-catalog-http.integration-spec.ts (@nestjs/jwt v12 is ESM and does
// not load under jest CJS). It spawns dist/src/main.js, so `nest build` must
// have run first and JWT_SECRET / GOOGLE_* / DATABASE_URL (DISPOSABLE DB) must
// be set.
//
// Everything about the cash business behavior CHARACTERIZES the current code;
// it is not adopted as TO-BE (multi-cash, D-05 threshold, D-06 mechanism and
// the sensitive-operation catalog are still open Owner decisions).
describe('S-V1-13 — Cash + /autorizaciones (HTTP, stack real)', () => {
  const PORT = '3391';
  const BASE = `http://127.0.0.1:${PORT}`;
  const PERM = 'caja.gastos';
  const PASSWORD = 'S-V1-13-password';
  const OPERATION = 'caja.cierreConDiferencia';

  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;
  let passwordHash: string;
  let createdPermissionId: string | null = null;

  let companyA: { id: string };
  let companyB: { id: string };
  let cashA: { id: string };
  let cashB: { id: string };

  // legacy Usuario rows
  let legacyUserA: { id: string; email: string };
  let legacyUserA2: { id: string; email: string }; // incoming user of A
  let authorizerA: { id: string; email: string }; // has caja.gastos
  let authorizerNoPerm: { id: string; email: string }; // company A, without the permission
  let legacyUserB: { id: string; email: string };
  let legacyUserB2: { id: string; email: string };
  let authorizerB: { id: string; email: string }; // has caja.gastos
  let legacyDivergent: { id: string; email: string }; // legacy empresaId = A, Membership = B
  let legacyNoMembership: { id: string };
  let legacySuspended: { id: string };
  let legacyUnlinked: { id: string };
  let legacyMulti: { id: string };
  let userIds: string[];

  // Fixtures created directly for B (open shift with an unauthorized cash count)
  let openingB: { id: string };
  let movementB: { id: string };
  let cashCountB: { id: string };

  // State produced by the HTTP cycles on A
  let cashCountA: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = [PERM],
    type: 'usuario' | 'cliente' = 'usuario',
    estadoLegajo: 'APROBADO' | 'PENDIENTE' = 'APROBADO',
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-13-${userId}@example.test`,
      nombre: 'S V1-13',
      // Legacy claim: it still travels in the token and is NOT the tenant
      // authority for this surface.
      empresaId: tokenCompanyId,
      permisos: permissions,
      rol: 'OWNER',
      estadoLegajo,
      type,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  };

  const bearer = (...args: Parameters<typeof tokenFor>) => `Bearer ${tokenFor(...args)}`;

  type Method = 'get' | 'post' | 'patch';
  const call = (method: Method, path: string, auth?: string, body?: object) => {
    let req = request(BASE)[method](path);
    if (auth) req = req.set('Authorization', auth);
    return body ? req.send(body) : req;
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

  // Every persisted Cash resource of one Business (Caja, Apertura, Movimiento,
  // Arqueo, Cierre, Autorizacion), used to prove that a request did not touch it.
  const snapshotCash = async (companyId: string) => {
    const cash = await prisma.caja.findUniqueOrThrow({ where: { empresaId: companyId } });
    return JSON.stringify({
      caja: cash,
      aperturas: await prisma.aperturaCaja.findMany({
        where: { cajaId: cash.id },
        orderBy: { id: 'asc' },
      }),
      movimientos: await prisma.movimientoCaja.findMany({
        where: { cajaId: cash.id },
        orderBy: { id: 'asc' },
      }),
      arqueos: await prisma.arqueoCaja.findMany({
        where: { cajaId: cash.id },
        orderBy: { id: 'asc' },
      }),
      cierres: await prisma.cierreCaja.findMany({
        where: { aperturaCaja: { cajaId: cash.id } },
        orderBy: { id: 'asc' },
      }),
      autorizaciones: await prisma.autorizacion.findMany({
        where: { empresaId: companyId },
        orderBy: { id: 'asc' },
      }),
    });
  };

  const credentialsOf = (user: { email: string }) => ({ email: user.email, password: PASSWORD });

  // The 8 routes in scope (7 /caja handlers + POST /autorizaciones) with
  // VALID bodies, so a rejection is attributable to the guard/BusinessContext
  // and not to DTO validation.
  const allRoutes = (): Array<[Method, string, object | undefined]> => [
    ['get', '/caja/estado', undefined],
    ['post', '/caja/apertura', { montoInicial: 500 }],
    ['post', '/caja/movimientos', { tipo: 'Gasto', monto: 10 }],
    ['get', '/caja/movimientos', undefined],
    ['post', '/caja/arqueo', { usuarioEntranteId: randomUUID(), efectivoContado: 0 }],
    [
      'patch',
      `/caja/arqueo/${cashCountB.id}/autorizar`,
      { ...credentialsOf(authorizerA), motivo: 'x' },
    ],
    ['post', '/caja/cierre', undefined],
    ['post', '/autorizaciones', { operacion: OPERATION, ...credentialsOf(authorizerA) }],
  ];

  const expectAllRoutesRejected = async (auth: string, status: number) => {
    const beforeA = await snapshotCash(companyA.id);
    const beforeB = await snapshotCash(companyB.id);
    for (const [method, path, body] of allRoutes()) {
      const res = await call(method, path, auth, body);
      expect([method, path, res.status]).toEqual([method, path, status]);
    }
    expect(await snapshotCash(companyA.id)).toBe(beforeA);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    passwordHash = await bcrypt.hash(PASSWORD, 4);

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-13 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-13 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-13 ${tag} ${suffix}`,
          email: `s-v1-13-${tag}-${suffix}@example.test`,
          passwordHash,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true, email: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserA2 = await mkLegacyUser(companyA.id, 'a2');
    authorizerA = await mkLegacyUser(companyA.id, 'authz-a');
    authorizerNoPerm = await mkLegacyUser(companyA.id, 'authz-noperm');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyUserB2 = await mkLegacyUser(companyB.id, 'b2');
    authorizerB = await mkLegacyUser(companyB.id, 'authz-b');
    legacyDivergent = await mkLegacyUser(companyA.id, 'divergent');
    legacyNoMembership = await mkLegacyUser(companyA.id, 'sinmemb');
    legacySuspended = await mkLegacyUser(companyA.id, 'susp');
    legacyUnlinked = await mkLegacyUser(companyA.id, 'sinuser'); // no canonical User
    legacyMulti = await mkLegacyUser(companyA.id, 'multi');

    // caja.gastos: the permission already protects movimientos/cierre and is the
    // one the authorizer must hold. Reuse it if the disposable DB was seeded.
    let permission = await prisma.permiso.findUnique({ where: { nombre: PERM } });
    if (!permission) {
      permission = await prisma.permiso.create({ data: { nombre: PERM } });
      createdPermissionId = permission.id;
    }
    for (const authorizer of [authorizerA, authorizerB]) {
      await prisma.usuarioPermiso.create({
        data: { usuarioId: authorizer.id, permisoId: permission.id },
      });
    }

    const mkUser = (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-13-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-13 ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    const userDivergent = await mkUser(legacyDivergent.id, 'divergent');
    const userNoMembership = await mkUser(legacyNoMembership.id, 'sinmemb');
    const userSuspended = await mkUser(legacySuspended.id, 'susp');
    const userMulti = await mkUser(legacyMulti.id, 'multi');
    userIds = [
      userA.id,
      userB.id,
      userDivergent.id,
      userNoMembership.id,
      userSuspended.id,
      userMulti.id,
    ];

    const mkMembership = (userId: string, businessId: string, status: 'ACTIVE' | 'SUSPENDED') =>
      prisma.membership.create({ data: { userId, businessId, role: 'OWNER', status } });

    await mkMembership(userA.id, companyA.id, 'ACTIVE');
    await mkMembership(userB.id, companyB.id, 'ACTIVE');
    // legacy empresaId = A, but the canonical authority is Business B
    await mkMembership(userDivergent.id, companyB.id, 'ACTIVE');
    await mkMembership(userSuspended.id, companyA.id, 'SUSPENDED');
    await mkMembership(userMulti.id, companyA.id, 'ACTIVE');
    await mkMembership(userMulti.id, companyB.id, 'ACTIVE');
    // userNoMembership: deliberately no Membership; legacyUnlinked: no canonical User.

    cashA = await prisma.caja.create({
      data: { empresaId: companyA.id, fondoFijo: 1000 },
      select: { id: true },
    });
    cashB = await prisma.caja.create({
      data: { empresaId: companyB.id, fondoFijo: 2000, estado: 'EN_ARQUEO' },
      select: { id: true },
    });

    // Business B starts with an open shift, a movement and an UNAUTHORIZED cash
    // count (difference 10000 > 5000): cross-tenant targets for A.
    openingB = await prisma.aperturaCaja.create({
      data: { cajaId: cashB.id, usuarioId: legacyUserB.id, montoInicial: 2000 },
      select: { id: true },
    });
    movementB = await prisma.movimientoCaja.create({
      data: {
        cajaId: cashB.id,
        aperturaCajaId: openingB.id,
        usuarioId: legacyUserB.id,
        tipo: 'Ingreso',
        monto: 300,
        descripcion: `S-V1-13 B movement ${suffix}`,
      },
      select: { id: true },
    });
    cashCountB = await prisma.arqueoCaja.create({
      data: {
        cajaId: cashB.id,
        aperturaCajaId: openingB.id,
        usuarioId: legacyUserB.id,
        usuarioEntranteId: legacyUserB2.id,
        fondoFijoContado: 2000,
        efectivoVentasContado: 0,
        efectivoDeudasContado: 0,
        gastosRetirosRegistrados: 0,
        efectivoEsperado: 2300,
        efectivoContado: 12300,
        diferencia: 10000,
      },
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
    const cashIds = [cashA.id, cashB.id];
    await prisma.arqueoCaja.deleteMany({ where: { cajaId: { in: cashIds } } });
    await prisma.cierreCaja.deleteMany({ where: { aperturaCaja: { cajaId: { in: cashIds } } } });
    await prisma.movimientoCaja.deleteMany({ where: { cajaId: { in: cashIds } } });
    await prisma.aperturaCaja.deleteMany({ where: { cajaId: { in: cashIds } } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.autorizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuarioPermiso.deleteMany({
      where: { usuario: { empresaId: { in: companies } } },
    });
    if (createdPermissionId) {
      await prisma.permiso.deleteMany({ where: { id: createdPermissionId } });
    }
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  // ------------------------------------------------------------------ auth / guards

  it('CH-01: sin token → 401 en las 8 rutas (JwtAuthGuard global intacto)', async () => {
    for (const [method, path, body] of allRoutes()) {
      await call(method, path, undefined, body).expect(401);
    }
  });

  it('CH-02: guards y boundary intactos en el código fuente (INV-03/04/05/07)', () => {
    const read = (file: string) => readFileSync(join(process.cwd(), 'src', file), 'utf8');
    const cashController = read('cash-register/cash-register.controller.ts');
    const authzController = read('authorizations/authorizations.controller.ts');

    for (const source of [cashController, authzController]) {
      expect(source).not.toMatch(/user\.empresaId/);
      expect(source).toContain('BusinessContextService');
      expect(source).toContain('resolveForAuthenticatedUser');
      expect(source).toMatch(/@UseGuards\(ApprovedDossierGuard\)\s*(\/\/[^\n]*)?\s*export class/);
    }
    expect(read('cash-register/cash-register.module.ts')).toContain('BusinessContextModule');
    expect(read('authorizations/authorizations.module.ts')).toContain('BusinessContextModule');

    // `caja.gastos` exactly on POST movimientos and POST cierre; nowhere else.
    const decorated = [
      ...cashController.matchAll(/@RequirePermission\('([^']+)'\)\s*@Post\('([^']+)'\)/g),
    ]
      .map((m) => `${m[1]}:${m[2]}`)
      .sort();
    expect(decorated).toEqual([`${PERM}:cierre`, `${PERM}:movimientos`]);
    expect((cashController.match(/^\s*@RequirePermission\(/gm) ?? []).length).toBe(2);
    expect(authzController).not.toMatch(/^\s*@RequirePermission\(/m);
  });

  // ------------------------------------------------------------------ BusinessContext cases 1-3

  it('CH-03 (caso 1): usuario A + Membership A, claim A → opera sobre la Caja de A', async () => {
    const res = await call('get', '/caja/estado', bearer(legacyUserA.id, companyA.id)).expect(200);
    expect(res.body.caja.id).toBe(cashA.id);
    expect(res.body.caja.empresaId).toBe(companyA.id);
    expect(res.body.caja.estado).toBe('CERRADA');
    expect(res.body.aperturaVigente).toBeNull();
  });

  it('CH-04 (caso 2): claim B + Membership A → opera sobre A (el claim no es autoridad)', async () => {
    const res = await call('get', '/caja/estado', bearer(legacyUserA.id, companyB.id)).expect(200);
    expect(res.body.caja.id).toBe(cashA.id);
    expect(res.body.caja.empresaId).toBe(companyA.id);
    const movements = await call(
      'get',
      '/caja/movimientos',
      bearer(legacyUserA.id, companyB.id),
    ).expect(200);
    expect(movements.body).toEqual([]);
  });

  it('CH-05 (caso 3): claim A + Membership B (legacy empresaId = A) → opera sobre B', async () => {
    const res = await call('get', '/caja/estado', bearer(legacyDivergent.id, companyA.id)).expect(
      200,
    );
    expect(res.body.caja.id).toBe(cashB.id);
    expect(res.body.aperturaVigente.id).toBe(openingB.id);
    const movements = await call(
      'get',
      '/caja/movimientos',
      bearer(legacyDivergent.id, companyA.id),
    ).expect(200);
    expect(movements.body.map((m: { id: string }) => m.id)).toEqual([movementB.id]);
  });

  // ------------------------------------------------------------------ BusinessContext cases 4-7 (fail closed)

  it('CH-06 (caso 4): sin Membership ACTIVE → 403 en las 8 rutas, nada persistido', async () => {
    await expectAllRoutesRejected(bearer(legacyNoMembership.id, companyA.id), 403);
    const res = await call(
      'get',
      '/caja/estado',
      bearer(legacyNoMembership.id, companyA.id),
    ).expect(403);
    expect(res.body.message).toMatch(/Sin Membership activa/);
  });

  it('CH-07 (caso 5): Membership SUSPENDED → 403 en las 8 rutas, nada persistido', async () => {
    await expectAllRoutesRejected(bearer(legacySuspended.id, companyA.id), 403);
  });

  it('CH-08 (caso 6): varias Memberships ACTIVE → 409 en las 8 rutas, nada persistido', async () => {
    await expectAllRoutesRejected(bearer(legacyMulti.id, companyA.id), 409);
  });

  it('CH-09 (caso 7): token de cliente → 403 en las 8 rutas; usuario sin User vinculado → 404', async () => {
    await expectAllRoutesRejected(bearer(legacyUserA.id, companyA.id, [PERM], 'cliente'), 403);
    await expectAllRoutesRejected(bearer(legacyUnlinked.id, companyA.id), 404);
  });

  it('CH-10: legajo PENDIENTE → 403 (ApprovedDossierGuard) en las 8 rutas, nada persistido', async () => {
    const auth = bearer(legacyUserA.id, companyA.id, [PERM], 'usuario', 'PENDIENTE');
    await expectAllRoutesRejected(auth, 403);
    const res = await call('get', '/caja/estado', auth).expect(403);
    expect(res.body.message).toMatch(/legajo/i);
  });

  // ------------------------------------------------------------------ authorization regression

  it('CH-11: sin caja.gastos → 403 en POST movimientos y POST cierre; las demás rutas siguen abiertas', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const before = await snapshotCash(companyA.id);
    await call('post', '/caja/movimientos', auth, { tipo: 'Gasto', monto: 10 }).expect(403);
    await call('post', '/caja/cierre', auth).expect(403);
    expect(await snapshotCash(companyA.id)).toBe(before);

    await call('get', '/caja/estado', auth).expect(200);
    await call('get', '/caja/movimientos', auth).expect(200);
  });

  // ------------------------------------------------------------------ cycle 1 on A (characterization)

  it('CH-12: sin apertura vigente → movimiento/arqueo/cierre 400 y listado vacío', async () => {
    const auth = bearer(legacyUserA.id, companyB.id);
    const before = await snapshotCash(companyA.id);

    const movement = await call('post', '/caja/movimientos', auth, {
      tipo: 'Gasto',
      monto: 10,
    }).expect(400);
    expect(movement.body.message).toMatch(/apertura de caja vigente/);
    await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: legacyUserA2.id,
      efectivoContado: 0,
    }).expect(400);
    await call('post', '/caja/cierre', auth).expect(400);
    const list = await call('get', '/caja/movimientos', auth).expect(200);
    expect(list.body).toEqual([]);

    expect(await snapshotCash(companyA.id)).toBe(before);
  });

  it('CH-13: apertura (sin permiso especial) → 201 sobre A; B no se toca; segunda apertura → 409', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const beforeB = await snapshotCash(companyB.id);

    const res = await call('post', '/caja/apertura', auth, { montoInicial: 1000 }).expect(201);
    expect(res.body.cajaId).toBe(cashA.id);
    expect(res.body.usuarioId).toBe(legacyUserA.id);
    expect(Number(res.body.montoInicial)).toBe(1000);
    expect(res.body.fechaCierre).toBeNull();

    const cash = await prisma.caja.findUniqueOrThrow({ where: { id: cashA.id } });
    expect(cash.estado).toBe('ABIERTA');
    expect(await snapshotCash(companyB.id)).toBe(beforeB);

    const again = await call('post', '/caja/apertura', auth, { montoInicial: 1 }).expect(409);
    expect(again.body.message).toBe('Ya hay una apertura de caja vigente para esta empresa');
    expect(await prisma.aperturaCaja.count({ where: { cajaId: cashA.id } })).toBe(1);

    const status = await call('get', '/caja/estado', auth).expect(200);
    expect(status.body.aperturaVigente.id).toBe(res.body.id);
  });

  it('CH-14: movimiento → 201 en A con caja.gastos (claim B); datos inválidos → 400; B no se toca', async () => {
    const auth = bearer(legacyUserA.id, companyB.id);
    const beforeB = await snapshotCash(companyB.id);

    await call('post', '/caja/movimientos', auth, { tipo: 'Otro', monto: 10 }).expect(400);
    await call('post', '/caja/movimientos', auth, { tipo: 'Gasto', monto: 0 }).expect(400);
    expect(await prisma.movimientoCaja.count({ where: { cajaId: cashA.id } })).toBe(0);

    const res = await call('post', '/caja/movimientos', auth, {
      tipo: 'Gasto',
      monto: 100,
      descripcion: 'S-V1-13',
    }).expect(201);
    expect(res.body.cajaId).toBe(cashA.id);
    expect(res.body.usuarioId).toBe(legacyUserA.id);
    expect(res.body.tipo).toBe('Gasto');
    expect(Number(res.body.monto)).toBe(100);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);

    const list = await call(
      'get',
      '/caja/movimientos',
      bearer(legacyUserA.id, companyA.id, []),
    ).expect(200);
    const ids = list.body.map((m: { id: string }) => m.id);
    expect(ids).toEqual([res.body.id]);
    expect(ids).not.toContain(movementB.id);
  });

  it('CH-15: cierre sin arqueo → 400', async () => {
    const res = await call('post', '/caja/cierre', bearer(legacyUserA.id, companyB.id)).expect(400);
    expect(res.body.message).toBe('No se puede cerrar la caja sin un arqueo previo del turno');
  });

  it('CH-16: arqueo con datos inválidos o usuario entrante ajeno/inexistente → fail closed, nada persistido', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const before = await snapshotCash(companyA.id);
    const beforeB = await snapshotCash(companyB.id);

    const same = await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: legacyUserA.id,
      efectivoContado: 900,
    }).expect(400);
    expect(same.body.message).toBe('El usuario entrante debe ser distinto del usuario saliente');

    const unknown = await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: randomUUID(),
      efectivoContado: 900,
    }).expect(404);
    expect(unknown.body.message).toBe('Usuario entrante no encontrado');

    // Usuario of Business B as incoming user of A → not visible from A
    const crossTenant = await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: legacyUserB2.id,
      efectivoContado: 900,
    }).expect(404);
    expect(crossTenant.body.message).toBe('Usuario entrante no encontrado');

    await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: legacyUserA2.id,
      efectivoContado: -1,
    }).expect(400);

    expect(await snapshotCash(companyA.id)).toBe(before);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  it('CH-17: arqueo válido (sin permiso especial) → 201 sin autorización requerida; caja EN_ARQUEO', async () => {
    const res = await call('post', '/caja/arqueo', bearer(legacyUserA.id, companyB.id, []), {
      usuarioEntranteId: legacyUserA2.id,
      efectivoContado: 900,
    }).expect(201);

    expect(res.body.requiereAutorizacion).toBe(false);
    expect(res.body.arqueo.cajaId).toBe(cashA.id);
    expect(res.body.arqueo.usuarioId).toBe(legacyUserA.id);
    expect(res.body.arqueo.usuarioEntranteId).toBe(legacyUserA2.id);
    expect(Number(res.body.arqueo.efectivoEsperado)).toBe(900); // 1000 opening − 100 expense
    expect(Number(res.body.arqueo.diferencia)).toBe(0);
    expect(res.body.arqueo.autorizacionId).toBeNull();

    const cash = await prisma.caja.findUniqueOrThrow({ where: { id: cashA.id } });
    expect(cash.estado).toBe('EN_ARQUEO');
  });

  it('CH-18: cierre con caja.gastos → 201; A queda CERRADA; B no se toca', async () => {
    const auth = bearer(legacyUserA.id, companyB.id);
    const beforeB = await snapshotCash(companyB.id);

    const res = await call('post', '/caja/cierre', auth).expect(201);
    expect(res.body.usuarioId).toBe(legacyUserA.id);
    expect(Number(res.body.montoFinal)).toBe(900);

    const opening = await prisma.aperturaCaja.findUniqueOrThrow({
      where: { id: res.body.aperturaCajaId },
    });
    expect(opening.cajaId).toBe(cashA.id);
    expect(opening.fechaCierre).not.toBeNull();
    const cash = await prisma.caja.findUniqueOrThrow({ where: { id: cashA.id } });
    expect(cash.estado).toBe('CERRADA');
    expect(await snapshotCash(companyB.id)).toBe(beforeB);

    await call('post', '/caja/cierre', auth).expect(400); // no open shift anymore
  });

  // ------------------------------------------------------------------ cycle 2 on A: authorization + isolation

  it('CH-19: arqueo con diferencia > 5000 requiere autorización y bloquea el cierre', async () => {
    const auth = bearer(legacyUserA.id, companyB.id);
    await call('post', '/caja/apertura', auth, { montoInicial: 1000 }).expect(201);

    const res = await call('post', '/caja/arqueo', auth, {
      usuarioEntranteId: legacyUserA2.id,
      efectivoContado: 10000,
    }).expect(201);
    expect(res.body.requiereAutorizacion).toBe(true);
    expect(Number(res.body.arqueo.diferencia)).toBe(9000);
    expect(res.body.arqueo.autorizacionId).toBeNull();
    cashCountA = { id: res.body.arqueo.id };

    const before = await snapshotCash(companyA.id);
    const closing = await call('post', '/caja/cierre', auth).expect(400);
    expect(closing.body.message).toMatch(/supera el umbral y no tiene autorización/);
    expect(await snapshotCash(companyA.id)).toBe(before);
  });

  it('CH-20: aislamiento de lectura — cada Business ve solo su Caja y sus movimientos (simetría)', async () => {
    const asA = await call('get', '/caja/estado', bearer(legacyUserA.id, companyB.id)).expect(200);
    const asB = await call('get', '/caja/estado', bearer(legacyUserB.id, companyA.id)).expect(200);
    expect(asA.body.caja.id).toBe(cashA.id);
    expect(asB.body.caja.id).toBe(cashB.id);
    expect(asB.body.aperturaVigente.id).toBe(openingB.id);

    const listA = await call(
      'get',
      '/caja/movimientos',
      bearer(legacyUserA.id, companyB.id),
    ).expect(200);
    const listB = await call(
      'get',
      '/caja/movimientos',
      bearer(legacyUserB.id, companyA.id),
    ).expect(200);
    expect(listA.body.map((m: { id: string }) => m.id)).not.toContain(movementB.id);
    expect(listB.body.map((m: { id: string }) => m.id)).toEqual([movementB.id]);
  });

  it('CH-21: aislamiento de mutación — A y B no se modifican entre sí (arqueo ajeno por id)', async () => {
    const beforeA = await snapshotCash(companyA.id);
    const beforeB = await snapshotCash(companyB.id);

    // A tries to authorize B's cash count (with valid credentials of A's authorizer)
    const aOnB = await call(
      'patch',
      `/caja/arqueo/${cashCountB.id}/autorizar`,
      bearer(legacyUserA.id, companyB.id, []),
      credentialsOf(authorizerA),
    ).expect(404);
    expect(aOnB.body.message).toBe('Arqueo no encontrado');

    // B tries to authorize A's cash count (with valid credentials of B's authorizer)
    const bOnA = await call(
      'patch',
      `/caja/arqueo/${cashCountA.id}/autorizar`,
      bearer(legacyUserB.id, companyA.id, []),
      credentialsOf(authorizerB),
    ).expect(404);
    expect(bOnA.body.message).toBe('Arqueo no encontrado');

    // A cannot register a cash count whose incoming user belongs to B (and vice-versa)
    await call('post', '/caja/arqueo', bearer(legacyUserA.id, companyB.id), {
      usuarioEntranteId: legacyUserB2.id,
      efectivoContado: 1,
    }).expect(404);
    await call('post', '/caja/arqueo', bearer(legacyUserB.id, companyA.id), {
      usuarioEntranteId: legacyUserA2.id,
      efectivoContado: 1,
    }).expect(404);

    expect(await snapshotCash(companyA.id)).toBe(beforeA);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
    const stillBlockedB = await prisma.arqueoCaja.findUniqueOrThrow({
      where: { id: cashCountB.id },
    });
    expect(stillBlockedB.autorizacionId).toBeNull();
  });

  it('CH-22: autorización de arqueo — credenciales inválidas, auto-autorización, sin permiso y de otra empresa → fail closed', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const before = await snapshotCash(companyA.id);
    const beforeB = await snapshotCash(companyB.id);
    const path = `/caja/arqueo/${cashCountA.id}/autorizar`;

    await call('patch', path, auth, { email: authorizerA.email, password: 'wrong' }).expect(401);
    const self = await call('patch', path, auth, credentialsOf(legacyUserA)).expect(403);
    expect(self.body.message).toMatch(/propia operación/);
    const noPerm = await call('patch', path, auth, credentialsOf(authorizerNoPerm)).expect(403);
    expect(noPerm.body.message).toMatch(/permiso requerido/);
    const otherCompany = await call('patch', path, auth, credentialsOf(authorizerB)).expect(403);
    expect(otherCompany.body.message).toBe('El autorizador debe pertenecer a la misma empresa.');

    expect(await snapshotCash(companyA.id)).toBe(before);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  it('CH-23: autorización de arqueo válida → 200, Autorizacion en A y vínculo con el arqueo; segunda vez → 400', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const beforeB = await snapshotCash(companyB.id);
    const path = `/caja/arqueo/${cashCountA.id}/autorizar`;

    const res = await call('patch', path, auth, {
      ...credentialsOf(authorizerA),
      motivo: 'S-V1-13 diferencia aprobada',
    }).expect(200);
    expect(res.body.id).toBe(cashCountA.id);
    expect(res.body.autorizacionId).toEqual(expect.any(String));

    const authorization = await prisma.autorizacion.findUniqueOrThrow({
      where: { id: res.body.autorizacionId },
    });
    expect(authorization.empresaId).toBe(companyA.id);
    expect(authorization.autorizadorId).toBe(authorizerA.id);
    expect(authorization.operacion).toBe(OPERATION);
    expect(authorization.entidadAfectada).toBe('ArqueoCaja');
    expect(authorization.entidadId).toBe(cashCountA.id);
    expect(authorization.motivo).toBe('S-V1-13 diferencia aprobada');
    expect(await snapshotCash(companyB.id)).toBe(beforeB);

    const again = await call('patch', path, auth, credentialsOf(authorizerA)).expect(400);
    expect(again.body.message).toBe('Este arqueo ya tiene una autorización registrada.');
  });

  it('CH-24: con el arqueo autorizado el cierre de A es 201; B sigue abierta y sin cambios', async () => {
    const beforeB = await snapshotCash(companyB.id);
    const res = await call('post', '/caja/cierre', bearer(legacyUserA.id, companyB.id)).expect(201);
    expect(Number(res.body.montoFinal)).toBe(10000);

    const cash = await prisma.caja.findUniqueOrThrow({ where: { id: cashA.id } });
    expect(cash.estado).toBe('CERRADA');
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  // ------------------------------------------------------------------ /autorizaciones

  it('CH-25: POST /autorizaciones — cualquier usuario autenticado solicita; se crea en el Business de la Membership', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const beforeB = await snapshotCash(companyB.id);

    const res = await call('post', '/autorizaciones', auth, {
      operacion: OPERATION,
      ...credentialsOf(authorizerA),
      entidadAfectada: 'ArqueoCaja',
      entidadId: cashCountA.id,
      motivo: 'S-V1-13 directa',
    }).expect(201);
    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.autorizadorId).toBe(authorizerA.id);
    expect(res.body.operacion).toBe(OPERATION);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  it('CH-26: POST /autorizaciones — validaciones y fail closed del autorizador, sin persistir', async () => {
    const auth = bearer(legacyUserA.id, companyB.id, []);
    const before = await snapshotCash(companyA.id);
    const beforeB = await snapshotCash(companyB.id);
    const body = (extra: object) => ({ operacion: OPERATION, ...extra });

    await call(
      'post',
      '/autorizaciones',
      auth,
      body({ email: 'no-es-mail', password: 'x' }),
    ).expect(400);
    await call('post', '/autorizaciones', auth, {
      operacion: 'otra.operacion',
      ...credentialsOf(authorizerA),
    }).expect(400);
    await call(
      'post',
      '/autorizaciones',
      auth,
      body({ email: authorizerA.email, password: 'wrong' }),
    ).expect(401);
    const self = await call(
      'post',
      '/autorizaciones',
      auth,
      body(credentialsOf(legacyUserA)),
    ).expect(403);
    expect(self.body.message).toMatch(/propia operación/);
    await call('post', '/autorizaciones', auth, body(credentialsOf(authorizerNoPerm))).expect(403);
    const other = await call(
      'post',
      '/autorizaciones',
      auth,
      body(credentialsOf(authorizerB)),
    ).expect(403);
    expect(other.body.message).toBe('El autorizador debe pertenecer a la misma empresa.');

    // Reverse direction: B requests with A's authorizer
    await call(
      'post',
      '/autorizaciones',
      bearer(legacyUserB.id, companyA.id, []),
      body(credentialsOf(authorizerA)),
    ).expect(403);

    expect(await snapshotCash(companyA.id)).toBe(before);
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  it('CH-27: POST /autorizaciones con Membership B y legacy empresaId A → el autorizador se valida contra B', async () => {
    const auth = bearer(legacyDivergent.id, companyA.id, []);
    const beforeA = await snapshotCash(companyA.id);

    // authorizerA belongs (legacy) to A, the canonical Business of the requester is B
    await call('post', '/autorizaciones', auth, {
      operacion: OPERATION,
      ...credentialsOf(authorizerA),
    }).expect(403);
    expect(await snapshotCash(companyA.id)).toBe(beforeA);

    const res = await call('post', '/autorizaciones', auth, {
      operacion: OPERATION,
      ...credentialsOf(authorizerB),
    }).expect(201);
    expect(res.body.empresaId).toBe(companyB.id);
    expect(res.body.autorizadorId).toBe(authorizerB.id);
    expect(await snapshotCash(companyA.id)).toBe(beforeA);
  });

  it('CH-28 (caracterización): entidadId de otro Business no se valida ni se muta — solo queda en la Autorizacion de A', async () => {
    const beforeB = await snapshotCash(companyB.id);
    const res = await call('post', '/autorizaciones', bearer(legacyUserA.id, companyB.id, []), {
      operacion: OPERATION,
      ...credentialsOf(authorizerA),
      entidadAfectada: 'ArqueoCaja',
      entidadId: cashCountB.id,
    }).expect(201);
    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.entidadId).toBe(cashCountB.id);

    const untouched = await prisma.arqueoCaja.findUniqueOrThrow({ where: { id: cashCountB.id } });
    expect(untouched.autorizacionId).toBeNull();
    expect(await snapshotCash(companyB.id)).toBe(beforeB);
  });

  // ------------------------------------------------------------------ reverse direction: B operates, A untouched

  it('CH-29: simetría — B (claim A) muta solo B: movimiento, autorización de arqueo y cierre; A no se toca', async () => {
    const auth = bearer(legacyUserB.id, companyA.id);
    const beforeA = await snapshotCash(companyA.id);

    const movement = await call('post', '/caja/movimientos', auth, {
      tipo: 'Retiro',
      monto: 50,
    }).expect(201);
    expect(movement.body.cajaId).toBe(cashB.id);
    expect(movement.body.usuarioId).toBe(legacyUserB.id);

    const blocked = await call('post', '/caja/cierre', auth).expect(400);
    expect(blocked.body.message).toMatch(/supera el umbral y no tiene autorización/);

    const authorized = await call(
      'patch',
      `/caja/arqueo/${cashCountB.id}/autorizar`,
      bearer(legacyUserB.id, companyA.id, []),
      credentialsOf(authorizerB),
    ).expect(200);
    expect(authorized.body.autorizacionId).toEqual(expect.any(String));
    const authorization = await prisma.autorizacion.findUniqueOrThrow({
      where: { id: authorized.body.autorizacionId },
    });
    expect(authorization.empresaId).toBe(companyB.id);

    const closing = await call('post', '/caja/cierre', auth).expect(201);
    expect(Number(closing.body.montoFinal)).toBe(12300);
    const cash = await prisma.caja.findUniqueOrThrow({ where: { id: cashB.id } });
    expect(cash.estado).toBe('CERRADA');

    expect(await snapshotCash(companyA.id)).toBe(beforeA);
  });
});
