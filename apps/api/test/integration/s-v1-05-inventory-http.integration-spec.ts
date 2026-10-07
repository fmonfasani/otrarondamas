import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-05 — HTTP boundary of INVENTORY against the REAL compiled stack
// (dist/src/main.js, the same production binary). It goes through the
// whole chain, no shortcuts:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → InventoryController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CompanyScopedPrismaService.forCompany()
//        → companyScopeExtension (+ B3 relation ownership) → response
//
// Why real HTTP and not a TestingModule: @nestjs/jwt v12 is pure ESM and
// does not load under jest CJS (same limit documented in
// s-v1-01-memberships-http.integration-spec.ts). The global guards, the
// ApprovedDossierGuard on this controller and the guard order can only be
// truly verified this way. Login, JWT, guards and test configs are not
// modified for this spec.
//
// The token is signed with the process JWT_SECRET, the same way AuthService
// issues it: the claims are LEGACY (with empresaId, without membershipId or
// businessId). The slice does not touch the JWT — the point of H02/H05/H10
// is that the legacy empresaId claim is NOT the tenant authority here.
describe('S-V1-05 — Inventario (HTTP, stack real)', () => {
  const PORT = '3396';
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
  let userA: { id: string };
  let userWithoutMemberships: { id: string };

  let productA: { id: string };
  let productB: { id: string };
  let batchA: { id: string };
  let batchB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['inventario.ajustes'],
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-05-inv-${userId}@example.test`,
      nombre: 'S V1-05 INV',
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
      data: { nombre: `S-V1-05 INV HTTP A ${suffix}`, slug: `s-v1-05-inventory-http-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-05 INV HTTP B ${suffix}`, slug: `s-v1-05-inventory-http-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-05 INV HTTP ${tag} ${suffix}`,
          email: `s-v1-05-inv-http-${tag}-${suffix}@example.test`,
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
          email: `s-v1-05-inv-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-05 INV HTTP ${tag}`,
          usuarioId: userId,
        },
        select: { id: true },
      });

    userA = await mkUser(legacyUserA.id, 'a');
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

    const mkHierarchy = async (companyId: string, tag: string) => {
      const family = await prisma.familia.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-05 INV HTTP Fam ${tag} ${suffix}`,
          prefijo: `IF${tag}`,
        },
        select: { id: true },
      });
      const subfamily = await prisma.subfamilia.create({
        data: {
          empresaId: companyId,
          familiaId: family.id,
          nombre: `S-V1-05 INV HTTP Sub ${tag} ${suffix}`,
          prefijo: `IS${tag}`,
        },
        select: { id: true },
      });
      const type = await prisma.tipo.create({
        data: {
          empresaId: companyId,
          subfamiliaId: subfamily.id,
          nombre: `S-V1-05 INV HTTP Tip ${tag} ${suffix}`,
          prefijo: `IT${tag}`,
        },
        select: { id: true },
      });
      const subtype = await prisma.subtipo.create({
        data: {
          empresaId: companyId,
          tipoId: type.id,
          nombre: `S-V1-05 INV HTTP Subt ${tag} ${suffix}`,
          prefijo: `IB${tag}`,
        },
        select: { id: true },
      });
      return { family, subfamily, type, subtype };
    };

    const hierA = await mkHierarchy(companyA.id, 'A');
    const hierB = await mkHierarchy(companyB.id, 'B');

    const mkProduct = (companyId: string, hier: typeof hierA, tag: string) =>
      prisma.producto.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-05 INV HTTP Prod ${tag} ${suffix}`,
          codigoInterno: `SV5IH${tag}-${suffix}`,
          familiaId: hier.family.id,
          subfamiliaId: hier.subfamily.id,
          tipoId: hier.type.id,
          subtipoId: hier.subtype.id,
          unidadBase: 'UNIDAD',
          costo: 1,
          precioMinorista: 2,
        },
        select: { id: true },
      });

    productA = await mkProduct(companyA.id, hierA, 'A');
    productB = await mkProduct(companyB.id, hierB, 'B');

    batchA = await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA.id,
        numeroLote: `SV5IHA-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 10,
      },
      select: { id: true },
    });
    batchB = await prisma.lote.create({
      data: {
        empresaId: companyB.id,
        productoId: productB.id,
        numeroLote: `SV5IHB-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: 7,
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
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `inv-http-${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV5I-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/inventario/stock').expect(401);
    await request(BASE).post('/inventario/ajustes').send({}).expect(401);
  });

  it('SV5I-H-02: JWT legacy con empresaId B + Membership A → prevalece A', async () => {
    const res = await request(BASE)
      .get('/inventario/stock')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((r: { productoId: string }) => r.productoId);
    expect(ids).toContain(productA.id);
    expect(ids).not.toContain(productB.id);

    const lots = await request(BASE)
      .get(`/inventario/productos/${productA.id}/lotes`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    expect(lots.body.map((l: { id: string }) => l.id)).toContain(batchA.id);
  });

  it('SV5I-H-03: lotes cross-tenant → 404 y el lote de B queda intacto', async () => {
    await request(BASE)
      .get(`/inventario/productos/${productB.id}/lotes`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(404);

    const row = await prisma.lote.findUniqueOrThrow({
      where: { id: batchB.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(row.empresaId).toBe(companyB.id);
    expect(Number(row.cantidad)).toBe(7);
  });

  it('SV5I-H-04: movimientos de A → 200, de B → 404', async () => {
    const res = await request(BASE)
      .get(`/inventario/productos/${productA.id}/movimientos`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);

    await request(BASE)
      .get(`/inventario/productos/${productB.id}/movimientos`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(404);
  });

  it('SV5I-H-05: ajuste con claim B + Membership A → 201 y persiste en A', async () => {
    const res = await request(BASE)
      .post('/inventario/ajustes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send({ loteId: batchA.id, cantidad: 5, motivo: 'S-V1-05 INV HTTP' })
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.empresaId).not.toBe(companyB.id);
    expect(res.body.loteId).toBe(batchA.id);

    const lote = await prisma.lote.findUniqueOrThrow({
      where: { id: batchA.id },
      select: { cantidad: true, empresaId: true },
    });
    expect(lote.empresaId).toBe(companyA.id);
    expect(Number(lote.cantidad)).toBe(15);

    const movements = await prisma.movimientoStock.findMany({
      where: { loteId: batchA.id, motivo: { contains: 'S-V1-05 INV HTTP' } },
      select: { empresaId: true, cantidad: true },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].empresaId).toBe(companyA.id);
    expect(Number(movements[0].cantidad)).toBe(5);
  });

  it('SV5I-H-06: POST sin permiso inventario.ajustes → 403 y no cambia el lote', async () => {
    const before = await prisma.lote.findUniqueOrThrow({
      where: { id: batchA.id },
      select: { cantidad: true },
    });

    await request(BASE)
      .post('/inventario/ajustes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id, [])}`)
      .send({ loteId: batchA.id, cantidad: 5, motivo: 'no debería entrar' })
      .expect(403);

    const after = await prisma.lote.findUniqueOrThrow({
      where: { id: batchA.id },
      select: { cantidad: true },
    });
    expect(Number(after.cantidad)).toBe(Number(before.cantidad));
  });

  it('SV5I-H-07: ajuste cross-tenant sobre lote de B → 404 y B no cambia', async () => {
    await request(BASE)
      .post('/inventario/ajustes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ loteId: batchB.id, cantidad: 5, motivo: 'cross-tenant' })
      .expect(404);

    const row = await prisma.lote.findUniqueOrThrow({
      where: { id: batchB.id },
      select: { cantidad: true },
    });
    expect(Number(row.cantidad)).toBe(7);
  });

  it('SV5I-H-08: sin Membership ACTIVE → 403 fail-closed', async () => {
    const memberships = await prisma.membership.findMany({
      where: { userId: userWithoutMemberships.id },
      select: { id: true },
    });
    expect(memberships).toEqual([]);

    await request(BASE)
      .get('/inventario/stock')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .get('/inventario/alertas')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .post('/inventario/ajustes')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .send({ loteId: batchA.id, cantidad: 5, motivo: 'sin membresía' })
      .expect(403);
  });

  it('SV5I-H-09: Membership SUSPENDED → 403 fail-closed', async () => {
    await request(BASE)
      .get('/inventario/stock')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .post('/inventario/ajustes')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .send({ loteId: batchA.id, cantidad: 5, motivo: 'suspendido' })
      .expect(403);
  });

  it('SV5I-H-10: alertas → 200 con stockBajo y lotesPorVencer', async () => {
    const res = await request(BASE)
      .get('/inventario/alertas')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    expect(res.body).toHaveProperty('stockBajo');
    expect(res.body).toHaveProperty('lotesPorVencer');
    // Alertas de A only: B's product is not part of this company's data.
    const lowIds = (res.body.stockBajo ?? []).map((r: { productoId: string }) => r.productoId);
    expect(lowIds).not.toContain(productB.id);
  });
});
