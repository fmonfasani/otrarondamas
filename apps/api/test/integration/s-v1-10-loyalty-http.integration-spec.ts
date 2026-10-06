import { createHmac, randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-10 — Loyalty / Fidelización: tenant boundary over real HTTP.
//
// Proves that LoyaltyController (GET/GET :id/POST/PATCH /reglas-fidelizacion)
// resolves the Business through BusinessContextService (ACTIVE Membership)
// and NOT through the legacy `empresaId` claim of the JWT:
//
//   token (legacy claim) → JwtAuthGuard → PermissionsGuard → ApprovedDossierGuard
//        → BusinessContextService (Membership ACTIVE → Business → Empresa)
//        → LoyaltyService (untouched) → companyScopeExtension
//
// Real HTTP instead of a TestingModule for the same reason documented in
// s-v1-04-catalog-http.integration-spec.ts (@nestjs/jwt v12 is ESM and does
// not load under jest CJS). It spawns dist/src/main.js, so `nest build` must
// have run first and JWT_SECRET / GOOGLE_* / DATABASE_URL must be set.
//
// Everything about the business behavior of the rules CHARACTERIZES the
// current code; it is not adopted as TO-BE (CT-01 and the TO-BE permission
// domain of `fidelizacion.gestionar` are still open).
describe('S-V1-10 — Loyalty (HTTP, stack real)', () => {
  const PORT = '3392';
  const BASE = `http://127.0.0.1:${PORT}`;
  const PERM = 'fidelizacion.gestionar';
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string };
  let legacyUserB: { id: string };
  let legacyNoMembership: { id: string };
  let legacySuspended: { id: string };
  let legacyUnlinked: { id: string };
  let legacyMulti: { id: string };
  let userIds: string[];

  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;
  let hierB: Awaited<ReturnType<typeof mkHierarchy>>;
  let ruleA1: { id: string };
  let ruleA2: { id: string };
  let ruleB1: { id: string };
  let ruleB2: { id: string };

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
      email: `s-v1-10-${userId}@example.test`,
      nombre: 'S V1-10',
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

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `S-V1-10 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-10 Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-10 Tip ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-10 Subt ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  const snapshotBusiness = async (companyId: string) =>
    JSON.stringify(
      await prisma.reglaFidelizacion.findMany({
        where: { empresaId: companyId },
        orderBy: { id: 'asc' },
      }),
    );

  const validBody = (nombre: string, extra: Record<string, unknown> = {}) => ({
    nombre,
    nivelRequerido: 'FRECUENTE',
    descuentoPorcentaje: 7,
    ...extra,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-10 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-10 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-10 ${tag} ${suffix}`,
          email: `s-v1-10-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyNoMembership = await mkLegacyUser(companyA.id, 'sinmemb');
    legacySuspended = await mkLegacyUser(companyA.id, 'susp');
    legacyUnlinked = await mkLegacyUser(companyA.id, 'sinuser'); // no canonical User
    legacyMulti = await mkLegacyUser(companyA.id, 'multi');

    const mkUser = (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-10-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-10 ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    const userNoMembership = await mkUser(legacyNoMembership.id, 'sinmemb');
    const userSuspended = await mkUser(legacySuspended.id, 'susp');
    const userMulti = await mkUser(legacyMulti.id, 'multi');
    userIds = [userA.id, userB.id, userNoMembership.id, userSuspended.id, userMulti.id];

    await prisma.membership.create({
      data: { userId: userA.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userB.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: {
        userId: userSuspended.id,
        businessId: companyA.id,
        role: 'OWNER',
        status: 'SUSPENDED',
      },
    });
    await prisma.membership.create({
      data: { userId: userMulti.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userMulti.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    // userNoMembership is deliberately left without a Membership; legacyUnlinked
    // has no canonical User at all.

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');

    ruleA1 = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-10 regla A1 ${suffix}`,
        nivelRequerido: 'VIP',
        descuentoPorcentaje: 10,
      },
      select: { id: true },
    });
    ruleA2 = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-10 regla A2 ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 5,
        familiaId: hierA.family.id,
        cantidadMinima: 2,
      },
      select: { id: true },
    });
    ruleB1 = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-10 regla B1 ${suffix}`,
        nivelRequerido: 'VIP',
        descuentoPorcentaje: 50,
      },
      select: { id: true },
    });
    ruleB2 = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-10 regla B2 ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 40,
        familiaId: hierB.family.id,
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
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  // ------------------------------------------------------------------ T4/T3 auth

  it('LH-01: sin token → 401 en las 4 rutas (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/reglas-fidelizacion').expect(401);
    await request(BASE).get(`/reglas-fidelizacion/${ruleA1.id}`).expect(401);
    await request(BASE).post('/reglas-fidelizacion').send(validBody('x')).expect(401);
    await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA1.id}`)
      .send({ nombre: 'x' })
      .expect(401);
  });

  // ------------------------------------------------------------------ T1.1 / T1.2 / T2.1

  it('LH-02: LIST con claim B + Membership A → solo reglas de A (el claim no es autoridad)', async () => {
    const res = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .expect(200);

    const ids = res.body.map((r: { id: string }) => r.id);
    expect(ids).toEqual(expect.arrayContaining([ruleA1.id, ruleA2.id]));
    expect(ids).not.toContain(ruleB1.id);
    expect(ids).not.toContain(ruleB2.id);
    expect(res.body.every((r: { empresaId: string }) => r.empresaId === companyA.id)).toBe(true);
  });

  it('LH-03: LIST — A con claim A ve A, B con claim B ve B, y B con claim A ve solo B (simetría)', async () => {
    const asA = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserA.id, companyA.id))
      .expect(200);
    const asB = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserB.id, companyB.id))
      .expect(200);
    const asBwithClaimA = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserB.id, companyA.id))
      .expect(200);

    const idsA = asA.body.map((r: { id: string }) => r.id);
    const idsB = asB.body.map((r: { id: string }) => r.id);
    expect(idsA).toEqual(expect.arrayContaining([ruleA1.id, ruleA2.id]));
    expect(idsA).not.toContain(ruleB1.id);
    expect(idsB).toEqual(expect.arrayContaining([ruleB1.id, ruleB2.id]));
    expect(idsB).not.toContain(ruleA1.id);
    expect(asBwithClaimA.body.map((r: { id: string }) => r.id).sort()).toEqual(idsB.sort());
  });

  // ------------------------------------------------------------------ T2.2 / T2.5

  it('LH-04: GET :id — regla propia → 200; regla del otro Business → 404 con ambos claims', async () => {
    const own = await request(BASE)
      .get(`/reglas-fidelizacion/${ruleA2.id}`)
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .expect(200);
    expect(own.body.id).toBe(ruleA2.id);
    expect(own.body.empresaId).toBe(companyA.id);
    expect(own.body.familia).toEqual({ nombre: `S-V1-10 Fam A ${suffix}` });

    for (const claim of [companyA.id, companyB.id]) {
      const res = await request(BASE)
        .get(`/reglas-fidelizacion/${ruleB1.id}`)
        .set('Authorization', bearer(legacyUserA.id, claim))
        .expect(404);
      expect(res.body.message).toBe('Regla de fidelización no encontrada');
    }
    const reverse = await request(BASE)
      .get(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', bearer(legacyUserB.id, companyA.id))
      .expect(404);
    expect(reverse.body.message).toBe('Regla de fidelización no encontrada');
  });

  // ------------------------------------------------------------------ T2.3

  it('LH-05: POST con claim B + Membership A → regla creada en A; un empresaId del body se descarta', async () => {
    const beforeB = await snapshotBusiness(companyB.id);
    const res = await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send(validBody(`S-V1-10 creada ${suffix}`, { empresaId: companyB.id }))
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    const persisted = await prisma.reglaFidelizacion.findUniqueOrThrow({
      where: { id: res.body.id },
    });
    expect(persisted.empresaId).toBe(companyA.id);
    expect(persisted.nombre).toBe(`S-V1-10 creada ${suffix}`);
    expect(persisted.nivelRequerido).toBe('FRECUENTE');
    expect(Number(persisted.descuentoPorcentaje)).toBe(7);
    expect(persisted.activo).toBe(true);
    expect(await snapshotBusiness(companyB.id)).toBe(beforeB);
  });

  it('LH-06: POST con jerarquía propia → 201 y el GET devuelve los nombres; con jerarquía de B → 404 y no persiste', async () => {
    const created = await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send(
        validBody(`S-V1-10 jerarquía A ${suffix}`, {
          familiaId: hierA.family.id,
          subfamiliaId: hierA.subfamily.id,
          tipoId: hierA.type.id,
          subtipoId: hierA.subtype.id,
          marca: 'MARCA-X',
          cantidadMinima: 3,
        }),
      )
      .expect(201);
    const got = await request(BASE)
      .get(`/reglas-fidelizacion/${created.body.id}`)
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .expect(200);
    expect(got.body.familia).toEqual({ nombre: `S-V1-10 Fam A ${suffix}` });
    expect(got.body.subfamilia).toEqual({ nombre: `S-V1-10 Sub A ${suffix}` });
    expect(got.body.tipo).toEqual({ nombre: `S-V1-10 Tip A ${suffix}` });
    expect(got.body.subtipo).toEqual({ nombre: `S-V1-10 Subt A ${suffix}` });

    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['familiaId', { familiaId: hierB.family.id }, 'Familia no encontrada'],
      ['subfamiliaId', { subfamiliaId: hierB.subfamily.id }, 'Subfamilia no encontrada'],
      ['tipoId', { tipoId: hierB.type.id }, 'Tipo no encontrado'],
      ['subtipoId', { subtipoId: hierB.subtype.id }, 'Subtipo no encontrado'],
    ];
    for (const [label, extra, message] of cases) {
      const nombre = `S-V1-10 cross ${label} ${suffix}`;
      const res = await request(BASE)
        .post('/reglas-fidelizacion')
        .set('Authorization', bearer(legacyUserA.id, companyB.id))
        .send(validBody(nombre, extra))
        .expect(404);
      expect(res.body.message).toBe(message);
      expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
    }
  });

  // ------------------------------------------------------------------ T2.4 / T2.6

  it('LH-07: PATCH — regla propia → 200; regla de B → 404 y B intacto (ambos claims); empresaId del body se descarta', async () => {
    const own = await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send({ nombre: `S-V1-10 regla A1 mod ${suffix}`, activo: false, empresaId: companyB.id })
      .expect(200);
    expect(own.body.nombre).toBe(`S-V1-10 regla A1 mod ${suffix}`);
    expect(own.body.activo).toBe(false);
    expect(own.body.empresaId).toBe(companyA.id);
    // restore for later tests
    await prisma.reglaFidelizacion.update({
      where: { id: ruleA1.id },
      data: { nombre: `S-V1-10 regla A1 ${suffix}`, activo: true },
    });

    const beforeB = await snapshotBusiness(companyB.id);
    for (const claim of [companyA.id, companyB.id]) {
      const res = await request(BASE)
        .patch(`/reglas-fidelizacion/${ruleB1.id}`)
        .set('Authorization', bearer(legacyUserA.id, claim))
        .send({ nombre: 'HACK', descuentoPorcentaje: 0, activo: false })
        .expect(404);
      expect(res.body.message).toBe('Regla de fidelización no encontrada');
    }
    expect(await snapshotBusiness(companyB.id)).toBe(beforeB);
  });

  it('LH-08: PATCH con jerarquía de B sobre una regla propia → 404 y la regla no cambia', async () => {
    const before = JSON.stringify(
      await prisma.reglaFidelizacion.findUniqueOrThrow({ where: { id: ruleA2.id } }),
    );
    const res = await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA2.id}`)
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send({ subtipoId: hierB.subtype.id, nombre: 'HACK' })
      .expect(404);
    expect(res.body.message).toBe('Subtipo no encontrado');
    const after = JSON.stringify(
      await prisma.reglaFidelizacion.findUniqueOrThrow({ where: { id: ruleA2.id } }),
    );
    expect(after).toBe(before);
  });

  it('LH-09: simetría B→A — un miembro de B no lee ni muta reglas de A', async () => {
    const beforeA = await snapshotBusiness(companyA.id);
    const auth = bearer(legacyUserB.id, companyA.id);
    await request(BASE)
      .get(`/reglas-fidelizacion/${ruleA2.id}`)
      .set('Authorization', auth)
      .expect(404);
    await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA2.id}`)
      .set('Authorization', auth)
      .send({ nombre: 'HACK' })
      .expect(404);
    const created = await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody(`S-V1-10 creada por B ${suffix}`))
      .expect(201);
    expect(created.body.empresaId).toBe(companyB.id);
    expect(await snapshotBusiness(companyA.id)).toBe(beforeA);
  });

  // ------------------------------------------------------------------ T1.3 / T1.4 / T1.5

  it('LH-10: sin Membership ACTIVE (ninguna o SUSPENDED) → 403 fail-closed en las 4 rutas y no persiste', async () => {
    for (const legacy of [legacyNoMembership, legacySuspended]) {
      const auth = bearer(legacy.id, companyA.id); // claim A: aun así no hay contexto
      await request(BASE).get('/reglas-fidelizacion').set('Authorization', auth).expect(403);
      await request(BASE)
        .get(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .expect(403);
      await request(BASE)
        .patch(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .send({ nombre: 'HACK' })
        .expect(403);
      const nombre = `S-V1-10 sin membership ${legacy.id}`;
      await request(BASE)
        .post('/reglas-fidelizacion')
        .set('Authorization', auth)
        .send(validBody(nombre))
        .expect(403);
      expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
    }
    const untouched = await prisma.reglaFidelizacion.findUniqueOrThrow({
      where: { id: ruleA1.id },
    });
    expect(untouched.nombre).toBe(`S-V1-10 regla A1 ${suffix}`);
  });

  it('LH-11: Usuario legacy sin User canónico vinculado → 404 (comportamiento canónico de BusinessContextService)', async () => {
    const auth = bearer(legacyUnlinked.id, companyA.id);
    const res = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', auth)
      .expect(404);
    expect(res.body.message).toBe('Identidad sin User vinculado: backfill pendiente');
    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody(`S-V1-10 sin user ${suffix}`))
      .expect(404);
    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: `S-V1-10 sin user ${suffix}` } }),
    ).toBe(0);
  });

  it('LH-12: múltiples Memberships ACTIVE → 409 en las 4 rutas (sin elección arbitraria de Business)', async () => {
    const auth = bearer(legacyMulti.id, companyA.id);
    const res = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', auth)
      .expect(409);
    expect(res.body.message).toContain('Múltiples Memberships activas');
    await request(BASE)
      .get(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', auth)
      .expect(409);
    await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', auth)
      .send({ nombre: 'HACK' })
      .expect(409);
    const nombre = `S-V1-10 multi ${suffix}`;
    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody(nombre))
      .expect(409);
    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('LH-13: token type=cliente → 403 en las 4 rutas, con y sin permisos forjados', async () => {
    for (const permissions of [[PERM], []]) {
      const auth = bearer(legacyUserA.id, companyA.id, permissions, 'cliente');
      await request(BASE).get('/reglas-fidelizacion').set('Authorization', auth).expect(403);
      await request(BASE)
        .get(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .expect(403);
      await request(BASE)
        .post('/reglas-fidelizacion')
        .set('Authorization', auth)
        .send(validBody(`S-V1-10 cliente ${suffix}`))
        .expect(403);
      await request(BASE)
        .patch(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .send({ nombre: 'HACK' })
        .expect(403);
    }
    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: `S-V1-10 cliente ${suffix}` } }),
    ).toBe(0);
  });

  // ------------------------------------------------------------------ T3

  it('LH-14: sin fidelizacion.gestionar → 403 en las 4 rutas (incluidos los GET) aunque la Membership sea válida', async () => {
    for (const permissions of [[], ['ventas.crear', 'clientes.gestionar']]) {
      const auth = bearer(legacyUserA.id, companyA.id, permissions);
      await request(BASE).get('/reglas-fidelizacion').set('Authorization', auth).expect(403);
      await request(BASE)
        .get(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .expect(403);
      await request(BASE)
        .post('/reglas-fidelizacion')
        .set('Authorization', auth)
        .send(validBody(`S-V1-10 sin permiso ${suffix}`))
        .expect(403);
      await request(BASE)
        .patch(`/reglas-fidelizacion/${ruleA1.id}`)
        .set('Authorization', auth)
        .send({ nombre: 'HACK' })
        .expect(403);
    }
    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: `S-V1-10 sin permiso ${suffix}` } }),
    ).toBe(0);
  });

  it('LH-15: ApprovedDossierGuard preservado — estadoLegajo PENDIENTE → 403 aun con permiso y Membership', async () => {
    const auth = bearer(legacyUserA.id, companyA.id, [PERM], 'usuario', 'PENDIENTE');
    await request(BASE).get('/reglas-fidelizacion').set('Authorization', auth).expect(403);
    await request(BASE)
      .get(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', auth)
      .expect(403);
    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody(`S-V1-10 pendiente ${suffix}`))
      .expect(403);
    await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', auth)
      .send({ nombre: 'HACK' })
      .expect(403);
    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: `S-V1-10 pendiente ${suffix}` } }),
    ).toBe(0);
  });

  // ------------------------------------------------------------------ T4 contract

  it('LH-16: contrato — forma de la respuesta, orden por createdAt desc y validación de DTO (400)', async () => {
    const auth = bearer(legacyUserA.id, companyA.id);
    const list = await request(BASE)
      .get('/reglas-fidelizacion')
      .set('Authorization', auth)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    const sample = list.body.find((r: { id: string }) => r.id === ruleA2.id);
    expect(Object.keys(sample).sort()).toEqual(
      [
        'activo',
        'cantidadMinima',
        'createdAt',
        'descuentoPorcentaje',
        'empresaId',
        'familia',
        'familiaId',
        'id',
        'marca',
        'nivelRequerido',
        'nombre',
        'subfamilia',
        'subfamiliaId',
        'subtipo',
        'subtipoId',
        'tipo',
        'tipoId',
        'updatedAt',
      ].sort(),
    );
    expect(sample.descuentoPorcentaje).toBe('5');
    expect(sample.subfamilia).toBeNull();
    // createdAt desc: ruleA2 was created after ruleA1 in beforeAll.
    const order = list.body.map((r: { id: string }) => r.id);
    expect(order.indexOf(ruleA2.id)).toBeLessThan(order.indexOf(ruleA1.id));

    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody('x', { descuentoPorcentaje: 101 }))
      .expect(400);
    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send(validBody('x', { nivelRequerido: 'DIAMANTE' }))
      .expect(400);
    await request(BASE)
      .post('/reglas-fidelizacion')
      .set('Authorization', auth)
      .send({ nivelRequerido: 'VIP', descuentoPorcentaje: 1 })
      .expect(400);
    await request(BASE)
      .patch(`/reglas-fidelizacion/${ruleA1.id}`)
      .set('Authorization', auth)
      .send({ descuentoPorcentaje: -1 })
      .expect(400);
    await request(BASE)
      .get(`/reglas-fidelizacion/${randomUUID()}`)
      .set('Authorization', auth)
      .expect(404);
  });
});
