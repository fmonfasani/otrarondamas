import { createHmac, randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

// S-V1-STORE-01 — AS-IS CHARACTERIZATION of the public Store + Customer Auth.
//
// PURPOSE: record, with reproducible evidence, what the code does TODAY.
// A green test here is NOT an approval of the behavior, NOT the TO-BE and NOT
// an Owner decision. In particular it does NOT approve: TIENDA_EMPRESA_ID as
// the public Business resolution, Customer-by-email, the update of an
// existing Cliente from a guest order, the 400 on tracking, the absence of a
// server-side Cart or the absence of BusinessContext. Those remain open
// (see S-V1-STORE — DISCOVERY, Owner decisions pending).
//
// Store is pre-context: no BusinessContext, no Membership. The Business comes
// from process.env.TIENDA_EMPRESA_ID of the SERVER process. Two real servers
// are spawned from dist/src/main.js (same reason as the other S-V1 HTTP
// suites: @nestjs/jwt is ESM and does not load under jest CJS, so `nest build`
// must have run and JWT_SECRET / GOOGLE_* / DATABASE_URL must be set):
//   - STORE server  (3390): TIENDA_EMPRESA_ID = Business A
//   - NOENV server  (3389): TIENDA_EMPRESA_ID empty (= not configured)
// The env of the jest process is never modified; only the spawned children
// get their own env.
describe('S-V1-STORE-01 — Store + Customer Auth (AS-IS characterization, HTTP, stack real)', () => {
  const PORT = '3390';
  const PORT_NOENV = '3389';
  const BASE = `http://127.0.0.1:${PORT}`;
  const BASE_NOENV = `http://127.0.0.1:${PORT_NOENV}`;
  let server: ChildProcess;
  let serverNoEnv: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;

  let companyA: { id: string; nombre: string };
  let companyB: { id: string; nombre: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;
  let hierB: Awaited<ReturnType<typeof mkHierarchy>>;
  let inactiveFamilyA: { id: string };
  let productA1: { id: string; nombre: string }; // 100.00 with 10% discount, stock 5
  let productA2: { id: string; nombre: string }; // 50.00 no discount, no stock
  let productAInactive: { id: string };
  let productB1: { id: string };
  let ruleA: { id: string };
  let ruleB: { id: string };

  const email = (tag: string) => `s-v1-store-${tag}-${suffix}@example.test`;

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

  const decodeJwt = (token: string) => {
    const [header, payload, signature] = token.split('.');
    const expected = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return {
      validSignature: signature === expected,
      payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    };
  };

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `S-V1-ST Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true, nombre: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `S-V1-ST Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true, nombre: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `S-V1-ST Tip ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `S-V1-ST Subt ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  const mkProduct = (
    companyId: string,
    hier: Awaited<ReturnType<typeof mkHierarchy>>,
    tag: string,
    data: { precioMinorista: string; descuentoPorcentaje?: string; activo?: boolean },
  ) =>
    prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `S-V1-ST Prod ${tag} ${suffix}`,
        codigoInterno: `STORE-${tag}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: '10',
        precioMinorista: data.precioMinorista,
        descuentoPorcentaje: data.descuentoPorcentaje,
        activo: data.activo ?? true,
      },
      select: { id: true, nombre: true },
    });

  const orderBody = (
    emailAddress: string,
    items: Array<{ productoId: string; cantidad: number }>,
    extra: Record<string, unknown> = {},
  ) => ({ nombre: 'Comprador Store', email: emailAddress, items, ...extra });

  const counts = async () => ({
    pedidos: await prisma.pedido.count({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
    }),
    clientes: await prisma.cliente.count({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
    }),
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `S-V1-ST A ${suffix}`, slug: `s-v1-store-01-a-${suffix}`, configuracion: {} },
      select: { id: true, nombre: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `S-V1-ST B ${suffix}`, slug: `s-v1-store-01-b-${suffix}`, configuracion: {} },
      select: { id: true, nombre: true },
    });

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');
    inactiveFamilyA = await prisma.familia.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-ST Fam inactiva A ${suffix}`,
        prefijo: 'FIA',
        activo: false,
      },
      select: { id: true },
    });

    productA1 = await mkProduct(companyA.id, hierA, 'A1', {
      precioMinorista: '100',
      descuentoPorcentaje: '10',
    });
    productA2 = await mkProduct(companyA.id, hierA, 'A2', { precioMinorista: '50' });
    productAInactive = await mkProduct(companyA.id, hierA, 'AX', {
      precioMinorista: '70',
      activo: false,
    });
    productB1 = await mkProduct(companyB.id, hierB, 'B1', { precioMinorista: '999' });

    await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA1.id,
        numeroLote: `L-${suffix}`,
        vencimiento: new Date('2099-01-01T00:00:00.000Z'),
        cantidad: '5',
      },
    });

    // Both rules are created INACTIVE: they only apply while the loyalty
    // order-creation case flips them on, so every other case runs with no
    // loyalty rule in either Business.
    ruleA = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: `S-V1-ST regla A ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        activo: false,
      },
      select: { id: true },
    });
    ruleB = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: `S-V1-ST regla B ${suffix}`,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 40,
        activo: false,
      },
      select: { id: true },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT, TIENDA_EMPRESA_ID: companyA.id },
      stdio: 'ignore',
    });
    // "Not available" is modeled as an EMPTY value, not as a deleted key:
    // @prisma/client loads apps/api/.env into process.env at import time, so
    // on a developer machine an absent key would be silently re-injected from
    // .env (observed). An empty value is not overridden, and both cases take
    // the same `!companyId` branch in StoreService/AuthCustomerController.
    serverNoEnv = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: PORT_NOENV, TIENDA_EMPRESA_ID: '' },
      stdio: 'ignore',
    });
    await Promise.all([waitPort(Number(PORT)), waitPort(Number(PORT_NOENV))]);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    if (serverNoEnv && !serverNoEnv.killed) serverNoEnv.kill();
    if (!prisma || !companyA || !companyB) return;
    const companies = [companyA.id, companyB.id];
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ STORE-01

  it('STORE-01a: GET /tienda/productos sin token → 200 solo con productos activos del Business configurado (A)', async () => {
    const res = await request(BASE).get('/tienda/productos').expect(200);

    const ids = res.body.map((p: { productoId: string }) => p.productoId);
    expect(ids).toEqual(expect.arrayContaining([productA1.id, productA2.id]));
    expect(ids).not.toContain(productAInactive.id);
    expect(ids).not.toContain(productB1.id);
    expect(ids).toHaveLength(2);
  });

  it('STORE-01b: forma y precios AS-IS — descuento global aplicado, stock de lotes, sin campos internos', async () => {
    const res = await request(BASE).get('/tienda/productos').expect(200);
    const a1 = res.body.find((p: { productoId: string }) => p.productoId === productA1.id);
    const a2 = res.body.find((p: { productoId: string }) => p.productoId === productA2.id);

    expect(a1).toMatchObject({
      productoId: productA1.id,
      nombre: productA1.nombre,
      precio: '90.00',
      precioSinDescuento: '100.00',
      descuentoPorcentaje: 10,
      disponible: true,
      stockTotal: 5,
      unidadBase: 'UNIDAD',
    });
    expect(a2).toMatchObject({
      precio: '50.00',
      precioSinDescuento: null,
      descuentoPorcentaje: null,
      disponible: false,
      stockTotal: 0,
    });
    expect(Object.keys(a1).sort()).toEqual(
      [
        'productoId',
        'nombre',
        'codigoInterno',
        'familiaId',
        'subfamiliaId',
        'tipoId',
        'subtipoId',
        'unidadBase',
        'precio',
        'precioSinDescuento',
        'descuentoPorcentaje',
        'disponible',
        'stockTotal',
      ].sort(),
    );
    expect(a1).not.toHaveProperty('costo');
    expect(a1).not.toHaveProperty('empresaId');
  });

  it('STORE-01c: filtros search/familiaId/subfamiliaId se resuelven dentro de A; ids de familia/subfamilia de B → []', async () => {
    const bySearch = await request(BASE)
      .get('/tienda/productos')
      .query({ search: `Prod A1 ${suffix}` })
      .expect(200);
    expect(bySearch.body.map((p: { productoId: string }) => p.productoId)).toEqual([productA1.id]);

    const byFamilyA = await request(BASE)
      .get('/tienda/productos')
      .query({ familiaId: hierA.family.id })
      .expect(200);
    expect(byFamilyA.body).toHaveLength(2);

    const byFamilyB = await request(BASE)
      .get('/tienda/productos')
      .query({ familiaId: hierB.family.id })
      .expect(200);
    expect(byFamilyB.body).toEqual([]);

    const bySubfamilyB = await request(BASE)
      .get('/tienda/productos')
      .query({ subfamiliaId: hierB.subfamily.id })
      .expect(200);
    expect(bySubfamilyB.body).toEqual([]);

    const bySearchB = await request(BASE)
      .get('/tienda/productos')
      .query({ search: `Prod B1 ${suffix}` })
      .expect(200);
    expect(bySearchB.body).toEqual([]);
  });

  // ------------------------------------------------------------------ STORE-02

  it('STORE-02a: GET /tienda/jerarquia sin token → 200, solo Familia/Subfamilia activas de A', async () => {
    const res = await request(BASE).get('/tienda/jerarquia').expect(200);

    expect(Object.keys(res.body).sort()).toEqual(['familias', 'subfamilias']);
    const familyIds = res.body.familias.map((f: { id: string }) => f.id);
    const subfamilyIds = res.body.subfamilias.map((s: { id: string }) => s.id);
    expect(familyIds).toEqual([hierA.family.id]);
    expect(familyIds).not.toContain(hierB.family.id);
    expect(familyIds).not.toContain(inactiveFamilyA.id);
    expect(subfamilyIds).toEqual([hierA.subfamily.id]);
    expect(subfamilyIds).not.toContain(hierB.subfamily.id);
    expect(
      [...res.body.familias, ...res.body.subfamilias].every(
        (row: { empresaId: string }) => row.empresaId === companyA.id,
      ),
    ).toBe(true);
  });

  // ------------------------------------------------------------------ STORE-03

  it('STORE-03a: POST /tienda/pedidos (Cliente nuevo) → 201, Pedido de A, canal web, RECIBIDO, precio congelado del catálogo, sin descuento de stock', async () => {
    const guestEmail = email('guest-new');
    const before = await counts();

    const res = await request(BASE)
      .post('/tienda/pedidos')
      .send(
        orderBody(
          guestEmail,
          [
            { productoId: productA1.id, cantidad: 2 },
            { productoId: productA2.id, cantidad: 3 },
          ],
          // Client-sent prices/tenant are not part of the DTO: whitelist strips them.
          { empresaId: companyB.id, total: 1, precioUnitario: 1 },
        ),
      )
      .expect(201);

    expect(res.body).toMatchObject({
      empresaId: companyA.id,
      estado: 'RECIBIDO',
      canalOrigen: 'web',
      usuarioId: null,
    });
    expect(Number(res.body.total)).toBe(330); // 2×90.00 + 3×50.00
    expect(res.body.pedidoItems).toHaveLength(2);
    const itemA1 = res.body.pedidoItems.find(
      (i: { productoId: string }) => i.productoId === productA1.id,
    );
    expect(Number(itemA1.precioUnitario)).toBe(90);
    expect(Number(itemA1.cantidad)).toBe(2);
    expect(itemA1.descuentoFidelizacionPorcentaje).toBeNull();
    expect(itemA1.reglaFidelizacionId).toBeNull();

    const customer = await prisma.cliente.findFirst({
      where: { empresaId: companyA.id, email: guestEmail },
    });
    expect(customer).not.toBeNull();
    expect(customer!.id).toBe(res.body.clienteId);
    expect(customer!.passwordHash).toBeNull();
    expect(customer!.googleId).toBeNull();
    expect(customer!.esMayorista).toBe(false);

    const persisted = await prisma.pedido.findUnique({ where: { id: res.body.id } });
    expect(persisted!.empresaId).toBe(companyA.id);

    const after = await counts();
    expect(after.pedidos).toBe(before.pedidos + 1);
    expect(after.clientes).toBe(before.clientes + 1);

    const batch = await prisma.lote.findFirst({ where: { productoId: productA1.id } });
    expect(Number(batch!.cantidad)).toBe(5); // no stock deduction/reservation
  });

  it('STORE-03b: POST /tienda/pedidos con email de un Cliente existente de A → reutiliza el Cliente y SOBRESCRIBE nombre/telefono (AS-IS, deuda técnica, no aprobado)', async () => {
    const existingEmail = email('guest-existing');
    const existing = await prisma.cliente.create({
      data: {
        empresaId: companyA.id,
        nombre: 'Nombre Original',
        email: existingEmail,
        telefono: '111',
      },
      select: { id: true },
    });

    const first = await request(BASE)
      .post('/tienda/pedidos')
      .send(
        orderBody(existingEmail, [{ productoId: productA2.id, cantidad: 1 }], {
          nombre: 'Nombre Pisado',
          telefono: '222',
        }),
      )
      .expect(201);
    expect(first.body.clienteId).toBe(existing.id);
    let row = await prisma.cliente.findUnique({ where: { id: existing.id } });
    expect(row).toMatchObject({ nombre: 'Nombre Pisado', telefono: '222' });

    // telefono omitted → Prisma ignores undefined, so the stored telefono is kept.
    const second = await request(BASE)
      .post('/tienda/pedidos')
      .send(
        orderBody(existingEmail, [{ productoId: productA2.id, cantidad: 1 }], {
          nombre: 'Otro Nombre',
        }),
      )
      .expect(201);
    expect(second.body.clienteId).toBe(existing.id);
    row = await prisma.cliente.findUnique({ where: { id: existing.id } });
    expect(row).toMatchObject({ nombre: 'Otro Nombre', telefono: '222' });
    expect(
      await prisma.cliente.count({ where: { empresaId: companyA.id, email: existingEmail } }),
    ).toBe(1);
  });

  it('STORE-03c: el mismo email en el Business B no se reutiliza ni se modifica — se crea un Cliente propio en A', async () => {
    const sharedEmail = email('shared');
    const clientB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: 'Cliente de B', email: sharedEmail, telefono: '999' },
      select: { id: true },
    });

    const res = await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(sharedEmail, [{ productoId: productA2.id, cantidad: 1 }]))
      .expect(201);

    expect(res.body.clienteId).not.toBe(clientB.id);
    const createdInA = await prisma.cliente.findUnique({ where: { id: res.body.clienteId } });
    expect(createdInA!.empresaId).toBe(companyA.id);
    const untouchedB = await prisma.cliente.findUnique({ where: { id: clientB.id } });
    expect(untouchedB).toMatchObject({
      empresaId: companyB.id,
      nombre: 'Cliente de B',
      telefono: '999',
    });
  });

  it('STORE-03d: fidelización AS-IS — la regla activa de A (NUEVO 10%) se aplica sobre el precio ya descontado; la regla de B (40%) no', async () => {
    await prisma.reglaFidelizacion.update({ where: { id: ruleA.id }, data: { activo: true } });
    await prisma.reglaFidelizacion.update({ where: { id: ruleB.id }, data: { activo: true } });
    try {
      const res = await request(BASE)
        .post('/tienda/pedidos')
        .send(
          orderBody(email('loyalty'), [
            { productoId: productA1.id, cantidad: 2 },
            { productoId: productA2.id, cantidad: 3 },
          ]),
        )
        .expect(201);

      expect(res.body.pedidoItems).toHaveLength(2);
      for (const item of res.body.pedidoItems) {
        expect(Number(item.descuentoFidelizacionPorcentaje)).toBe(10);
        expect(item.reglaFidelizacionId).toBe(ruleA.id);
      }
      const itemA1 = res.body.pedidoItems.find(
        (i: { productoId: string }) => i.productoId === productA1.id,
      );
      expect(Number(itemA1.precioUnitario)).toBe(90); // frozen price excludes loyalty %
      expect(Number(res.body.total)).toBeCloseTo(297, 5); // (2×90 + 3×50) × 0.9
    } finally {
      await prisma.reglaFidelizacion.update({ where: { id: ruleA.id }, data: { activo: false } });
      await prisma.reglaFidelizacion.update({ where: { id: ruleB.id }, data: { activo: false } });
    }
  });

  it('STORE-03e: DTO — email inválido, items vacío o cantidad no positiva → 400 sin crear Pedido ni Cliente', async () => {
    const before = await counts();
    await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody('no-es-email', [{ productoId: productA2.id, cantidad: 1 }]))
      .expect(400);
    await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('dto'), []))
      .expect(400);
    await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('dto'), [{ productoId: productA2.id, cantidad: 0 }]))
      .expect(400);
    expect(await counts()).toEqual(before);
  });

  // ------------------------------------------------------------------ STORE-04

  it('STORE-04a: producto de B en el pedido → 400 "Producto <id> no disponible"; no se crea Pedido ni Cliente', async () => {
    const before = await counts();
    const res = await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('xt-b'), [{ productoId: productB1.id, cantidad: 1 }]));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      statusCode: 400,
      message: `Producto ${productB1.id} no disponible`,
      error: 'Bad Request',
    });
    expect(await counts()).toEqual(before);
    expect(await prisma.cliente.count({ where: { email: email('xt-b') } })).toBe(0);
  });

  it('STORE-04b: pedido mixto (producto de A + producto de B) → 400 completo, sin pedido parcial', async () => {
    const before = await counts();
    const res = await request(BASE)
      .post('/tienda/pedidos')
      .send(
        orderBody(email('xt-mixed'), [
          { productoId: productA1.id, cantidad: 1 },
          { productoId: productB1.id, cantidad: 1 },
        ]),
      );

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`Producto ${productB1.id} no disponible`);
    expect(await counts()).toEqual(before);
  });

  it('STORE-04c: producto inactivo de A y producto inexistente → mismo 400 (indistinguibles del producto de B)', async () => {
    const inactive = await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('xt-inactive'), [{ productoId: productAInactive.id, cantidad: 1 }]));
    expect(inactive.status).toBe(400);
    expect(inactive.body.message).toBe(`Producto ${productAInactive.id} no disponible`);

    const missingId = randomUUID();
    const missing = await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('xt-missing'), [{ productoId: missingId, cantidad: 1 }]));
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe(`Producto ${missingId} no disponible`);
  });

  // ------------------------------------------------------------------ STORE-05

  it('STORE-05a: tracking de un pedido de B → status y body EXACTOS AS-IS (400, "Pedido no encontrado"); idéntico a un id inexistente', async () => {
    const clientB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: 'Tracking B', email: email('tracking-b') },
      select: { id: true },
    });
    const orderB = await prisma.pedido.create({
      data: {
        empresaId: companyB.id,
        clienteId: clientB.id,
        canalOrigen: 'web',
        total: '10',
      },
      select: { id: true },
    });

    const cross = await request(BASE).get(`/tienda/pedidos/${orderB.id}`);
    const missing = await request(BASE).get(`/tienda/pedidos/${randomUUID()}`);

    expect(cross.status).toBe(400); // AS-IS: BadRequestException, not 404 — not an approved contract
    expect(cross.body).toEqual({
      statusCode: 400,
      message: 'Pedido no encontrado',
      error: 'Bad Request',
    });
    expect(missing.status).toBe(cross.status);
    expect(missing.body).toEqual(cross.body);
  });

  it('STORE-05b: tracking de un pedido propio de A sin token → 200 con la forma mínima AS-IS', async () => {
    const created = await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(email('tracking-a'), [{ productoId: productA1.id, cantidad: 1 }]))
      .expect(201);

    const res = await request(BASE).get(`/tienda/pedidos/${created.body.id}`).expect(200);

    expect(Object.keys(res.body).sort()).toEqual(['createdAt', 'estado', 'id', 'items', 'total']);
    expect(res.body).toMatchObject({ id: created.body.id, estado: 'RECIBIDO' });
    expect(res.body.items).toEqual([
      expect.objectContaining({ producto: productA1.nombre, cantidad: '1' }),
    ]);
    expect(Number(res.body.items[0].precioUnitario)).toBe(90);
    expect(res.body).not.toHaveProperty('empresaId');
    expect(res.body).not.toHaveProperty('usuarioId');
  });

  // ------------------------------------------------------------------ STORE-06

  it('STORE-06a: sin TIENDA_EMPRESA_ID, las 4 rutas de Store responden 500 con el mensaje AS-IS (sin fallback ni catálogo de "alguna" empresa)', async () => {
    const before = await counts();
    const expected = {
      statusCode: 500,
      message: 'TIENDA_EMPRESA_ID no configurado: la tienda pública está deshabilitada',
      error: 'Internal Server Error',
    };

    const catalog = await request(BASE_NOENV).get('/tienda/productos');
    const hierarchy = await request(BASE_NOENV).get('/tienda/jerarquia');
    const order = await request(BASE_NOENV)
      .post('/tienda/pedidos')
      .send(orderBody(email('noenv-order'), [{ productoId: productA1.id, cantidad: 1 }]));
    const tracking = await request(BASE_NOENV).get(`/tienda/pedidos/${randomUUID()}`);

    for (const res of [catalog, hierarchy, order, tracking]) {
      expect(res.status).toBe(500);
      expect(res.body).toEqual(expected);
    }
    expect(await counts()).toEqual(before);
  });

  it('STORE-06b: sin TIENDA_EMPRESA_ID, registro y login de Cliente responden 500 genérico (Error plano del controller)', async () => {
    const before = await counts();
    const register = await request(BASE_NOENV)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Sin Env', email: email('noenv-reg'), password: 'password123' });
    const login = await request(BASE_NOENV)
      .post('/auth/cliente/login')
      .send({ email: email('noenv-reg'), password: 'password123' });

    for (const res of [register, login]) {
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    }
    expect(await counts()).toEqual(before);
  });

  // ------------------------------------------------------------------ STORE-07

  it('STORE-07a: POST /auth/cliente/registro → 201, Cliente persistido en el Business de TIENDA_EMPRESA_ID, sesión devuelta', async () => {
    const regEmail = email('reg');
    const res = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Registrado Store', email: regEmail, password: 'password123' })
      .expect(201);

    expect(res.body.cliente).toMatchObject({
      nombre: 'Registrado Store',
      email: regEmail,
      empresaId: companyA.id,
      empresaNombre: companyA.nombre,
      esMayorista: false,
      estadoLegajo: 'APROBADO',
      metodoLogin: 'password',
    });
    expect(typeof res.body.accessToken).toBe('string');

    const row = await prisma.cliente.findUnique({ where: { id: res.body.cliente.id } });
    expect(row).toMatchObject({
      empresaId: companyA.id,
      email: regEmail,
      esMayorista: false,
      estadoLegajo: null,
      googleId: null,
    });
    expect(row!.passwordHash).toEqual(expect.any(String));
    expect(row!.passwordHash).not.toBe('password123');
  });

  it('STORE-07b: email ya registrado en A → 400; email solo existente en B → se registra un Cliente nuevo en A y B queda intacto', async () => {
    const dupEmail = email('reg-dup');
    await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Dup', email: dupEmail, password: 'password123' })
      .expect(201);
    const dup = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Dup 2', email: dupEmail, password: 'password123' });
    expect(dup.status).toBe(400);
    expect(dup.body).toEqual({
      statusCode: 400,
      message: `Ya existe una cuenta con el email ${dupEmail}`,
      error: 'Bad Request',
    });

    const emailB = email('reg-only-b');
    const clientB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: 'Solo B', email: emailB },
      select: { id: true },
    });
    const res = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'En A', email: emailB, password: 'password123' })
      .expect(201);
    expect(res.body.cliente.empresaId).toBe(companyA.id);
    expect(res.body.cliente.id).not.toBe(clientB.id);
    const untouchedB = await prisma.cliente.findUnique({ where: { id: clientB.id } });
    expect(untouchedB).toMatchObject({ empresaId: companyB.id, nombre: 'Solo B' });
    expect(untouchedB!.passwordHash).toBeNull();
  });

  it('STORE-07c: un Cliente creado como invitado por un pedido de Store (sin contraseña) bloquea el registro de ese email — AS-IS, no aprobado', async () => {
    const guestEmail = email('guest-blocks-reg');
    await request(BASE)
      .post('/tienda/pedidos')
      .send(orderBody(guestEmail, [{ productoId: productA2.id, cantidad: 1 }]))
      .expect(201);

    const res = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Intento', email: guestEmail, password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`Ya existe una cuenta con el email ${guestEmail}`);
  });

  it('STORE-07d: DTO de registro — password < 8, email inválido o nombre vacío → 400', async () => {
    const before = await counts();
    await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'X', email: email('reg-short'), password: 'short' })
      .expect(400);
    await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'X', email: 'no-es-email', password: 'password123' })
      .expect(400);
    await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: '', email: email('reg-noname'), password: 'password123' })
      .expect(400);
    expect(await counts()).toEqual(before);
  });

  // ------------------------------------------------------------------ STORE-08

  it('STORE-08a: login → 200 y JWT con los claims AS-IS (type cliente, empresaId, permisos [], rol OWNER placeholder, estadoLegajo APROBADO)', async () => {
    const loginEmail = email('login');
    const registered = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Login Store', email: loginEmail, password: 'password123' })
      .expect(201);

    const res = await request(BASE)
      .post('/auth/cliente/login')
      .send({ email: loginEmail, password: 'password123' })
      .expect(200);

    expect(res.body.cliente).toMatchObject({
      id: registered.body.cliente.id,
      empresaId: companyA.id,
      metodoLogin: 'password',
      estadoLegajo: 'APROBADO',
    });
    const jwt = decodeJwt(res.body.accessToken);
    expect(jwt.validSignature).toBe(true);
    expect(jwt.payload).toMatchObject({
      sub: registered.body.cliente.id,
      email: loginEmail,
      nombre: 'Login Store',
      empresaId: companyA.id,
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'cliente',
      esMayorista: false,
    });
    expect(typeof jwt.payload.exp).toBe('number');
    expect(jwt.payload).not.toHaveProperty('businessId');
    expect(jwt.payload).not.toHaveProperty('membershipId');
  });

  it('STORE-08b: login con credenciales inválidas → 401 "Credenciales inválidas" (password erróneo, email inexistente, Cliente invitado sin password, Cliente de B)', async () => {
    const loginEmail = email('login-bad');
    await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Bad', email: loginEmail, password: 'password123' })
      .expect(201);

    const guestEmail = email('login-guest');
    await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: 'Invitado', email: guestEmail },
    });

    const onlyBEmail = email('login-only-b');
    const bcryptHash = (await prisma.cliente.findFirst({
      where: { empresaId: companyA.id, email: loginEmail },
    }))!.passwordHash;
    await prisma.cliente.create({
      data: {
        empresaId: companyB.id,
        nombre: 'Solo B',
        email: onlyBEmail,
        passwordHash: bcryptHash, // same password as loginEmail → 'password123'
      },
    });

    const attempts = [
      { email: loginEmail, password: 'password-incorrecto' },
      { email: email('login-missing'), password: 'password123' },
      { email: guestEmail, password: 'password123' },
      { email: onlyBEmail, password: 'password123' },
    ];
    for (const attempt of attempts) {
      const res = await request(BASE).post('/auth/cliente/login').send(attempt);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      });
    }
  });

  it('STORE-08c: GET /auth/cliente/me exige token (401 sin token) y con token de cliente devuelve el perfil del Business de A', async () => {
    await request(BASE).get('/auth/cliente/me').expect(401);

    const meEmail = email('me');
    const reg = await request(BASE)
      .post('/auth/cliente/registro')
      .send({ nombre: 'Me Store', email: meEmail, password: 'password123' })
      .expect(201);

    const res = await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: reg.body.cliente.id,
      email: meEmail,
      empresaId: companyA.id,
      empresaNombre: companyA.nombre,
      esMayorista: false,
      metodoLogin: 'password',
    });
  });
});
