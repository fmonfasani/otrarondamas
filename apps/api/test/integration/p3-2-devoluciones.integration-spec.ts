import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';
import { seedUsuarioPermissions } from './helpers/usuario-permissions.fixture';

/**
 * P3-2 — customer returns (OR-B4-034), end to end against the real API and database:
 * the team registers a return from a sale (10-day window, quantities still returnable),
 * Owner/Admin authorize it, receive and inspect each product (back on sale → stock returns
 * to the sale's lots; discard → it does not) and refund by the original method (cash leaves
 * the open register; transfer is left for the team to return by hand).
 */
describe('P3-2 — devoluciones', () => {
  const PORT = '3381';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  let other: { id: string };
  const people: Record<string, { usuarioId: string; userId: string; auth: string }> = {};
  let customer: { id: string };
  let product: { id: string; nombre: string };
  let lotId: string;
  let cashSale: { id: string; itemId: string };
  let returnId: string;

  async function person(
    role: 'OWNER' | 'VENDEDOR' | 'GESTOR_DE_STOCK',
    companyId: string,
    key: string,
  ) {
    const email = `p3-2-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: companyId, nombre: key, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
    });
    const legacy =
      role === 'OWNER'
        ? [
            'ventas.crear',
            'ventas.ver',
            'orders.authorize_returns',
            'orders.process_returns',
            'payments.process_refunds',
            'caja.gastos',
          ]
        : role === 'VENDEDOR'
          ? ['ventas.crear', 'ventas.ver']
          : [];
    await seedUsuarioPermissions(prisma, [usuario.id], legacy);
    people[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: legacy })}`,
    };
  }

  async function sale(
    clienteId: string | undefined,
    medio: 'efectivo' | 'transferencia',
    cantidad: number,
  ) {
    const created = await request(BASE)
      .post('/ventas')
      .set('Authorization', people.owner.auth)
      .send({
        canal: 'presencial',
        items: [{ productoId: product.id, cantidad }],
        ...(clienteId ? { clienteId } : {}),
      })
      .expect(201);
    await request(BASE)
      .post(`/ventas/${created.body.id}/pagos`)
      .set('Authorization', people.owner.auth)
      .send({ medio, monto: Number(created.body.total) })
      .expect(201);
    return { id: created.body.id as string, itemId: created.body.VentaItem[0].id as string };
  }

  const lotQuantity = async () =>
    Number((await prisma.lote.findUnique({ where: { id: lotId } }))?.cantidad);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const newCompany = (tag: string) =>
      prisma.empresa.create({
        data: { nombre: `P3-2 ${tag} ${suffix}`, slug: `p3-2-${tag}-${suffix}`, configuracion: {} },
        select: { id: true },
      });
    company = await newCompany('a');
    other = await newCompany('b');
    await person('OWNER', company.id, 'owner');
    await person('VENDEDOR', company.id, 'vendedor');
    await person('GESTOR_DE_STOCK', company.id, 'gestor');
    await person('OWNER', other.id, 'otherOwner');
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente devolución',
        email: `p3-2-cliente-${suffix}@example.test`,
      },
      select: { id: true },
    });
    product = await createStoreProduct(prisma, company.id, 'P3-2', 'A', suffix);
    await prisma.lote.updateMany({ where: { productoId: product.id }, data: { cantidad: 20 } });
    lotId = (await prisma.lote.findFirstOrThrow({ where: { productoId: product.id } })).id;
    const caja = await prisma.caja.create({
      data: { empresaId: company.id, fondoFijo: 0, estado: 'ABIERTA' },
    });
    await prisma.aperturaCaja.create({
      data: { cajaId: caja.id, usuarioId: people.owner.usuarioId, montoInicial: 1000 },
    });

    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
    cashSale = await sale(customer.id, 'efectivo', 3);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [company.id, other.id];
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await prisma.reembolso.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.devolucionClienteItem.deleteMany({
      where: { DevolucionCliente: { empresaId: { in: companies } } },
    });
    await prisma.devolucionCliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.arqueoCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.movimientoCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.pago.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { Venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.aperturaCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('lets a Vendedor register a return of part of the sale', async () => {
    expect(await lotQuantity()).toBe(17);
    const res = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 2, motivo: 'Envase roto' }],
      })
      .expect(201);
    returnId = res.body.id;
    expect(res.body).toMatchObject({
      estado: 'SOLICITADA',
      numero: 1,
      montoReembolsable: '20',
      cliente: { id: customer.id },
    });
    expect(res.body.items).toEqual([
      expect.objectContaining({ producto: product.nombre, cantidad: 2, monto: '20' }),
    ]);
  });

  it('never lets more come back than what was sold', async () => {
    const res = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 2, motivo: 'Otra' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('como máximo 1');
  });

  it('refuses a sale older than 10 days', async () => {
    const old = await sale(customer.id, 'efectivo', 1);
    await prisma.venta.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
    });
    const res = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: old.id,
        items: [{ ventaItemId: old.itemId, cantidad: 1, motivo: 'Tarde' }],
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('10 días');
  });

  it('asks for the customer when the sale was to consumidor final', async () => {
    const anonymous = await sale(undefined, 'transferencia', 1);
    const body = {
      ventaId: anonymous.id,
      items: [{ ventaItemId: anonymous.itemId, cantidad: 1, motivo: 'No le sirvió' }],
    };
    await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send(body)
      .expect(400);
    const res = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({ ...body, clienteId: customer.id })
      .expect(201);
    expect(res.body.cliente.id).toBe(customer.id);
  });

  it('keeps authorizing, receiving and refunding to Owner and Admin; registering to sellers', async () => {
    await request(BASE)
      .put(`/devoluciones/${returnId}/authorize`)
      .set('Authorization', people.vendedor.auth)
      .send({ condition: 'accepted' })
      .expect(403);
    await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.gestor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 1, motivo: 'x' }],
      })
      .expect(403);
  });

  it('follows the order of the steps', async () => {
    const early = await request(BASE)
      .put(`/devoluciones/${returnId}/receive`)
      .set('Authorization', people.owner.auth)
      .send({ items: [] });
    expect(early.status).toBe(400);
    await request(BASE)
      .put(`/devoluciones/${returnId}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(409);
  });

  it('authorizes, then receives: back on sale returns the units to the sale’s lot', async () => {
    await request(BASE)
      .put(`/devoluciones/${returnId}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    const detail = await request(BASE)
      .get(`/devoluciones/${returnId}`)
      .set('Authorization', people.owner.auth)
      .expect(200);
    const res = await request(BASE)
      .put(`/devoluciones/${returnId}/receive`)
      .set('Authorization', people.owner.auth)
      .send({
        items: [{ itemId: detail.body.items[0].id, destino: 'REINGRESO' }],
        condition_check: 'Producto en buen estado',
      })
      .expect(200);
    expect(res.body.estado).toBe('RECIBIDA');
    expect(res.body.items[0].destino).toBe('Destino: vuelve a la venta');
    expect(await lotQuantity()).toBe(20 - 3 - 1 - 1 + 2); // sold 3 + 1 (old sale) + 1 (anonymous sale), 2 back
    const movement = await prisma.movimientoStock.findFirst({
      where: { referenciaId: returnId, tipoMovimiento: 'Entrada' },
    });
    expect(movement).toMatchObject({ loteId: lotId, motivo: 'Devolución #1' });
    expect(Number(movement?.cantidad)).toBe(2);
  });

  it('refunds cash from the open register and closes the return', async () => {
    const res = await request(BASE)
      .put(`/devoluciones/${returnId}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(200);
    expect(res.body).toMatchObject({
      estado: 'PROCESADA',
      reembolso: { estado: 'EXITO', metodo: 'efectivo', monto: '20' },
    });
    const cash = await prisma.movimientoCaja.findFirst({ where: { referenciaId: returnId } });
    expect(cash).toMatchObject({ tipo: 'Devolucion' });
    expect(Number(cash?.monto)).toBe(20);
    await request(BASE)
      .put(`/devoluciones/${returnId}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(409);
  });

  it('a discarded product does not come back to stock; a transfer refund is left to do by hand', async () => {
    const list = await request(BASE)
      .get('/devoluciones?estado=SOLICITADA')
      .set('Authorization', people.vendedor.auth)
      .expect(200);
    const transfer = list.body.items[0];
    const before = await lotQuantity();
    await request(BASE)
      .put(`/devoluciones/${transfer.id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${transfer.id}/receive`)
      .set('Authorization', people.owner.auth)
      .send({ items: [{ itemId: transfer.items[0].id, destino: 'DESCARTE' }] })
      .expect(200);
    expect(await lotQuantity()).toBe(before);
    const res = await request(BASE)
      .put(`/devoluciones/${transfer.id}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(200);
    expect(res.body.reembolso).toMatchObject({
      estado: 'PENDIENTE_MANUAL',
      metodo: 'transferencia',
    });
    expect(await prisma.movimientoCaja.count({ where: { referenciaId: transfer.id } })).toBe(0);
  });

  it('counts cash refunds and manual cash-outs (Egreso) out of the expected cash', async () => {
    await request(BASE)
      .post('/caja/movimientos')
      .set('Authorization', people.owner.auth)
      .send({ tipo: 'Egreso', monto: 50, descripcion: 'Pago a proveedor en efectivo' })
      .expect(201);
    const res = await request(BASE)
      .post('/caja/arqueo')
      .set('Authorization', people.owner.auth)
      .send({ usuarioEntranteId: people.vendedor.usuarioId, efectivoContado: 970 })
      .expect(201);
    // 1000 opening + 40 cash sales (3 + 1 units at 10) − 20 cash refund − 50 Egreso
    expect(Number(res.body.arqueo.efectivoEsperado)).toBe(970);
    expect(Number(res.body.arqueo.diferencia)).toBe(0);
  });

  it('keeps every Business’s returns to itself', async () => {
    await request(BASE)
      .get(`/devoluciones/${returnId}`)
      .set('Authorization', people.otherOwner.auth)
      .expect(404);
    const res = await request(BASE)
      .get('/devoluciones')
      .set('Authorization', people.otherOwner.auth)
      .expect(200);
    expect(res.body.total).toBe(0);
  });
});
