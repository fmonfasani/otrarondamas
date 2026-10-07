import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-04 — HTTP boundary of CATALOG against the REAL compiled stack
// (dist/src/main.js, the same production binary). It goes through the
// whole chain, no shortcuts:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → CatalogController / CatalogHierarchyController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CompanyScopedPrismaService.forCompany()
//        → companyScopeExtension (+ B3 relation ownership) → response
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
describe('S-V1-04 — Catálogo (HTTP, stack real)', () => {
  const PORT = '3397';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string };
  let legacyUserB: { id: string };
  let legacyUserWithoutMemberships: { id: string };
  let userWithoutMemberships: { id: string };
  let legacySuspendedUser: { id: string };

  let familyA: { id: string };
  let subfamilyA: { id: string };
  let typeA: { id: string };
  let subtypeA: { id: string };
  let familyB: { id: string };
  let subfamilyB: { id: string };
  let typeB: { id: string };
  let subtypeB: { id: string };

  let productA: { id: string };
  let productB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['productos.gestionar'],
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-04-${userId}@example.test`,
      nombre: 'S V1-04',
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

  const dtoOfA = (tag: string) => ({
    nombre: `S-V1-04 HTTP Prod A ${tag}`,
    codigoInterno: `SV4HA${tag}`,
    familiaId: familyA.id,
    subfamiliaId: subfamilyA.id,
    tipoId: typeA.id,
    subtipoId: subtypeA.id,
    unidadBase: 'UNIDAD',
    costo: 1,
    precioMinorista: 2,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-04 HTTP A ${suffix}`, slug: `s-v1-04-catalog-http-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-04 HTTP B ${suffix}`, slug: `s-v1-04-catalog-http-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkHierarchy = async (companyId: string, tag: string) => {
      const family = await prisma.familia.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-04 HTTP Fam ${tag} ${suffix}`,
          prefijo: `F${tag}`,
        },
        select: { id: true },
      });
      const subfamily = await prisma.subfamilia.create({
        data: {
          empresaId: companyId,
          familiaId: family.id,
          nombre: `S-V1-04 HTTP Sub ${tag} ${suffix}`,
          prefijo: `S${tag}`,
        },
        select: { id: true },
      });
      const type = await prisma.tipo.create({
        data: {
          empresaId: companyId,
          subfamiliaId: subfamily.id,
          nombre: `S-V1-04 HTTP Tip ${tag} ${suffix}`,
          prefijo: `T${tag}`,
        },
        select: { id: true },
      });
      const subtype = await prisma.subtipo.create({
        data: {
          empresaId: companyId,
          tipoId: type.id,
          nombre: `S-V1-04 HTTP Subt ${tag} ${suffix}`,
          prefijo: `B${tag}`,
        },
        select: { id: true },
      });
      return { familia: family, subfamilia: subfamily, tipo: type, subtipo: subtype };
    };

    const hierA = await mkHierarchy(companyA.id, 'A');
    familyA = hierA.familia;
    subfamilyA = hierA.subfamilia;
    typeA = hierA.tipo;
    subtypeA = hierA.subtipo;

    const hierB = await mkHierarchy(companyB.id, 'B');
    familyB = hierB.familia;
    subfamilyB = hierB.subfamilia;
    typeB = hierB.tipo;
    subtypeB = hierB.subtipo;

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-04 HTTP ${tag} ${suffix}`,
          email: `s-v1-04-http-${tag}-${suffix}@example.test`,
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
          email: `s-v1-04-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-04 HTTP ${tag}`,
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

    productA = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-04 HTTP Prod A ${suffix}`,
        codigoInterno: `SV4HA-BASE-${suffix}`,
        familiaId: familyA.id,
        subfamiliaId: subfamilyA.id,
        tipoId: typeA.id,
        subtipoId: subtypeA.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
      },
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-04 HTTP Prod B ${suffix}`,
        codigoInterno: `SV4HB-BASE-${suffix}`,
        familiaId: familyB.id,
        subfamiliaId: subfamilyB.id,
        tipoId: typeB.id,
        subtipoId: subtypeB.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
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
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV4-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/catalogo/productos').expect(401);
  });

  it('SV4-H-02 (T1): listado de A → 200 solo con productos de A', async () => {
    const res = await request(BASE)
      .get('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(200);
    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(productA.id);
    expect(ids).not.toContain(productB.id);
    expect(res.body.every((p: { empresaId: string }) => p.empresaId === companyA.id)).toBe(true);
  });

  it('SV4-H-03 (T2): producto de B por id desde A → 404, sin fuga', async () => {
    await request(BASE)
      .get(`/catalogo/productos/${productB.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(404);
    await request(BASE)
      .get(`/catalogo/productos/${productA.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(404);
  });

  it('SV4-H-04 (T3): jerarquía de A → 200 solo con los 4 niveles de A', async () => {
    const res = await request(BASE)
      .get('/catalogo/jerarquia')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(200);

    expect(res.body.familias.map((f: { id: string }) => f.id)).toContain(familyA.id);
    expect(res.body.familias.some((f: { id: string }) => f.id === familyB.id)).toBe(false);
    expect(res.body.subfamilias.map((s: { id: string }) => s.id)).toContain(subfamilyA.id);
    expect(res.body.subfamilias.some((s: { id: string }) => s.id === subfamilyB.id)).toBe(false);
    expect(res.body.tipos.map((t: { id: string }) => t.id)).toContain(typeA.id);
    expect(res.body.tipos.some((t: { id: string }) => t.id === typeB.id)).toBe(false);
    expect(res.body.subtipos.map((s: { id: string }) => s.id)).toContain(subtypeA.id);
    expect(res.body.subtipos.some((s: { id: string }) => s.id === subtypeB.id)).toBe(false);
    expect(
      [
        ...res.body.familias,
        ...res.body.subfamilias,
        ...res.body.tipos,
        ...res.body.subtipos,
      ].every((n: { empresaId: string }) => n.empresaId === companyA.id),
    ).toBe(true);
  });

  it('SV4-H-05 (T4): crear producto en A → 201 y persiste en A', async () => {
    const res = await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send(dtoOfA(`H05-${suffix}`))
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('SV4-H-06 (T5): empresaId arbitrario en el body no cambia el tenant', async () => {
    const res = await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ ...dtoOfA(`H06-${suffix}`), empresaId: companyB.id })
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('SV4-H-07 (T6): Producto A + Familia B → 404 y no persiste', async () => {
    const code = `SV4HAH07-${suffix}`;
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ ...dtoOfA(`H07-${suffix}`), codigoInterno: code, familiaId: familyB.id })
      .expect(404);
    expect(await prisma.producto.findFirst({ where: { codigoInterno: code } })).toBeNull();
  });

  it('SV4-H-08 (T7): Producto A + Subfamilia B → 404 y no persiste', async () => {
    const code = `SV4HAH08-${suffix}`;
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ ...dtoOfA(`H08-${suffix}`), codigoInterno: code, subfamiliaId: subfamilyB.id })
      .expect(404);
    expect(await prisma.producto.findFirst({ where: { codigoInterno: code } })).toBeNull();
  });

  it('SV4-H-09 (T8): Producto A + Tipo B → 404 y no persiste', async () => {
    const code = `SV4HAH09-${suffix}`;
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ ...dtoOfA(`H09-${suffix}`), codigoInterno: code, tipoId: typeB.id })
      .expect(404);
    expect(await prisma.producto.findFirst({ where: { codigoInterno: code } })).toBeNull();
  });

  it('SV4-H-10 (T9): Producto A + Subtipo B → 404 y no persiste', async () => {
    const code = `SV4HAH10-${suffix}`;
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ ...dtoOfA(`H10-${suffix}`), codigoInterno: code, subtipoId: subtypeB.id })
      .expect(404);
    expect(await prisma.producto.findFirst({ where: { codigoInterno: code } })).toBeNull();
  });

  it('SV4-H-11 (T9b): jerarquía coherente de B → rechazado por B3 ownership', async () => {
    const code = `SV4HCO-${suffix}`;
    const res = await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({
        nombre: `S-V1-04 HTTP Prod B-coherente ${suffix}`,
        codigoInterno: code,
        familiaId: familyB.id,
        subfamiliaId: subfamilyB.id,
        tipoId: typeB.id,
        subtipoId: subtypeB.id,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 2,
      });
    // validateHierarchy passes (B's chain is coherent with itself); the one
    // that rejects is B3 relation ownership with P2025. There is no global
    // Prisma filter in main.ts, so today that arrives as a 500: the invariant
    // that matters is that it does NOT persist and does NOT return the resource.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body?.id).toBeUndefined();
    expect(await prisma.producto.findFirst({ where: { codigoInterno: code } })).toBeNull();
  });

  it('SV4-H-12 (T11): PATCH cross-tenant → 404 y B no se modifica', async () => {
    await request(BASE)
      .patch(`/catalogo/productos/${productB.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ nombre: `S-V1-04 HTTP Hackeado ${suffix}` })
      .expect(404);

    const rowB = await prisma.producto.findUniqueOrThrow({
      where: { id: productB.id },
      select: { nombre: true },
    });
    expect(rowB.nombre).toBe(`S-V1-04 HTTP Prod B ${suffix}`);
  });

  it('SV4-H-13 (T12): Membership B operando sobre recurso de A → aislado', async () => {
    const res = await request(BASE)
      .get('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(productB.id);
    expect(ids).not.toContain(productA.id);

    const tree = await request(BASE)
      .get('/catalogo/jerarquia')
      .set('Authorization', `Bearer ${tokenFor(legacyUserB.id, companyB.id)}`)
      .expect(200);
    expect(tree.body.familias.some((f: { id: string }) => f.id === familyA.id)).toBe(false);
    expect(tree.body.familias.some((f: { id: string }) => f.id === familyB.id)).toBe(true);
  });

  it('SV4-H-14 (T13): sin Membership ACTIVE → 403 fail-closed', async () => {
    // The fixture is an existing canonical User with NO Membership at all:
    // the 403 comes from context resolution, not from an unknown
    // identity.
    const memberships = await prisma.membership.findMany({
      where: { userId: userWithoutMemberships.id },
      select: { id: true },
    });
    expect(memberships).toEqual([]);

    await request(BASE)
      .get('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .get('/catalogo/jerarquia')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .send(dtoOfA(`H14-${suffix}`))
      .expect(403);
  });

  it('SV4-H-15 (T14): Membership SUSPENDED → 403 fail-closed', async () => {
    await request(BASE)
      .get('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .get('/catalogo/jerarquia')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .expect(403);
  });

  it('SV4-H-16 (T15): JWT legacy con empresaId B + Membership A → prevalece A', async () => {
    const res = await request(BASE)
      .get('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(productA.id);
    expect(ids).not.toContain(productB.id);

    const tree = await request(BASE)
      .get('/catalogo/jerarquia')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    expect(tree.body.familias.some((f: { id: string }) => f.id === familyA.id)).toBe(true);
    expect(tree.body.familias.some((f: { id: string }) => f.id === familyB.id)).toBe(false);

    const created = await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send(dtoOfA(`H16-${suffix}`))
      .expect(201);
    const row = await prisma.producto.findUniqueOrThrow({
      where: { id: created.body.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('SV4-H-17: POST sin permisos → 403 (PermissionsGuard legacy intacto)', async () => {
    await request(BASE)
      .post('/catalogo/productos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id, [])}`)
      .send(dtoOfA(`H17-${suffix}`))
      .expect(403);
    expect(
      await prisma.producto.findFirst({ where: { codigoInterno: `SV4HAH17-${suffix}` } }),
    ).toBeNull();
  });
});
