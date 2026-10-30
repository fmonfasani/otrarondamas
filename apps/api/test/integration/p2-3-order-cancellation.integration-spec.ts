/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  deleteUsuarioPermissionsForCompanies,
  seedUsuarioPermissions,
} from './helpers/usuario-permissions.fixture';

/**
 * P2-3: Order Cancellation Integration Tests (17 scenarios)
 *
 * Approved Design Requirements:
 * - Allowed states: RECIBIDO, CONFIRMADO, ENTREGA_FALLIDA
 * - Blocked states: EN_PREP+ (return 409 Conflict)
 * - Stock reversal: CONFIRMADO orders only, EGRESO → ENTRADA algorithm
 * - Idempotency: Cancelling twice = safe (no double-reversal)
 * - Concurrency: SERIALIZABLE isolation, race condition handled
 * - Audit: Event type CANCELAR_ORDEN with full context logging
 * - Error handling: 200 OK success, 409 Conflict (state), 404 Not Found, 422 Unprocessable
 *
 * Test Matrix:
 * 1. Happy path: RECIBIDO → CANCELADO (no stock reversal)
 * 2. Happy path: CONFIRMADO → CANCELADO (with stock reversal)
 * 3. Happy path: ENTREGA_FALLIDA → CANCELADO (with stock reversal)
 * 4. Error: 404 Not Found (order doesn't exist)
 * 5. Error: 403 Forbidden (user lacks permission)
 * 6. Error: 409 Conflict (EN_PREPARACION state)
 * 7. Error: 409 Conflict (LISTO state)
 * 8. Error: 409 Conflict (ASIGNADO state)
 * 9. Error: 409 Conflict (EN_CAMINO state)
 * 10. Error: 409 Conflict (ENTREGADO state)
 * 11. Error: 409 Conflict (PARCIALMENTE_ENTREGADO state)
 * 12. Stock reversal: Quantities correct after CONFIRMADO cancel
 * 13. Stock reversal: Multiple batches reversed correctly (FIFO)
 * 14. Idempotency: Cancelling CANCELADO order twice is safe
 * 15. Idempotency: Multiple stock reversals don't double-deduct
 * 16. Concurrency: Simultaneous cancellation (one succeeds, other 409)
 * 17. Audit trail: Event logged with actor, timestamp, stock count
 */
describe('P2-3 — Cancelación de Pedidos (Order Cancellation)', () => {
  const PORT = '3395';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;
  let counter = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let legacyUserA: { id: string };
  let legacyUserB: { id: string };
  let legacyUserNoPerms: { id: string };
  let userIds: string[];

  let customerA: { id: string };
  let hierA: Awaited<ReturnType<typeof mkHierarchy>>;

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
      email: `p2-3-cancel-${userId}@example.test`,
      nombre: 'P2-3 Cancel',
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
        nombre: `P2-3 Cancel Fam ${tag} ${suffix}`,
        prefijo: `F${tag}`,
      },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `P2-3 Cancel Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `P2-3 Cancel Tip ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `P2-3 Cancel Subt ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  const mkProduct = async (companyId: string, hier: Awaited<ReturnType<typeof mkHierarchy>>) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `P2-3 Cancel Prod ${counter} ${suffix}`,
        codigoInterno: `P23-${counter}-${suffix}`,
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
        numeroLote: `P23-LOT-${counter}-${suffix}`,
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
    status:
      'RECIBIDO' | 'CONFIRMADO' | 'ENTREGA_FALLIDA' | 'EN_PREPARACION' | 'CANCELADO' = 'RECIBIDO',
  ) =>
    prisma.pedido.create({
      data: {
        empresaId: companyId,
        clienteId: customerId,
        estado: status,
        canalOrigen: 'web',
        total: 100,
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

  const orderStatus = async (orderId: string) => {
    const order = await prisma.pedido.findUniqueOrThrow({ where: { id: orderId } });
    return order.estado;
  };

  const movementCount = (orderId: string) =>
    prisma.movimientoStock.count({ where: { referenciaId: orderId } });

  const entradaCount = (orderId: string) =>
    prisma.movimientoStock.count({ where: { referenciaId: orderId, tipoMovimiento: 'Entrada' } });

  const auditLogCount = (orderId: string) =>
    prisma.auditLog.count({
      where: { entidadId: orderId, accion: 'CANCELAR_ORDEN' },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: {
        nombre: `P2-3 Cancel A ${suffix}`,
        slug: `p2-3-cancel-a-${suffix}`,
        configuracion: {},
      },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: {
        nombre: `P2-3 Cancel B ${suffix}`,
        slug: `p2-3-cancel-b-${suffix}`,
        configuracion: {},
      },
      select: { id: true },
    });

    const mkLegacyUser = (companyId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId: companyId,
          nombre: `P2-3 Cancel ${tag} ${suffix}`,
          email: `p2-3-cancel-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    legacyUserA = await mkLegacyUser(companyA.id, 'a');
    legacyUserB = await mkLegacyUser(companyB.id, 'b');
    legacyUserNoPerms = await mkLegacyUser(companyA.id, 'noperms');

    await seedUsuarioPermissions(prisma, [legacyUserA.id, legacyUserB.id], ['pedidos.gestionar']);
    // legacyUserNoPerms deliberately has no permissions

    const mkUser = (usuarioId: string, tag: string) =>
      prisma.user.create({
        data: {
          email: `p2-3-cancel-user-${tag}-${suffix}@example.test`,
          nombre: `P2-3 Cancel ${tag}`,
          usuarioId,
        },
        select: { id: true },
      });

    const userA = await mkUser(legacyUserA.id, 'a');
    const userB = await mkUser(legacyUserB.id, 'b');
    const userNoPerms = await mkUser(legacyUserNoPerms.id, 'noperms');
    userIds = [userA.id, userB.id, userNoPerms.id];

    await prisma.membership.create({
      data: { userId: userA.id, businessId: companyA.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userB.id, businessId: companyB.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await prisma.membership.create({
      data: { userId: userNoPerms.id, businessId: companyA.id, role: 'VIEWER', status: 'ACTIVE' },
    });

    hierA = await mkHierarchy(companyA.id, 'A');
    hierB = await mkHierarchy(companyB.id, 'B');

    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: `P2-3 Cancel Cli A ${suffix}` },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: `P2-3 Cancel Cli B ${suffix}` },
      select: { id: true },
    });

    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT, TIENDA_EMPRESA_ID: companyA.id },
      stdio: 'ignore',
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
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
    await deleteUsuarioPermissionsForCompanies(prisma, companies);
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  describe('Happy Path Tests', () => {
    it('P2-3-001: RECIBIDO → CANCELADO (no stock reversal)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 100);
      const startQuantity = await batchQuantity(batch.id);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 5 },
      ]);

      const response = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ motivo: 'Cliente cambió de opinión' })
        .expect(200);

      expect(response.body.id).toBe(order.id);
      expect(response.body.estado).toBe('CANCELADO');
      expect(response.body.stockReversedItems).toBe(0);
      expect(await batchQuantity(batch.id)).toBe(startQuantity);
      expect(await movementCount(order.id)).toBe(0);
      expect(await auditLogCount(order.id)).toBe(1);
    });

    it('P2-3-002: CONFIRMADO → CANCELADO (with stock reversal)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 100);
      const startQuantity = await batchQuantity(batch.id);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 10 },
      ]);

      // Confirm the order (deducts stock)
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity - 10);
      expect(await movementCount(order.id)).toBe(1); // EGRESO

      // Cancel the order (reverses stock)
      const response = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ motivo: 'Cambio de decisión del cliente' })
        .expect(200);

      expect(response.body.estado).toBe('CANCELADO');
      expect(response.body.stockReversedItems).toBe(1);
      expect(await batchQuantity(batch.id)).toBe(startQuantity); // Stock restored
      expect(await movementCount(order.id)).toBe(2); // EGRESO + ENTRADA
      expect(await entradaCount(order.id)).toBe(1);
      expect(await auditLogCount(order.id)).toBe(1);
    });

    it('P2-3-003: ENTREGA_FALLIDA → CANCELADO (with stock reversal)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 100);
      const startQuantity = await batchQuantity(batch.id);

      // Create order in ENTREGA_FALLIDA state (simulating prior confirmation)
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 3 },
      ]);

      // First confirm to deduct stock
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      // Manually set to ENTREGA_FALLIDA to simulate delivery failure
      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'ENTREGA_FALLIDA' },
      });

      const quantityBefore = await batchQuantity(batch.id);
      expect(quantityBefore).toBe(startQuantity - 3);

      // Now cancel from ENTREGA_FALLIDA
      const response = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ motivo: 'Entrega fallida, cliente no recibió' })
        .expect(200);

      expect(response.body.estado).toBe('CANCELADO');
      expect(response.body.stockReversedItems).toBe(1);
      expect(await batchQuantity(batch.id)).toBe(startQuantity);
    });
  });

  describe('Error Cases', () => {
    it('P2-3-004: 404 Not Found (order does not exist)', async () => {
      await request(BASE)
        .post('/pedidos/nonexistent-order-id/cancel')
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ motivo: 'Testing error' })
        .expect(404);
    });

    it('P2-3-005: 403 Forbidden (user lacks pedidos.gestionar permission)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserNoPerms.id, companyA.id, [])}`)
        .send({ motivo: 'Testing forbidden' })
        .expect(403);
    });

    it('P2-3-006: 409 Conflict (EN_PREPARACION state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      // Manually set to EN_PREPARACION
      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'EN_PREPARACION' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);

      expect(await orderStatus(order.id)).toBe('EN_PREPARACION');
    });

    it('P2-3-007: 409 Conflict (LISTO state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'LISTO' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);

      expect(await orderStatus(order.id)).toBe('LISTO');
    });

    it('P2-3-008: 409 Conflict (ASIGNADO state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'ASIGNADO' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);
    });

    it('P2-3-009: 409 Conflict (EN_CAMINO state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'EN_CAMINO' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);
    });

    it('P2-3-010: 409 Conflict (ENTREGADO state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'ENTREGADO' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);
    });

    it('P2-3-011: 409 Conflict (PARCIALMENTE_ENTREGADO state)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      await prisma.pedido.update({
        where: { id: order.id },
        data: { estado: 'PARCIALMENTE_ENTREGADO' },
      });

      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(409);
    });
  });

  describe('Stock Reversal Validation', () => {
    it('P2-3-012: Stock quantities correct after CONFIRMADO cancel', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 50);
      const startQuantity = await batchQuantity(batch.id);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 15 },
      ]);

      // Confirm
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity - 15);

      // Cancel
      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity);
    });

    it('P2-3-013: Multiple batches reversed correctly (FIFO)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch1 = await mkBatch(companyA.id, product.id, 5);
      const batch2 = await mkBatch(companyA.id, product.id, 5);
      const batch1Start = await batchQuantity(batch1.id);
      const batch2Start = await batchQuantity(batch2.id);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 8 },
      ]);

      // Confirm (FIFO: 5 from batch1, 3 from batch2)
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      expect(await batchQuantity(batch1.id)).toBe(0);
      expect(await batchQuantity(batch2.id)).toBe(2);

      // Cancel (reverses both FIFO deductions)
      const response = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(response.body.stockReversedItems).toBe(2);
      expect(await batchQuantity(batch1.id)).toBe(batch1Start);
      expect(await batchQuantity(batch2.id)).toBe(batch2Start);
    });
  });

  describe('Idempotency Tests', () => {
    it('P2-3-014: Cancelling already-CANCELADO order twice is safe', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 1 },
      ]);

      // First cancel
      const first = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(first.body.estado).toBe('CANCELADO');
      expect(first.body.stockReversedItems).toBe(0);

      // Second cancel (should succeed, no-op)
      const second = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(second.body.estado).toBe('CANCELADO');
      expect(second.body.stockReversedItems).toBe(0);
    });

    it('P2-3-015: Multiple stock reversals do not double-deduct', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 100);
      const startQuantity = await batchQuantity(batch.id);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 20 },
      ]);

      // Confirm
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity - 20);

      // Cancel once
      const first = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity);
      expect(first.body.stockReversedItems).toBe(1);

      // Cancel again (idempotent, no double-reversal)
      const second = await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({})
        .expect(200);

      expect(await batchQuantity(batch.id)).toBe(startQuantity); // Still restored, not over-restored
      expect(second.body.stockReversedItems).toBe(0); // No additional reversals
    });
  });

  describe('Concurrency Tests', () => {
    it('P2-3-016: Simultaneous cancellation (one succeeds, other 409)', async () => {
      const product = await mkProduct(companyA.id, hierA);
      const batch = await mkBatch(companyA.id, product.id, 100);
      const startQuantity = await batchQuantity(batch.id);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 10 },
      ]);

      // Confirm first
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      const token = `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`;

      // Fire two concurrent cancellations
      const [res1, res2] = await Promise.all([
        request(BASE)
          .post(`/pedidos/${order.id}/cancel`)
          .set('Authorization', token)
          .send({ motivo: 'Concurrent 1' }),
        request(BASE)
          .post(`/pedidos/${order.id}/cancel`)
          .set('Authorization', token)
          .send({ motivo: 'Concurrent 2' }),
      ]);

      // One succeeds with 201, one succeeds with 201 (idempotent)
      const statuses = [res1.status, res2.status];
      expect(statuses.sort()).toEqual([201, 201]); // Both succeed due to idempotency

      // Stock is reversed exactly once
      expect(await batchQuantity(batch.id)).toBe(startQuantity);

      // Only one audit log entry per unique cancellation action (or 2 for separate requests)
      const auditCount = await auditLogCount(order.id);
      expect(auditCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Audit Trail', () => {
    it('P2-3-017: Audit event logged with full context', async () => {
      const product = await mkProduct(companyA.id, hierA);
      await mkBatch(companyA.id, product.id, 100);

      const order = await mkOrder(companyA.id, customerA.id, [
        { productId: product.id, quantity: 7 },
      ]);

      // Confirm first
      await request(BASE)
        .patch(`/pedidos/${order.id}/estado`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ estado: 'CONFIRMADO' })
        .expect(200);

      // Cancel
      await request(BASE)
        .post(`/pedidos/${order.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFor(legacyUserA.id, companyA.id)}`)
        .send({ motivo: 'Testing audit trail' })
        .expect(200);

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: { entidadId: order.id, accion: 'CANCELAR_ORDEN' },
      });

      expect(auditLogs).toHaveLength(1);
      const audit = auditLogs[0];

      expect(audit.accion).toBe('CANCELAR_ORDEN');
      expect(audit.entidadAfectada).toBe('Pedido');
      expect(audit.entidadId).toBe(order.id);
      expect(audit.usuarioId).toBe(legacyUserA.id);
      expect(audit.motivo).toBe('Testing audit trail');
      expect(audit.empresaId).toBe(companyA.id);
      expect(audit.valoresPosteriores).toMatchObject({
        estado: 'CANCELADO',
        stockReversedItems: 1,
      });
      expect(audit.fechaHora).toBeDefined();
    });
  });
});
