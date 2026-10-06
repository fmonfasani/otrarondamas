import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-06 — HTTP boundary of ORDERS against the REAL compiled stack
// (dist/src/main.js, the same production binary). Same chain as
// s-v1-05-*-http.integration-spec.ts:
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → OrdersController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CompanyScopedPrismaService.forCompany()
//        → companyScopeExtension → response
//
// Real HTTP instead of a TestingModule for the same reason documented in
// s-v1-04-catalog-http.integration-spec.ts (@nestjs/jwt v12 is ESM and does
// not load under jest CJS).
//
// The claims are LEGACY (empresaId travels in the token). The tests prove
// that this claim is NOT the tenant authority for this surface. The
// confirm/cancel/rollback cases CHARACTERIZE the current behavior (ORD-006-02);
// they do not adopt it as TO-BE.
describe('S-V1-06 — Pedidos (HTTP, stack real)', () => {
  const PORT = '3394';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;
  let counter = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string };
  let legacyUserB: { id: string };
  let legacyUserWithoutMemberships: { id: string };
  let legacySuspendedUser: { id: string };
  let userIds: string[];

  let customerA: { id: string };
  let customerB: { id: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;
  let hierB: Awaited<ReturnType<typeof mkHierarchy>>;

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['pedidos.gestionar'],
    type: 'usuario' | 'cliente' = 'usuario',
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-06-ord-${userId}@example.test`,
      nombre: 'S V1-06 ORD',
      // Legacy claim: it still travels in the token and is NOT used as the
      // tenant authority for this surface.
      empresaId: tokenCompanyId,
      permisos: permissions,
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type,
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

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-06 ORD Fam ${tag} ${suffix}`,
        prefijo: `F${tag}`,
      },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-06 ORD Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-06 ORD Tip ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-06 ORD Subt ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  // A fresh product per scenario keeps per-batch assertions deterministic
  // (FIFO deduction spans every batch of the same product).
  const mkProduct = async (companyId: string, hier: Awaited<ReturnType<typeof mkHierarchy>>) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-06 ORD Prod ${counter} ${suffix}`,
        codigoInterno: `SV6H-${counter}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
  };

  const mkBatch = async (companyId: string, productId: string, quantity: number) => {
    counter += 1;
    return prisma.lote.create({
      data: {
        empresaId: companyId,
        productoId: productId,
        numeroLote: `S6H-LOTE-${counter}-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: quantity,
      },
      select: { id: true },
    });
  };

  const mkOrder = (
    companyId: string,
    customerId: string,
    items: { productId: string; quantity: number }[],
    status: 'RECIBIDO' | 'CONFIRMADO' | 'CANCELADO' = 'RECIBIDO',
  ) =>
    prisma.pedido.create({
      data: {
        empresaId: companyId,
        clienteId: customerId,
        estado: status,
        canalOrigen: 'web',
        total: 10,
        pedidoItems: {
          create: items.map((i) => ({
            productoId: i.productId,
            cantidad: i.quantity,
            precioUnitario: 10,
          })),
        },
      },
      select: { id: true },
    });

  const batchQuantity = async (batchId: string) =>
    Number((await prisma.lote.findUniqueOrThrow({ where: { id: batchId } })).cantidad);

  const movementCount = (orderId: string) =>
    prisma.movimientoStock.count({ where: { referenciaId: orderId } });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-06 ORD HTTP A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-06 ORD HTTP B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-06 ORD HTTP ${tag} ${suffix}`,
          email: `s-v1-06-ord-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyUserWithoutMemberships = await mkLegacyUser(companyA.id, 'sinnmemb');
    legacySuspendedUser = await mkLegacyUser(companyA.id, 'susp');

    const mkUser = (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-06-ord-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-06 ORD HTTP ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    const userWithoutMemberships = await mkUser(legacyUserWithoutMemberships.id, 'sinnmemb');
    const suspendedUser = await mkUser(legacySuspendedUser.id, 'susp');
    userIds = [userA.id, userB.id, userWithoutMemberships.id, suspendedUser.id];

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

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-06 ORD HTTP Cli A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `S-V1-06 ORD HTTP Cli B ${suffix}` },
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
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
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

  it('SV6-H-01: sin token → 401 (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/pedidos').expect(401);
    await request(BASE).get('/pedidos/cualquier-id').expect(401);
    await request(BASE).patch('/pedidos/cualquier-id/estado').send({}).expect(401);
  });

  it('SV6-H-02: GET /pedidos con claim B + Membership A → solo pedidos de A', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    const res = await request(BASE)
      .get('/pedidos')
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);

    const ids = res.body.map((o: { id: string }) => o.id);
    expect(ids).toContain(orderA.id);
    expect(ids).not.toContain(orderB.id);
    expect(res.body.every((o: { empresaId: string }) => o.empresaId === companyA.id)).toBe(true);
  });

  it('SV6-H-03: GET /pedidos?estado=... respeta tenant y filtro a la vez', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const received = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const cancelled = await mkOrder(
      companyA.id,
      customerA.id,
      [{ productId: productA.id, quantity: 1 }],
      'CANCELADO',
    );
    const cancelledB = await mkOrder(
      companyB.id,
      customerB.id,
      [{ productId: productB.id, quantity: 1 }],
      'CANCELADO',
    );
    const auth = `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`;

    const resCancelled = await request(BASE)
      .get('/pedidos?estado=CANCELADO')
      .set('Authorization', auth)
      .expect(200);
    const cancelledIds = resCancelled.body.map((o: { id: string }) => o.id);
    expect(cancelledIds).toContain(cancelled.id);
    expect(cancelledIds).not.toContain(received.id);
    expect(cancelledIds).not.toContain(cancelledB.id);
    expect(
      resCancelled.body.every(
        (o: { empresaId: string; estado: string }) =>
          o.empresaId === companyA.id && o.estado === 'CANCELADO',
      ),
    ).toBe(true);

    const resReceived = await request(BASE)
      .get('/pedidos?estado=RECIBIDO')
      .set('Authorization', auth)
      .expect(200);
    const receivedIds = resReceived.body.map((o: { id: string }) => o.id);
    expect(receivedIds).toContain(received.id);
    expect(receivedIds).not.toContain(cancelled.id);
  });

  it('SV6-H-04: GET /pedidos/:id propio con claim B + Membership A → 200', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 2 },
    ]);

    const res = await request(BASE)
      .get(`/pedidos/${orderA.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(200);

    expect(res.body.id).toBe(orderA.id);
    expect(res.body.empresaId).toBe(companyA.id);
    expect(res.body.pedidoItems).toHaveLength(1);
  });

  it('SV6-H-05: GET /pedidos/:id de otro tenant → 404 (también con claim de ese tenant)', async () => {
    const productB = await mkProduct(companyB.id, hierB);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 1 },
    ]);

    await request(BASE)
      .get(`/pedidos/${orderB.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .expect(404);
    await request(BASE)
      .get(`/pedidos/${orderB.id}`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .expect(404);
  });

  it('SV6-H-06: PATCH /pedidos/:id/estado de otro tenant → 404 y B intacto', async () => {
    const productB = await mkProduct(companyB.id, hierB);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 3 },
    ]);

    await request(BASE)
      .patch(`/pedidos/${orderB.id}/estado`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send({ estado: 'CONFIRMADO' })
      .expect(404);

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderB.id } });
    expect(row.estado).toBe('RECIBIDO');
    expect(row.usuarioId).toBeNull();
    expect(await batchQuantity(batchB.id)).toBe(10);
    expect(await movementCount(orderB.id)).toBe(0);
  });

  it('SV6-H-07: confirmar pedido de A con claim B → solo recursos de A cambian', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 4 },
    ]);
    const orderB = await mkOrder(companyB.id, customerB.id, [
      { productId: productB.id, quantity: 4 },
    ]);

    const res = await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send({ estado: 'CONFIRMADO' })
      .expect(200);

    expect(res.body.estado).toBe('CONFIRMADO');
    expect(res.body.empresaId).toBe(companyA.id);
    expect(await batchQuantity(batchA.id)).toBe(6);
    const movements = await prisma.movimientoStock.findMany({
      where: { referenciaId: orderA.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      empresaId: companyA.id,
      loteId: batchA.id,
      tipoMovimiento: 'Salida',
      motivo: 'Venta',
    });
    expect(Number(movements[0].cantidad)).toBe(4);

    // B resources are intact.
    expect(await batchQuantity(batchB.id)).toBe(10);
    expect(await movementCount(orderB.id)).toBe(0);
    const rowB = await prisma.pedido.findUniqueOrThrow({ where: { id: orderB.id } });
    expect(rowB.estado).toBe('RECIBIDO');
  });

  it('SV6-H-08: stock insuficiente → 400, pedido sigue RECIBIDO y sin efectos parciales', async () => {
    const productOk = await mkProduct(companyA.id, hierA);
    const productShort = await mkProduct(companyA.id, hierA);
    const batchOk = await mkBatch(companyA.id, productOk.id, 10);
    const batchShort = await mkBatch(companyA.id, productShort.id, 1);
    // First item is satisfiable, second is not: the whole transaction rolls back.
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productOk.id, quantity: 2 },
      { productId: productShort.id, quantity: 999 },
    ]);

    await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
      .send({ estado: 'CONFIRMADO' })
      .expect(400);

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
    expect(row.usuarioId).toBeNull();
    expect(await batchQuantity(batchOk.id)).toBe(10);
    expect(await batchQuantity(batchShort.id)).toBe(1);
    expect(await movementCount(orderA.id)).toBe(0);
  });

  it('SV6-H-09: cancelar RECIBIDO → CANCELADO, setea usuarioId, sin tocar stock', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 3 },
    ]);

    const res = await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyB.id)}`)
      .send({ estado: 'CANCELADO' })
      .expect(200);

    expect(res.body.estado).toBe('CANCELADO');
    expect(res.body.empresaId).toBe(companyA.id);
    // Pedido.usuarioId keeps the legacy Usuario id (JWT `sub`), ORD-006-01.
    expect(res.body.usuarioId).toBe(legacyUserA.id);
    expect(await batchQuantity(batchA.id)).toBe(10);
    expect(await movementCount(orderA.id)).toBe(0);
  });

  it('SV6-H-10: doble confirmación → 400 y sin segunda salida de stock', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 2 },
    ]);
    const auth = `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`;

    await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', auth)
      .send({ estado: 'CONFIRMADO' })
      .expect(200);
    await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', auth)
      .send({ estado: 'CONFIRMADO' })
      .expect(400);

    expect(await batchQuantity(batchA.id)).toBe(8);
    expect(await movementCount(orderA.id)).toBe(1);
  });

  it('SV6-H-11: sin permiso pedidos.gestionar → 403 en los tres endpoints y no persiste', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    const auth = `Bearer ${tokenFor(legacyUserA.id, companyA.id, [])}`;

    await request(BASE).get('/pedidos').set('Authorization', auth).expect(403);
    await request(BASE).get(`/pedidos/${orderA.id}`).set('Authorization', auth).expect(403);
    await request(BASE)
      .patch(`/pedidos/${orderA.id}/estado`)
      .set('Authorization', auth)
      .send({ estado: 'CANCELADO' })
      .expect(403);

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
  });

  it('SV6-H-12: sin Membership ACTIVE o SUSPENDED → 403 fail-closed', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);

    for (const legacyId of [legacyUserWithoutMemberships.id, legacySuspendedUser.id]) {
      const auth = `Bearer ${tokenFor(legacyId, companyA.id)}`;
      await request(BASE).get('/pedidos').set('Authorization', auth).expect(403);
      await request(BASE).get(`/pedidos/${orderA.id}`).set('Authorization', auth).expect(403);
      await request(BASE)
        .patch(`/pedidos/${orderA.id}/estado`)
        .set('Authorization', auth)
        .send({ estado: 'CANCELADO' })
        .expect(403);
    }

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
  });

  it('SV6-H-13: token type=cliente → 403 en los tres endpoints', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const orderA = await mkOrder(companyA.id, customerA.id, [
      { productId: productA.id, quantity: 1 },
    ]);
    // A customer token carries no permissions in production (403 from
    // PermissionsGuard); the second variant forges the permission to prove
    // BusinessContext rejects non-usuario identities on its own.
    for (const permissions of [[], ['pedidos.gestionar']]) {
      const auth = `Bearer ${tokenFor(customerA.id, companyA.id, permissions, 'cliente')}`;
      await request(BASE).get('/pedidos').set('Authorization', auth).expect(403);
      await request(BASE).get(`/pedidos/${orderA.id}`).set('Authorization', auth).expect(403);
      await request(BASE)
        .patch(`/pedidos/${orderA.id}/estado`)
        .set('Authorization', auth)
        .send({ estado: 'CANCELADO' })
        .expect(403);
    }

    const row = await prisma.pedido.findUniqueOrThrow({ where: { id: orderA.id } });
    expect(row.estado).toBe('RECIBIDO');
  });
});
