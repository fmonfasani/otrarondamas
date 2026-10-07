import { createHmac, randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-07 — HTTP boundary of SALES and PAYMENTS against the REAL compiled
// stack (dist/src/main.js, the same production binary):
//
//   HTTP → JwtAuthGuard(global) → JwtStrategy → PermissionsGuard(global)
//        → ApprovedDossierGuard → SalesController / PaymentsController
//        → BusinessContextService → User → Membership ACTIVE → businessId
//        → resolveCompanyId() → CompanyScopedPrismaService.forCompany()
//        → companyScopeExtension → response
//
// Real HTTP instead of a TestingModule for the same reason documented in
// s-v1-04-catalog-http.integration-spec.ts (@nestjs/jwt v12 is ESM and does
// not load under jest CJS).
//
// The claims are LEGACY (empresaId travels in the token). The tests prove
// that this claim is NOT the tenant authority for these surfaces. Everything
// about sale/payment business behavior CHARACTERIZES the current code
// (S-V1-07 SAL-007-*); it is not adopted as TO-BE.
//
// Route facts verified against the compiled app (dist route dump): the
// Sales handler `POST /ventas/:id/pagos` is registered BEFORE the Payments
// handler `POST /ventas/:ventaId/pagos`, so Express routes every POST to
// Sales and the Payments POST handler is unreachable over HTTP. Payments
// only contributes `GET /ventas/:ventaId/pagos`.
describe('S-V1-07 — Ventas y Pagos (HTTP, stack real)', () => {
  const PORT = '3393';
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
  let legacyCrossUser: { id: string };
  let userIds: string[];

  let customerA: { id: string };
  let customerB: { id: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;
  let hierB: Awaited<ReturnType<typeof mkHierarchy>>;
  let cashRegisterA: { id: string };
  let openingA: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (
    userId: string,
    tokenCompanyId: string,
    permissions: string[] = ['ventas.crear', 'ventas.ver'],
    type: 'usuario' | 'cliente' = 'usuario',
  ) => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      email: `s-v1-07-${userId}@example.test`,
      nombre: 'S V1-07',
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
      data: { empresaId: companyId, nombre: `S-V1-07 H Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-07 H Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-07 H Tip ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-07 H Subt ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  // A fresh product per scenario keeps per-batch assertions deterministic
  // (FIFO deduction spans every batch of the same product).
  const mkProduct = async (
    companyId: string,
    hier: Awaited<ReturnType<typeof mkHierarchy>>,
    extra: { marca?: string; activo?: boolean } = {},
  ) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-07 HProd ${counter} ${suffix}`,
        codigoInterno: `SV7H-${counter}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
        ...extra,
      },
      select: { id: true, nombre: true },
    });
  };

  const mkBatch = async (companyId: string, productId: string, quantity: number) => {
    counter += 1;
    return prisma.lote.create({
      data: {
        empresaId: companyId,
        productoId: productId,
        numeroLote: `S7H-LOTE-${counter}-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: quantity,
      },
      select: { id: true },
    });
  };

  // Direct DB sale (bypasses HTTP) to seed tenant-owned rows.
  const mkSale = async (
    companyId: string,
    usuarioId: string,
    productId: string,
    options: { total?: number; estado?: 'CONFIRMADA' | 'ANULADA'; clienteId?: string } = {},
  ) => {
    counter += 1;
    return prisma.venta.create({
      data: {
        empresaId: companyId,
        usuarioId,
        clienteId: options.clienteId,
        canal: 'presencial',
        total: options.total ?? 20,
        numero: 800000 + counter,
        estado: options.estado ?? 'CONFIRMADA',
        ventaItems: { create: [{ productoId: productId, cantidad: 2, precioUnitario: 10 }] },
      },
      select: { id: true },
    });
  };

  const batchQuantity = async (batchId: string) =>
    Number((await prisma.lote.findUniqueOrThrow({ where: { id: batchId } })).cantidad);

  const setCashOpen = (open: boolean) =>
    prisma.aperturaCaja.update({
      where: { id: openingA.id },
      data: { fechaCierre: open ? null : new Date() },
    });

  const cashMovements = (paymentId: string) =>
    prisma.movimientoCaja.findMany({ where: { referenciaId: paymentId } });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-07 HTTP A ${suffix}`, slug: `s-v1-07-sales-http-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-07 HTTP B ${suffix}`, slug: `s-v1-07-sales-http-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `S-V1-07 HTTP ${tag} ${suffix}`,
          email: `s-v1-07-http-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyUserWithoutMemberships = await mkLegacyUser(companyA.id, 'sinnmemb');
    legacySuspendedUser = await mkLegacyUser(companyA.id, 'susp');
    // Legacy Usuario of company B whose User holds the ACTIVE Membership of A.
    legacyCrossUser = await mkLegacyUser(companyB.id, 'cross');

    const mkUser = (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `s-v1-07-http-user-${tag}-${suffix}@example.test`,
          nombre: `S V1-07 HTTP ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    const userWithoutMemberships = await mkUser(legacyUserWithoutMemberships.id, 'sinnmemb');
    const suspendedUser = await mkUser(legacySuspendedUser.id, 'susp');
    const crossUser = await mkUser(legacyCrossUser.id, 'cross');
    userIds = [userA.id, userB.id, userWithoutMemberships.id, suspendedUser.id, crossUser.id];

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
    await prisma.membership.create({
      data: { userId: crossUser.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    // userWithoutMemberships is deliberately left without a Membership.

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-07 HTTP Cli A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `S-V1-07 HTTP Cli B ${suffix}` },
      select: { id: true },
    });

    cashRegisterA = await prisma.caja.create({
      data: { empresaId: companyA.id, fondoFijo: 0 },
      select: { id: true },
    });
    openingA = await prisma.aperturaCaja.create({
      data: { cajaId: cashRegisterA.id, usuarioId: legacyUserA.id, montoInicial: 0 },
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
    await prisma.movimientoCaja.deleteMany({ where: { cajaId: cashRegisterA.id } });
    await prisma.aperturaCaja.deleteMany({ where: { cajaId: cashRegisterA.id } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pago.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
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

  // ------------------------------------------------------------------ auth

  it('SV7-H-01: sin token → 401 en todas las rutas (JwtAuthGuard global intacto)', async () => {
    await request(BASE).get('/ventas/productos?search=ab').expect(401);
    await request(BASE).post('/ventas/cotizacion').send({}).expect(401);
    await request(BASE).post('/ventas').send({}).expect(401);
    await request(BASE).get('/ventas').expect(401);
    await request(BASE).get('/ventas/cualquier-id').expect(401);
    await request(BASE).get('/ventas/cualquier-id/comprobante').expect(401);
    await request(BASE).post('/ventas/cualquier-id/pagos').send({}).expect(401);
    await request(BASE).get('/ventas/cualquier-id/pagos').expect(401);
  });

  // -------------------------------------------------- Sales: read endpoints

  it('SV7-H-02: GET /ventas/productos con claim B + Membership A → solo productos de A', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);

    const res = await request(BASE)
      .get('/ventas/productos?search=S-V1-07 HProd')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .expect(200);

    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(productA.id);
    expect(ids).not.toContain(productB.id);
  });

  it('SV7-H-03: POST /ventas/cotizacion → 200 con catálogo de A; producto de B → 404', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const auth = bearer(legacyUserA.id, companyB.id);

    const ok = await request(BASE)
      .post('/ventas/cotizacion')
      .set('Authorization', auth)
      .send({ canal: 'presencial', items: [{ productoId: productA.id, cantidad: 3 }] })
      .expect(200);
    expect(ok.body.total).toBe('30');

    const res = await request(BASE)
      .post('/ventas/cotizacion')
      .set('Authorization', auth)
      .send({ canal: 'presencial', items: [{ productoId: productB.id, cantidad: 1 }] })
      .expect(404);
    expect(res.body.message).toBe('PRODUCTO_NO_ENCONTRADO');
  });

  it('SV7-H-04: GET /ventas, /ventas/:id y /comprobante con claim B + Membership A → solo A', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const filterCustomer = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `S-V1-07 HTTP Cli filtro ${suffix}` },
      select: { id: true },
    });
    const withCustomer = await mkSale(companyA.id, legacyUserA.id, productA.id, {
      clienteId: filterCustomer.id,
    });
    const plain = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const saleB = await mkSale(companyB.id, legacyUserB.id, productB.id, {
      clienteId: customerB.id,
    });
    const auth = bearer(legacyUserA.id, companyB.id);

    const list = await request(BASE)
      .get('/ventas?pageSize=50')
      .set('Authorization', auth)
      .expect(200);
    const ids = list.body.data.map((s: { id: string }) => s.id);
    expect(ids).toEqual(expect.arrayContaining([withCustomer.id, plain.id]));
    expect(ids).not.toContain(saleB.id);
    expect(list.body.data.every((s: { empresaId: string }) => s.empresaId === companyA.id)).toBe(
      true,
    );

    const byCustomer = await request(BASE)
      .get(`/ventas?clienteId=${filterCustomer.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(byCustomer.body.data.map((s: { id: string }) => s.id)).toEqual([withCustomer.id]);

    const byCustomerB = await request(BASE)
      .get(`/ventas?clienteId=${customerB.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(byCustomerB.body.data).toEqual([]);

    const byUserB = await request(BASE)
      .get(`/ventas?usuarioId=${legacyUserB.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(byUserB.body.data).toEqual([]);

    const pending = await request(BASE)
      .get('/ventas?estadoCobro=PENDIENTE&pageSize=50')
      .set('Authorization', auth)
      .expect(200);
    expect(pending.body.data.map((s: { id: string }) => s.id)).toContain(plain.id);

    const detail = await request(BASE)
      .get(`/ventas/${plain.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: plain.id,
      empresaId: companyA.id,
      saldo: '20',
      estadoCobro: 'PENDIENTE',
    });
    expect(detail.body.numeroFormateado).toMatch(/^#\d{8}$/);
    expect(detail.body.ventaItems).toHaveLength(1);

    const receipt = await request(BASE)
      .get(`/ventas/${plain.id}/comprobante`)
      .set('Authorization', auth)
      .expect(200);
    expect(receipt.body.id).toBe(plain.id);
  });

  it('SV7-H-05: GET /ventas/:id y /comprobante de otro tenant → 404 con ambos claims', async () => {
    const productB = await mkProduct(companyB.id, hierB);
    const saleB = await mkSale(companyB.id, legacyUserB.id, productB.id);

    for (const claim of [companyA.id, companyB.id]) {
      const auth = bearer(legacyUserA.id, claim);
      await request(BASE).get(`/ventas/${saleB.id}`).set('Authorization', auth).expect(404);
      await request(BASE)
        .get(`/ventas/${saleB.id}/comprobante`)
        .set('Authorization', auth)
        .expect(404);
    }
  });

  // ---------------------------------------------------- Sales: create (POST)

  it('SV7-H-06: POST /ventas con claim B + Membership A → venta en A, stock de A, B intacto', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);

    const res = await request(BASE)
      .post('/ventas')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send({ canal: 'presencial', items: [{ productoId: productA.id, cantidad: 4 }] })
      .expect(201);

    expect(res.body).toMatchObject({
      empresaId: companyA.id,
      usuarioId: legacyUserA.id,
      estado: 'CONFIRMADA',
      saldo: '40',
    });
    expect(Number(res.body.total)).toBe(40);
    expect(res.body.advertenciasStockVencido).toEqual([]);
    expect(await batchQuantity(batchA.id)).toBe(6);
    expect(await batchQuantity(batchB.id)).toBe(10);

    const movements = await prisma.movimientoStock.findMany({
      where: { referenciaId: res.body.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      empresaId: companyA.id,
      productoId: productA.id,
      loteId: batchA.id,
      tipoMovimiento: 'Salida',
      motivo: 'Venta',
      usuarioId: legacyUserA.id,
    });
    expect(Number(movements[0].cantidad)).toBe(4);
    expect(
      await prisma.auditLog.count({
        where: { entidadId: res.body.id, accion: 'CREATE', empresaId: companyA.id },
      }),
    ).toBe(1);
  });

  it('SV7-H-07: POST /ventas con producto o cliente de B → 404 y no persiste nada', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const keyProduct = randomUUID();
    const keyCustomer = randomUUID();
    const auth = bearer(legacyUserA.id, companyB.id);

    await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send({
        canal: 'presencial',
        items: [{ productoId: productB.id, cantidad: 1 }],
        idempotencyKey: keyProduct,
      })
      .expect(404);
    await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send({
        canal: 'presencial',
        clienteId: customerB.id,
        items: [{ productoId: productA.id, cantidad: 1 }],
        idempotencyKey: keyCustomer,
      })
      .expect(404);

    expect(
      await prisma.venta.count({ where: { idempotencyKey: { in: [keyProduct, keyCustomer] } } }),
    ).toBe(0);
    expect(await batchQuantity(batchA.id)).toBe(10);
    expect(await batchQuantity(batchB.id)).toBe(10);
  });

  it('SV7-H-08: POST /ventas con stock insuficiente → 400 y rollback completo', async () => {
    const productOk = await mkProduct(companyA.id, hierA);
    const productShort = await mkProduct(companyA.id, hierA);
    const batchOk = await mkBatch(companyA.id, productOk.id, 10);
    const batchShort = await mkBatch(companyA.id, productShort.id, 1);
    const key = randomUUID();

    await request(BASE)
      .post('/ventas')
      .set('Authorization', bearer(legacyUserA.id, companyA.id))
      .send({
        canal: 'presencial',
        items: [
          { productoId: productOk.id, cantidad: 2 },
          { productoId: productShort.id, cantidad: 999 },
        ],
        idempotencyKey: key,
      })
      .expect(400);

    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await batchQuantity(batchOk.id)).toBe(10);
    expect(await batchQuantity(batchShort.id)).toBe(1);
    expect(
      await prisma.movimientoStock.count({
        where: { productoId: { in: [productOk.id, productShort.id] } },
      }),
    ).toBe(0);
  });

  it('SV7-H-09: idempotencyKey repetida en el mismo tenant devuelve la misma venta y descuenta una vez', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const key = randomUUID();
    const body = {
      canal: 'presencial',
      items: [{ productoId: productA.id, cantidad: 2 }],
      idempotencyKey: key,
    };
    const auth = bearer(legacyUserA.id, companyB.id);

    const first = await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send(body)
      .expect(201);
    const second = await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send(body)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(await batchQuantity(batchA.id)).toBe(8);
    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('SV7-H-10: cliente + regla de fidelización de A se aplican; la regla (mayor) de B no', async () => {
    const marca = `S7HMARCA-${suffix}`;
    const productA = await mkProduct(companyA.id, hierA, { marca });
    const productB = await mkProduct(companyB.id, hierB, { marca });
    await mkBatch(companyA.id, productA.id, 10);
    await mkBatch(companyB.id, productB.id, 10);
    await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-07 H regla A ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        marca,
      },
    });
    await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-07 H regla B ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 50,
        marca,
      },
    });

    const res = await request(BASE)
      .post('/ventas')
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send({
        canal: 'presencial',
        clienteId: customerA.id,
        items: [{ productoId: productA.id, cantidad: 2 }],
      })
      .expect(201);

    expect(res.body.clienteId).toBe(customerA.id);
    expect(Number(res.body.total)).toBe(18);
    const item = await prisma.ventaItem.findFirstOrThrow({ where: { ventaId: res.body.id } });
    expect(Number(item.descuentoFidelizacionPorcentaje)).toBe(10);
    expect(item.reglaFidelizacionId).not.toBeNull();
  });

  it('SV7-H-11: descuentoItem ≠ 0 → 403 DESCUENTO_NO_AUTORIZADO; producto inactivo → 422', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const inactive = await mkProduct(companyA.id, hierA, { activo: false });
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    await mkBatch(companyA.id, inactive.id, 10);
    const key = randomUUID();
    const auth = bearer(legacyUserA.id, companyA.id);

    const forbidden = await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send({
        canal: 'presencial',
        items: [{ productoId: productA.id, cantidad: 1, descuentoItem: 5 }],
        idempotencyKey: key,
      })
      .expect(403);
    expect(forbidden.body.message).toBe('DESCUENTO_NO_AUTORIZADO');
    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await batchQuantity(batchA.id)).toBe(10);

    const unprocessable = await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send({ canal: 'presencial', items: [{ productoId: inactive.id, cantidad: 1 }] })
      .expect(422);
    expect(unprocessable.body.message).toBe('PRODUCTO_INACTIVO');
  });

  it('SV7-H-12 (idempotencia cross-tenant, caracterización): B reusando la key de A → 500 (P2002 global) y nada se filtra', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const batchB = await mkBatch(companyB.id, productB.id, 10);
    const key = randomUUID();

    const saleA = await request(BASE)
      .post('/ventas')
      .set('Authorization', bearer(legacyUserA.id, companyA.id))
      .send({
        canal: 'presencial',
        items: [{ productoId: productA.id, cantidad: 1 }],
        idempotencyKey: key,
      })
      .expect(201);

    // Existing dependency: idempotencyKey is globally @unique. The scoped
    // lookup does not see A's sale, so the INSERT collides (unhandled → 500).
    // Not corrected here; B never receives A's sale.
    const res = await request(BASE)
      .post('/ventas')
      .set('Authorization', bearer(legacyUserB.id, companyB.id))
      .send({
        canal: 'presencial',
        items: [{ productoId: productB.id, cantidad: 1 }],
        idempotencyKey: key,
      })
      .expect(500);
    expect(JSON.stringify(res.body)).not.toContain(saleA.body.id);

    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await batchQuantity(batchA.id)).toBe(9);
    expect(await batchQuantity(batchB.id)).toBe(10);
  });

  // ----------------------------------- Payments over HTTP (route as registered)

  it('SV7-H-13: POST /ventas/:id/pagos (transferencia) con claim B → 201 { pago, saldo }, AuditLog PAGO, sin MovimientoCaja', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);

    const res = await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', bearer(legacyUserA.id, companyB.id))
      .send({ medio: 'transferencia', monto: 5, referencia: 'REF-H1' })
      .expect(201);

    expect(res.body.saldo).toBe('15');
    expect(res.body.pago).toMatchObject({
      empresaId: companyA.id,
      usuarioId: legacyUserA.id,
      ventaId: saleA.id,
      medio: 'transferencia',
      estado: 'APROBADO',
      referencia: 'REF-H1',
    });
    const audit = await prisma.auditLog.findMany({
      where: { entidadId: res.body.pago.id, accion: 'PAGO' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].empresaId).toBe(companyA.id);
    expect(await cashMovements(res.body.pago.id)).toHaveLength(0);
  });

  it('SV7-H-14: POST /ventas/:id/pagos efectivo — caja abierta: Pago + vuelto sin MovimientoCaja (gana el handler de Sales); caja cerrada: 409', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const auth = bearer(legacyUserA.id, companyA.id);

    await setCashOpen(true);
    const paid = await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'efectivo', monto: 10, montoRecibido: 15 })
      .expect(201);
    expect(paid.body.saldo).toBe('10');
    expect(Number(paid.body.pago.vuelto)).toBe(5);
    // Characterization (SAL-007-05): Sales' handler never creates
    // MovimientoCaja; the Payments handler that would is not reachable here.
    expect(await cashMovements(paid.body.pago.id)).toHaveLength(0);

    await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'efectivo', monto: 5, montoRecibido: 1 })
      .expect(400);

    await setCashOpen(false);
    try {
      const closed = await request(BASE)
        .post(`/ventas/${saleA.id}/pagos`)
        .set('Authorization', auth)
        .send({ medio: 'efectivo', monto: 5 })
        .expect(409);
      expect(closed.body.message).toBe('CAJA_CERRADA');
    } finally {
      await setCashOpen(true);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(1);
  });

  it('SV7-H-15: POST /ventas/:id/pagos sobrepago → 400 PAGO_EXCEDE_SALDO; venta anulada → 409 VENTA_ANULADA', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const annulled = await mkSale(companyA.id, legacyUserA.id, productA.id, { estado: 'ANULADA' });
    const auth = bearer(legacyUserA.id, companyA.id);

    const over = await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 21 })
      .expect(400);
    expect(over.body.message).toBe('PAGO_EXCEDE_SALDO');
    const gone = await request(BASE)
      .post(`/ventas/${annulled.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 1 })
      .expect(409);
    expect(gone.body.message).toBe('VENTA_ANULADA');
    expect(await prisma.pago.count({ where: { ventaId: { in: [saleA.id, annulled.id] } } })).toBe(
      0,
    );
  });

  it('SV7-H-16: POST /ventas/:id/pagos de otro tenant → 404 y B intacto (ambos claims)', async () => {
    const productB = await mkProduct(companyB.id, hierB);
    const saleB = await mkSale(companyB.id, legacyUserB.id, productB.id);

    for (const claim of [companyA.id, companyB.id]) {
      await request(BASE)
        .post(`/ventas/${saleB.id}/pagos`)
        .set('Authorization', bearer(legacyUserA.id, claim))
        .send({ medio: 'transferencia', monto: 5 })
        .expect(404);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleB.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { ventaId: saleB.id } })).toBe(0);
  });

  it('SV7-H-17: GET /ventas/:ventaId/pagos (handler de Payments) con claim B + Membership A; otro tenant → 404', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const saleB = await mkSale(companyB.id, legacyUserB.id, productB.id);
    const auth = bearer(legacyUserA.id, companyB.id);

    await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 5 })
      .expect(201);

    const res = await request(BASE)
      .get(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ empresaId: companyA.id, ventaId: saleA.id });

    for (const claim of [companyA.id, companyB.id]) {
      await request(BASE)
        .get(`/ventas/${saleB.id}/pagos`)
        .set('Authorization', bearer(legacyUserA.id, claim))
        .expect(404);
    }
  });

  it('SV7-H-18 (ruta duplicada, caracterización): el POST de Payments es inalcanzable — la respuesta tiene la forma de Sales y no hay MovimientoCaja', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    await setCashOpen(true);

    // Payments' service would return the raw Pago and (cash + open register)
    // create a MovimientoCaja. The observed response is Sales' { pago, saldo }
    // and no MovimientoCaja exists, proving which handler serves the route.
    const res = await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', bearer(legacyUserA.id, companyA.id))
      .send({ medio: 'efectivo', monto: 4 })
      .expect(201);
    expect(res.body).toHaveProperty('pago');
    expect(res.body).toHaveProperty('saldo', '16');
    expect(await cashMovements(res.body.pago.id)).toHaveLength(0);
  });

  // ---------------------------------------------------------- fail-closed

  it('SV7-H-19: sin Membership ACTIVE o SUSPENDED → 403 fail-closed en todas las rutas', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);

    for (const legacyId of [legacyUserWithoutMemberships.id, legacySuspendedUser.id]) {
      const auth = bearer(legacyId, companyA.id);
      const quoteBody = { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] };
      await request(BASE).get('/ventas/productos?search=ab').set('Authorization', auth).expect(403);
      await request(BASE)
        .post('/ventas/cotizacion')
        .set('Authorization', auth)
        .send(quoteBody)
        .expect(403);
      await request(BASE).post('/ventas').set('Authorization', auth).send(quoteBody).expect(403);
      await request(BASE).get('/ventas').set('Authorization', auth).expect(403);
      await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', auth).expect(403);
      await request(BASE)
        .get(`/ventas/${saleA.id}/comprobante`)
        .set('Authorization', auth)
        .expect(403);
      await request(BASE)
        .post(`/ventas/${saleA.id}/pagos`)
        .set('Authorization', auth)
        .send({ medio: 'transferencia', monto: 1 })
        .expect(403);
      await request(BASE).get(`/ventas/${saleA.id}/pagos`).set('Authorization', auth).expect(403);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });

  it('SV7-H-20: token type=cliente → 403 en todas las rutas (con y sin permisos forjados)', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);

    // A customer token carries no permissions in production (403 from
    // PermissionsGuard); the second variant forges the permissions to prove
    // BusinessContext rejects non-usuario identities on its own.
    for (const permissions of [[], ['ventas.crear', 'ventas.ver']]) {
      const auth = bearer(customerA.id, companyA.id, permissions, 'cliente');
      const body = { canal: 'presencial', items: [{ productoId: productA.id, cantidad: 1 }] };
      await request(BASE).get('/ventas/productos?search=ab').set('Authorization', auth).expect(403);
      await request(BASE)
        .post('/ventas/cotizacion')
        .set('Authorization', auth)
        .send(body)
        .expect(403);
      await request(BASE).post('/ventas').set('Authorization', auth).send(body).expect(403);
      await request(BASE).get('/ventas').set('Authorization', auth).expect(403);
      await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', auth).expect(403);
      await request(BASE)
        .get(`/ventas/${saleA.id}/comprobante`)
        .set('Authorization', auth)
        .expect(403);
      await request(BASE)
        .post(`/ventas/${saleA.id}/pagos`)
        .set('Authorization', auth)
        .send({ medio: 'transferencia', monto: 1 })
        .expect(403);
      await request(BASE).get(`/ventas/${saleA.id}/pagos`).set('Authorization', auth).expect(403);
    }
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });

  // -------------------------------------------------------- authorization

  it('SV7-H-21: sin ventas.crear → 403 en cotizacion/create/pagos y no persiste; las rutas sin permiso siguen abiertas', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    await mkBatch(companyA.id, productA.id, 10);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const auth = bearer(legacyUserA.id, companyA.id, []);
    const key = randomUUID();
    const body = {
      canal: 'presencial',
      items: [{ productoId: productA.id, cantidad: 1 }],
      idempotencyKey: key,
    };

    await request(BASE)
      .post('/ventas/cotizacion')
      .set('Authorization', auth)
      .send(body)
      .expect(403);
    await request(BASE).post('/ventas').set('Authorization', auth).send(body).expect(403);
    await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 1 })
      .expect(403);
    await request(BASE).get('/ventas').set('Authorization', auth).expect(403);
    await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', auth).expect(403);
    await request(BASE)
      .get(`/ventas/${saleA.id}/comprobante`)
      .set('Authorization', auth)
      .expect(403);
    expect(await prisma.venta.count({ where: { idempotencyKey: key } })).toBe(0);
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);

    // No @RequirePermission on these two: Membership alone is enough.
    await request(BASE).get('/ventas/productos?search=ab').set('Authorization', auth).expect(200);
    await request(BASE).get(`/ventas/${saleA.id}/pagos`).set('Authorization', auth).expect(200);
  });

  it('SV7-H-22 (ventas.ver, caracterización): con los permisos sembrados (ventas.crear) las lecturas dan 403; con ventas.ver dan 200', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const seededOnly = bearer(legacyUserA.id, companyA.id, ['ventas.crear']);
    const withView = bearer(legacyUserA.id, companyA.id, ['ventas.ver']);

    // Seed catalog / AUTH-001 only carry ventas.crear and ventas.anular, so a
    // seeded user cannot read sales. NOT fixed here (SAL-007-04).
    await request(BASE).get('/ventas').set('Authorization', seededOnly).expect(403);
    await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', seededOnly).expect(403);
    await request(BASE)
      .get(`/ventas/${saleA.id}/comprobante`)
      .set('Authorization', seededOnly)
      .expect(403);

    await request(BASE).get('/ventas').set('Authorization', withView).expect(200);
    await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', withView).expect(200);
    await request(BASE)
      .get(`/ventas/${saleA.id}/comprobante`)
      .set('Authorization', withView)
      .expect(200);
  });

  // ------------------------------------------------------------------ J1

  it('SV7-H-23 (J1, caracterización): Venta.usuarioId = user.id aunque el Usuario legacy sea de otra empresa', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const batchA = await mkBatch(companyA.id, productA.id, 10);
    const legacy = await prisma.usuario.findUniqueOrThrow({ where: { id: legacyCrossUser.id } });
    expect(legacy.empresaId).toBe(companyB.id);
    const auth = bearer(legacyCrossUser.id, companyB.id);

    const sale = await request(BASE)
      .post('/ventas')
      .set('Authorization', auth)
      .send({ canal: 'presencial', items: [{ productoId: productA.id, cantidad: 2 }] })
      .expect(201);

    expect(sale.body.empresaId).toBe(companyA.id);
    expect(sale.body.usuarioId).toBe(legacyCrossUser.id);
    expect(await batchQuantity(batchA.id)).toBe(8);
    const movements = await prisma.movimientoStock.findMany({
      where: { referenciaId: sale.body.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].empresaId).toBe(companyA.id);
    expect(movements[0].usuarioId).toBe(legacyCrossUser.id);

    const payment = await request(BASE)
      .post(`/ventas/${sale.body.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 5 })
      .expect(201);
    expect(payment.body.pago.empresaId).toBe(companyA.id);
    expect(payment.body.pago.usuarioId).toBe(legacyCrossUser.id);

    // The sale is readable inside A (list embeds the legacy Usuario by FK).
    const detail = await request(BASE)
      .get(`/ventas/${sale.body.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(detail.body.usuario.id).toBe(legacyCrossUser.id);
  });

  // ------------------------------------------------------------- symmetry

  it('SV7-H-24: un miembro de B solo ve B (simetría B→A) y no puede mutar ventas de A', async () => {
    const productA = await mkProduct(companyA.id, hierA);
    const productB = await mkProduct(companyB.id, hierB);
    const saleA = await mkSale(companyA.id, legacyUserA.id, productA.id);
    const saleB = await mkSale(companyB.id, legacyUserB.id, productB.id);
    const auth = bearer(legacyUserB.id, companyA.id);

    const list = await request(BASE)
      .get('/ventas?pageSize=50')
      .set('Authorization', auth)
      .expect(200);
    const ids = list.body.data.map((s: { id: string }) => s.id);
    expect(ids).toContain(saleB.id);
    expect(ids).not.toContain(saleA.id);
    await request(BASE).get(`/ventas/${saleB.id}`).set('Authorization', auth).expect(200);
    await request(BASE).get(`/ventas/${saleA.id}`).set('Authorization', auth).expect(404);
    await request(BASE)
      .post(`/ventas/${saleA.id}/pagos`)
      .set('Authorization', auth)
      .send({ medio: 'transferencia', monto: 5 })
      .expect(404);
    await request(BASE).get(`/ventas/${saleA.id}/pagos`).set('Authorization', auth).expect(404);
    expect(await prisma.pago.count({ where: { ventaId: saleA.id } })).toBe(0);
  });
});
