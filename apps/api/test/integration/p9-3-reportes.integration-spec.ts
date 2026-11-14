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
 * Reportes (OR-B4-036) against the real API and database: what the Business sold in a period
 * — counter sales not cancelled + store orders paid or delivered — minus returns, with the
 * ticket, channels, payment methods and products over that same set.
 */
describe('P9-3 — reportes', () => {
  const PORT = '3380';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  let other: { id: string };
  const people: Record<string, { usuarioId: string; auth: string }> = {};
  let customer: { id: string };
  let product: { id: string; nombre: string };
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  async function person(role: 'OWNER' | 'VENDEDOR', companyId: string, key: string) {
    const email = `p9-3-${key}-${suffix}@example.test`;
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
            'metrics.read',
            'orders.authorize_returns',
            'orders.process_returns',
            'payments.process_refunds',
          ]
        : ['ventas.crear', 'ventas.ver'];
    await seedUsuarioPermissions(prisma, [usuario.id], legacy);
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: legacy })}`,
    };
  }

  async function sale(medio: 'efectivo' | 'transferencia', cantidad: number) {
    const created = await request(BASE)
      .post('/ventas')
      .set('Authorization', people.owner.auth)
      .send({
        canal: 'presencial',
        clienteId: customer.id,
        items: [{ productoId: product.id, cantidad }],
      })
      .expect(201);
    await request(BASE)
      .post(`/ventas/${created.body.id}/pagos`)
      .set('Authorization', people.owner.auth)
      .send({ medio, monto: Number(created.body.total) })
      .expect(201);
    return { id: created.body.id as string, itemId: created.body.VentaItem[0].id as string };
  }

  async function order(estado: 'ENTREGADO' | 'RECIBIDO' | 'CANCELADO', cantidad: number) {
    return prisma.pedido.create({
      data: {
        empresaId: company.id,
        clienteId: customer.id,
        canalOrigen: 'messaging',
        estado,
        total: cantidad * 10,
        PedidoItem: { create: [{ productoId: product.id, cantidad, precioUnitario: 10 }] },
      },
    });
  }

  const summary = (auth: string, desde = today, hasta = today) =>
    request(BASE).get(`/reportes/resumen?desde=${desde}&hasta=${hasta}`).set('Authorization', auth);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const newCompany = (tag: string) =>
      prisma.empresa.create({
        data: { nombre: `P9-3 ${tag} ${suffix}`, slug: `p9-3-${tag}-${suffix}`, configuracion: {} },
        select: { id: true },
      });
    company = await newCompany('a');
    other = await newCompany('b');
    await person('OWNER', company.id, 'owner');
    await person('VENDEDOR', company.id, 'vendedor');
    await person('OWNER', other.id, 'otherOwner');
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente reportes',
        email: `p9-3-cliente-${suffix}@example.test`,
      },
      select: { id: true },
    });
    product = await createStoreProduct(prisma, company.id, 'P9-3', 'A', suffix);
    await prisma.lote.updateMany({ where: { productoId: product.id }, data: { cantidad: 100 } });
    const caja = await prisma.caja.create({
      data: { empresaId: company.id, fondoFijo: 0, estado: 'ABIERTA' },
    });
    await prisma.aperturaCaja.create({
      data: { cajaId: caja.id, usuarioId: people.owner.usuarioId, montoInicial: 0 },
    });

    server = spawnApi({ PORT });
    await waitPort(Number(PORT));

    const cash = await sale('efectivo', 3); // 30
    await sale('transferencia', 2); // 20
    const cancelled = await sale('efectivo', 1); // not counted
    await prisma.venta.update({ where: { id: cancelled.id }, data: { estado: 'ANULADA' } });
    const yesterday = await sale('efectivo', 1); // previous period
    await prisma.venta.update({
      where: { id: yesterday.id },
      data: { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await order('ENTREGADO', 5); // 50, counted
    await order('RECIBIDO', 4); // unpaid, not delivered: not counted
    await order('CANCELADO', 2); // not counted

    // A $10 cash return of the first sale.
    const ret = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.owner.auth)
      .send({
        ventaId: cash.id,
        items: [{ ventaItemId: cash.itemId, cantidad: 1, motivoCodigo: 'ROTO' }],
      })
      .expect(201);
    await request(BASE)
      .put(`/devoluciones/${ret.body.id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${ret.body.id}/receive`)
      .set('Authorization', people.owner.auth)
      .send({ items: [{ itemId: ret.body.items[0].id, destino: 'DESCARTE' }] })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${ret.body.id}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(200);
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [company.id, other.id];
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await prisma.message.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversationAssociation.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversationParticipant.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversation.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.reembolso.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.devolucionClienteItem.deleteMany({
      where: { DevolucionCliente: { empresaId: { in: companies } } },
    });
    await prisma.devolucionCliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.pago.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.ventaItem.deleteMany({ where: { Venta: { empresaId: { in: companies } } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.pedidoItem.deleteMany({ where: { Pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.aperturaCaja.deleteMany({ where: { Caja: { empresaId: { in: companies } } } });
    await prisma.caja.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('adds counter sales and paid or delivered store orders, net of returns', async () => {
    const res = await summary(people.owner.auth).expect(200);
    expect(res.body).toMatchObject({
      desde: today,
      hasta: today,
      vendido: 100,
      devoluciones: 10,
      neto: 90,
      operaciones: 3,
      ticketPromedio: 33.33,
      anterior: { neto: 10, operaciones: 1, variacion: 800 },
    });
    expect(res.body.porDia).toEqual([{ dia: today, vendido: 100, devoluciones: 10, neto: 90 }]);
  });

  it('breaks it down by channel, payment method and product over the same set', async () => {
    const res = await summary(people.owner.auth).expect(200);
    expect(res.body.porCanal).toEqual([
      { canal: 'Mostrador', operaciones: 2, vendido: 50 },
      { canal: 'Mensajes', operaciones: 1, vendido: 50 },
    ]);
    expect(res.body.porMedio).toEqual([
      { medio: 'efectivo', monto: 30 },
      { medio: 'transferencia', monto: 20 },
    ]);
    expect(res.body.productos).toEqual([
      { productoId: product.id, nombre: product.nombre, cantidad: 10, vendido: 100 },
    ]);
  });

  it('is for Owner and Admin, takes valid periods, and keeps each Business to itself', async () => {
    await summary(people.vendedor.auth).expect(403);
    await summary(people.owner.auth, '2026-13-01', today).expect(400);
    await summary(people.owner.auth, today, '2020-01-01').expect(400);
    await summary(people.owner.auth, '2020-01-01', today).expect(400);
    const mine = await summary(people.otherOwner.auth).expect(200);
    expect(mine.body).toMatchObject({
      vendido: 0,
      devoluciones: 0,
      neto: 0,
      operaciones: 0,
      ticketPromedio: 0,
    });
  });
});
