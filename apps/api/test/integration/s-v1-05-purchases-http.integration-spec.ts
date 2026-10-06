import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-05 — HTTP boundary of PURCHASES against the REAL compiled stack
// (dist/src/main.js, the same production binary). Same chain as
// s-v1-05-inventory-http.integration-spec.ts, for the other surface of the
// slice:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → PurchasesController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CompanyScopedPrismaService.forCompany()
//        → companyScopeExtension → response
//
// Real HTTP instead of a TestingModule for the same reason documented in
// s-v1-04-catalog-http.integration-spec.ts (@nestjs/jwt v12 is ESM and does
// not load under jest CJS): the global guards and the
// JwtAuthGuard → PermissionsGuard → ApprovedDossierGuard order can only be
// verified against the compiled binary.
//
// The claims are LEGACY (empresaId travels in the token). H02/H03/H05 prove
// that this claim is NOT the tenant authority for this surface.
describe('S-V1-05 — Compras (HTTP, stack real)', () => {
  const PORT = '3395';
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
  let supplierA: { id: string };
  let supplierB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['compras.gestionar'],
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-05-pur-${userId}@example.test`,
      nombre: 'S V1-05 PUR',
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

  const purchaseDto = (supplierId: string, productId: string) => ({
    proveedorId: supplierId,
    items: [{ productoId: productId, cantidadPedida: 2, costoUnitario: 10 }],
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-05 PUR HTTP A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-05 PUR HTTP B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-05 PUR HTTP ${tag} ${suffix}`,
          email: `s-v1-05-pur-http-${tag}-${suffix}@example.test`,
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
          email: `s-v1-05-pur-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-05 PUR HTTP ${tag}`,
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
          nombre: `S-V1-05 PUR HTTP Fam ${tag} ${suffix}`,
          prefijo: `PF${tag}`,
        },
        select: { id: true },
      });
      const subfamily = await prisma.subfamilia.create({
        data: {
          empresaId: companyId,
          familiaId: family.id,
          nombre: `S-V1-05 PUR HTTP Sub ${tag} ${suffix}`,
          prefijo: `PS${tag}`,
        },
        select: { id: true },
      });
      const type = await prisma.tipo.create({
        data: {
          empresaId: companyId,
          subfamiliaId: subfamily.id,
          nombre: `S-V1-05 PUR HTTP Tip ${tag} ${suffix}`,
          prefijo: `PT${tag}`,
        },
        select: { id: true },
      });
      const subtype = await prisma.subtipo.create({
        data: {
          empresaId: companyId,
          tipoId: type.id,
          nombre: `S-V1-05 PUR HTTP Subt ${tag} ${suffix}`,
          prefijo: `PB${tag}`,
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
          nombre: `S-V1-05 PUR HTTP Prod ${tag} ${suffix}`,
          codigoInterno: `SV5PH${tag}-${suffix}`,
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

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `S-V1-05 PUR HTTP Prov A ${suffix}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `S-V1-05 PUR HTTP Prov B ${suffix}` },
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
    await prisma.compraItem.deleteMany({
      where: { productoId: { in: [productA.id, productB.id] } },
    });
    await prisma.compra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.proveedor.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { email: { contains: `pur-http-${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('SV5P-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/proveedores').expect(401);
    await request(BASE).post('/compras').send({}).expect(401);
  });

  it('SV5P-H-02: JWT legacy con empresaId B + Membership A → prevalece A', async () => {
    const res = await request(BASE)
      .get('/proveedores')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    const ids = res.body.map((s: { id: string }) => s.id);
    expect(ids).toContain(supplierA.id);
    expect(ids).not.toContain(supplierB.id);
    expect(res.body.every((s: { empresaId: string }) => s.empresaId === companyA.id)).toBe(true);
  });

  it('SV5P-H-03: crear proveedor con claim B + Membership A → 201 y persiste en A', async () => {
    const res = await request(BASE)
      .post('/proveedores')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send({ nombre: `S-V1-05 PUR HTTP New ${suffix}` })
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.empresaId).not.toBe(companyB.id);
    const row = await prisma.proveedor.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true },
    });
    expect(row.empresaId).toBe(companyA.id);
  });

  it('SV5P-H-04: crear proveedor sin permiso compras.gestionar → 403 y no persiste', async () => {
    const nombre = `S-V1-05 PUR HTTP Denied ${suffix}`;
    await request(BASE)
      .post('/proveedores')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id, [])}`)
      .send({ nombre })
      .expect(403);
    expect(await prisma.proveedor.findFirst({ where: { nombre } })).toBeNull();
  });

  it('SV5P-H-05: crear compra con claim B + Membership A → 201 BORRADOR en A', async () => {
    const res = await request(BASE)
      .post('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send(purchaseDto(supplierA.id, productA.id))
      .expect(201);

    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.estado).toBe('BORRADOR');
    expect(Number(res.body.total)).toBe(20);

    const row = await prisma.compra.findUniqueOrThrow({
      where: { id: res.body.id },
      select: { empresaId: true, usuarioId: true, items: { select: { productoId: true } } },
    });
    expect(row.empresaId).toBe(companyA.id);
    // Compra.usuarioId is a legacy Usuario id (the JWT `sub`), not the
    // canonical User id of the Membership.
    expect(row.usuarioId).toBe(legacyUserA.id);
    expect(row.items.map((i) => i.productoId)).toEqual([productA.id]);
  });

  it('SV5P-H-06: compra con proveedor cross-tenant → 404 y nada persiste', async () => {
    const before = await prisma.compra.count({ where: { empresaId: companyA.id } });
    await request(BASE)
      .post('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send(purchaseDto(supplierB.id, productA.id))
      .expect(404);
    const after = await prisma.compra.count({ where: { empresaId: companyA.id } });
    expect(after).toBe(before);
  });

  it('SV5P-H-07: compra con producto cross-tenant → 404 y nada persiste', async () => {
    const before = await prisma.compra.count({ where: { empresaId: companyA.id } });
    await request(BASE)
      .post('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send(purchaseDto(supplierA.id, productB.id))
      .expect(404);
    const after = await prisma.compra.count({ where: { empresaId: companyA.id } });
    expect(after).toBe(before);
  });

  it('SV5P-H-08: sin Membership ACTIVE o SUSPENDED → 403 fail-closed', async () => {
    const memberships = await prisma.membership.findMany({
      where: { userId: userWithoutMemberships.id },
      select: { id: true },
    });
    expect(memberships).toEqual([]);

    await request(BASE)
      .get('/proveedores')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .post('/proveedores')
      .set('Authorization', `Bearer ${tokenFor(legacyUserWithoutMemberships.id, companyA.id)}`)
      .send({ nombre: `S-V1-05 PUR HTTP NoMemb ${suffix}` })
      .expect(403);

    await request(BASE)
      .get('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .expect(403);
    await request(BASE)
      .post('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacySuspendedUser.id, companyA.id)}`)
      .send(purchaseDto(supplierA.id, productA.id))
      .expect(403);
  });

  it('SV5P-H-09: listado de compras → 200 y solo las de A', async () => {
    const res = await request(BASE)
      .get('/compras')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((c: { empresaId: string }) => c.empresaId === companyA.id)).toBe(true);
    expect(res.body.some((c: { empresaId: string }) => c.empresaId === companyB.id)).toBe(false);
  });
});
