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
import { signCustomerToken } from './helpers/customer-token.fixture';

/**
 * P3-2 — customer returns (OR-B4-034), end to end against the real API and database:
 * the team registers a return from a sale (10-day window, quantities still returnable),
 * Owner/Admin authorize it, receive and inspect each product (back on sale → stock returns
 * to the sale's lots; discard → it does not) and refund by the original method (cash leaves
 * the open register; transfer is left for the team to return by hand).
 * OR-B4-035: fixed reasons, cancel, reject after inspection, partial refunds and a notice in
 * the customer's chat at each step.
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
          : ['orders.process_returns']; // Gestor: receives and inspects (OR-B4-035 rule 11)
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
    await prisma.message.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversationAssociation.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversationParticipant.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.conversation.deleteMany({ where: { businessId: { in: companies } } });
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
        items: [
          {
            ventaItemId: cashSale.itemId,
            cantidad: 2,
            motivoCodigo: 'ROTO',
            motivo: 'Envase roto',
          },
        ],
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
      expect.objectContaining({
        producto: product.nombre,
        cantidad: 2,
        monto: '20',
        motivo: 'Roto o dañado: Envase roto',
      }),
    ]);
  });

  it('takes the reason from the fixed list; «Otro» needs a comment', async () => {
    const send = (item: Record<string, unknown>) =>
      request(BASE)
        .post('/devoluciones')
        .set('Authorization', people.vendedor.auth)
        .send({
          ventaId: cashSale.id,
          items: [{ ventaItemId: cashSale.itemId, cantidad: 1, ...item }],
        });
    expect((await send({ motivo: 'Texto libre' })).status).toBe(400);
    expect((await send({ motivoCodigo: 'CUALQUIERA' })).status).toBe(400);
    expect((await send({ motivoCodigo: 'OTRO' })).status).toBe(400);
  });

  it('never lets more come back than what was sold', async () => {
    const res = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 2, motivoCodigo: 'NO_LE_GUSTO' }],
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
        items: [{ ventaItemId: old.itemId, cantidad: 1, motivoCodigo: 'VENCIDO' }],
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('10 días');
  });

  it('asks for the customer when the sale was to consumidor final', async () => {
    const anonymous = await sale(undefined, 'transferencia', 1);
    const body = {
      ventaId: anonymous.id,
      items: [{ ventaItemId: anonymous.itemId, cantidad: 1, motivoCodigo: 'PRODUCTO_EQUIVOCADO' }],
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
        items: [{ ventaItemId: cashSale.itemId, cantidad: 1, motivoCodigo: 'NO_LE_GUSTO' }],
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

  const customerMessages = async () =>
    prisma.message.findMany({
      where: {
        businessId: company.id,
        Conversation: {
          ConversationParticipant: { some: { customerId: customer.id } },
        },
      },
      orderBy: { sequence: 'asc' },
    });

  it('tells the customer each step in their chat, once per step', async () => {
    const messages = await customerMessages();
    const own = messages.filter((m) => m.clientMessageId.startsWith(`devolucion-${returnId}-`));
    expect(own.map((m) => m.content)).toEqual([
      expect.stringContaining('Registramos tu devolución #1'),
      expect.stringContaining('Autorizamos tu devolución #1'),
      expect.stringContaining('Recibimos y revisamos los productos de tu devolución #1'),
      expect.stringContaining('te devolvimos $ 20,00 en efectivo'),
    ]);
    expect(own.every((m) => m.authorUserId === people.owner.userId)).toBe(true);
    expect(new Set(messages.map((m) => m.conversationId)).size).toBe(1);
  });

  let cancelled: string;
  it('cancels, with a reason, before the products are received: nothing moves', async () => {
    const created = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 1, motivoCodigo: 'NO_LE_GUSTO' }],
      })
      .expect(201);
    cancelled = created.body.id;
    const stock = await lotQuantity();
    await request(BASE)
      .put(`/devoluciones/${cancelled}/cancel`)
      .set('Authorization', people.vendedor.auth)
      .send({ motivo: 'El cliente se arrepintió' })
      .expect(403);
    await request(BASE)
      .put(`/devoluciones/${cancelled}/cancel`)
      .set('Authorization', people.owner.auth)
      .send({})
      .expect(400);
    const res = await request(BASE)
      .put(`/devoluciones/${cancelled}/cancel`)
      .set('Authorization', people.owner.auth)
      .send({ motivo: 'El cliente se arrepintió' })
      .expect(200);
    expect(res.body).toMatchObject({
      estado: 'PROCESADA',
      reembolso: {
        estado: 'RECHAZADO',
        monto: '0',
        resultado: 'Cancelada: El cliente se arrepintió',
      },
    });
    expect(await lotQuantity()).toBe(stock);
    expect(await prisma.movimientoCaja.count({ where: { referenciaId: cancelled } })).toBe(0);
    await request(BASE)
      .put(`/devoluciones/${cancelled}/cancel`)
      .set('Authorization', people.owner.auth)
      .send({ motivo: 'otra vez' })
      .expect(409);
    await request(BASE)
      .put(`/devoluciones/${returnId}/cancel`)
      .set('Authorization', people.owner.auth)
      .send({ motivo: 'tarde' })
      .expect(409);
  });

  it('rejects after inspection: no money, the product goes back to the customer', async () => {
    // The cancelled return gave its unit back: it can be returned again.
    const created = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: cashSale.id,
        items: [{ ventaItemId: cashSale.itemId, cantidad: 1, motivoCodigo: 'ROTO' }],
      })
      .expect(201);
    const id = created.body.id;
    await request(BASE)
      .put(`/devoluciones/${id}/reject`)
      .set('Authorization', people.owner.auth)
      .send({ motivo: 'Lo rompió el cliente' })
      .expect(409);
    await request(BASE)
      .put(`/devoluciones/${id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    const stock = await lotQuantity();
    const res = await request(BASE)
      .put(`/devoluciones/${id}/reject`)
      .set('Authorization', people.owner.auth)
      .send({ motivo: 'Lo rompió el cliente' })
      .expect(200);
    expect(res.body).toMatchObject({
      estado: 'PROCESADA',
      reembolso: {
        estado: 'RECHAZADO',
        resultado: 'Rechazada tras inspección: Lo rompió el cliente',
      },
    });
    expect(await lotQuantity()).toBe(stock);
    expect(await prisma.movimientoCaja.count({ where: { referenciaId: id } })).toBe(0);
    const notice = (await customerMessages()).find(
      (m) => m.clientMessageId === `devolucion-${id}-rechazada`,
    );
    expect(notice?.content).toContain('no podemos aceptarla: Lo rompió el cliente');
  });

  it('refunds part of the amount when decided after inspection, never more than due', async () => {
    const transfer = await sale(customer.id, 'transferencia', 2);
    const created = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: transfer.id,
        items: [
          {
            ventaItemId: transfer.itemId,
            cantidad: 2,
            motivoCodigo: 'OTRO',
            motivo: 'Uno abierto',
          },
        ],
      })
      .expect(201);
    const id = created.body.id;
    expect(created.body.motivo).toBe('Otro: Uno abierto');
    await request(BASE)
      .put(`/devoluciones/${id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${id}/receive`)
      .set('Authorization', people.owner.auth)
      .send({ items: [{ itemId: created.body.items[0].id, destino: 'REINGRESO' }] })
      .expect(200);
    const tooMuch = await request(BASE)
      .put(`/devoluciones/${id}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({ amount: 21 });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.message).toContain('como máximo $ 20,00');
    const res = await request(BASE)
      .put(`/devoluciones/${id}/process-refund`)
      .set('Authorization', people.owner.auth)
      .send({ amount: 5 })
      .expect(200);
    expect(res.body.reembolso).toMatchObject({
      estado: 'PENDIENTE_MANUAL',
      monto: '5',
      resultado: 'Devolver en parte por transferencia fuera de Wapsell',
    });
  });

  it('lets the store customer ask for a return from «Mis compras» (OR-B4-035 rule 1)', async () => {
    const slug = `p3-2-a-${suffix}`;
    const auth = `Bearer ${signCustomerToken(customer.id, company.id)}`;
    const bought = await sale(customer.id, 'efectivo', 2);

    const list = await request(BASE)
      .get(`/${slug}/tienda/mis-compras`)
      .set('Authorization', auth)
      .expect(200);
    const mine = list.body.find((s: { id: string }) => s.id === bought.id);
    expect(mine).toMatchObject({ devolvible: true, diasParaDevolver: 10 });
    expect(mine.items[0]).toMatchObject({
      ventaItemId: bought.itemId,
      cantidad: 2,
      disponible: 2,
      precio: '10.00',
    });
    const first = list.body.find((s: { id: string }) => s.id === cashSale.id);
    expect(first.devoluciones.map((r: { numero: number }) => r.numero)).toContain(1);

    const stranger = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Otro cliente',
        email: `p3-2-otro-${suffix}@example.test`,
      },
      select: { id: true },
    });
    const body = { items: [{ ventaItemId: bought.itemId, cantidad: 1, motivoCodigo: 'ROTO' }] };
    await request(BASE)
      .post(`/${slug}/tienda/mis-compras/${bought.id}/devolucion`)
      .set('Authorization', `Bearer ${signCustomerToken(stranger.id, company.id)}`)
      .send(body)
      .expect(404);
    await request(BASE)
      .post(`/p3-2-b-${suffix}/tienda/mis-compras/${bought.id}/devolucion`)
      .set('Authorization', auth)
      .send(body)
      .expect(403);

    const res = await request(BASE)
      .post(`/${slug}/tienda/mis-compras/${bought.id}/devolucion`)
      .set('Authorization', auth)
      .send(body)
      .expect(201);
    expect(res.body).toMatchObject({
      estado: 'SOLICITADA',
      observaciones: 'Pedida por el cliente desde la tienda',
      cliente: { id: customer.id },
      montoReembolsable: '10',
    });
    const after = await request(BASE)
      .get(`/${slug}/tienda/mis-compras`)
      .set('Authorization', auth)
      .expect(200);
    expect(after.body.find((s: { id: string }) => s.id === bought.id).items[0].disponible).toBe(1);
    const notice = (await customerMessages()).find(
      (m) => m.clientMessageId === `devolucion-${res.body.id}-solicitada`,
    );
    expect(notice?.content).toContain('Registramos tu devolución');
    await prisma.cliente.delete({ where: { id: stranger.id } });
  });

  describe('exchange instead of refund (OR-B4-035 rule 2)', () => {
    async function receivedReturn(cantidad: number, destino: 'REINGRESO' | 'DESCARTE') {
      const bought = await sale(customer.id, 'efectivo', cantidad);
      const created = await request(BASE)
        .post('/devoluciones')
        .set('Authorization', people.vendedor.auth)
        .send({
          ventaId: bought.id,
          items: [{ ventaItemId: bought.itemId, cantidad, motivoCodigo: 'NO_LE_GUSTO' }],
        })
        .expect(201);
      const id = created.body.id as string;
      await request(BASE)
        .put(`/devoluciones/${id}/authorize`)
        .set('Authorization', people.owner.auth)
        .send({ condition: 'accepted' })
        .expect(200);
      await request(BASE)
        .put(`/devoluciones/${id}/receive`)
        .set('Authorization', people.owner.auth)
        .send({ items: [{ itemId: created.body.items[0].id, destino }] })
        .expect(200);
      return id;
    }
    const exchange = (id: string, body: Record<string, unknown>, auth = people.owner.auth) =>
      request(BASE).put(`/devoluciones/${id}/exchange`).set('Authorization', auth).send(body);

    beforeAll(async () => {
      await prisma.lote.update({ where: { id: lotId }, data: { cantidad: 50 } });
    });

    it('asks how the difference is paid, without creating anything, and keeps it to Owner/Admin', async () => {
      const id = await receivedReturn(1, 'REINGRESO');
      await exchange(
        id,
        { items: [{ productoId: product.id, cantidad: 3 }] },
        people.vendedor.auth,
      ).expect(403);
      const res = await exchange(id, { items: [{ productoId: product.id, cantidad: 3 }] });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('$ 20,00 más');
      expect(await prisma.venta.count({ where: { idempotencyKey: `cambio-${id}` } })).toBe(0);

      const stock = await lotQuantity();
      const done = await exchange(id, {
        items: [{ productoId: product.id, cantidad: 3 }],
        medio: 'transferencia',
      }).expect(200);
      expect(done.body).toMatchObject({
        estado: 'PROCESADA',
        reembolso: { estado: 'EXITO', metodo: 'cambio', monto: '10' },
        ventaNueva: {
          total: '30.00',
          credito: '10.00',
          diferencia: '20.00',
          resto: '0.00',
          pendiente: '0.00',
        },
      });
      expect(done.body.reembolso.resultado).toContain('el cliente paga $ 20,00 de diferencia');
      const pagos = await prisma.pago.findMany({
        where: { ventaId: done.body.ventaNueva.id },
        orderBy: { monto: 'asc' },
      });
      expect(pagos.map((p) => [p.medio, Number(p.monto)])).toEqual([
        ['cambio', 10],
        ['transferencia', 20],
      ]);
      expect(await lotQuantity()).toBe(stock - 3);
      await exchange(id, { items: [{ productoId: product.id, cantidad: 1 }] }).expect(409);
    });

    it('gives back the rest of the credit when the new products cost less', async () => {
      const id = await receivedReturn(3, 'DESCARTE');
      const done = await exchange(id, { items: [{ productoId: product.id, cantidad: 1 }] }).expect(
        200,
      );
      expect(done.body.ventaNueva).toMatchObject({
        total: '10.00',
        credito: '10.00',
        diferencia: '0.00',
        resto: '20.00',
      });
      expect(done.body.reembolso).toMatchObject({
        estado: 'EXITO',
        metodo: 'efectivo',
        monto: '30',
      });
      const cash = await prisma.movimientoCaja.findFirst({
        where: { referenciaId: id, tipo: 'Devolucion' },
      });
      expect(Number(cash?.monto)).toBe(20);
      const notice = (await customerMessages()).find(
        (m) => m.clientMessageId === `devolucion-${id}-cambio`,
      );
      expect(notice?.content).toContain('la cambiamos por otros productos');
    });
  });

  describe('the Business return window (OR-B4-035 rules 4 and 5)', () => {
    async function oldSale(days: number) {
      const bought = await sale(customer.id, 'efectivo', 1);
      await prisma.venta.update({
        where: { id: bought.id },
        data: { createdAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      });
      return bought;
    }
    const register = (bought: { id: string; itemId: string }, auth: string, extra = {}) =>
      request(BASE)
        .post('/devoluciones')
        .set('Authorization', auth)
        .send({
          ventaId: bought.id,
          items: [{ ventaItemId: bought.itemId, cantidad: 1, motivoCodigo: 'VENCIDO' }],
          ...extra,
        });

    it('lets Owner/Admin change the window, and the new window applies', async () => {
      await request(BASE)
        .get('/devoluciones/ajustes')
        .set('Authorization', people.vendedor.auth)
        .expect(200, { plazoDias: 10, predeterminado: 10 });
      await request(BASE)
        .put('/devoluciones/ajustes')
        .set('Authorization', people.vendedor.auth)
        .send({ plazoDias: 15 })
        .expect(403);
      await request(BASE)
        .put('/devoluciones/ajustes')
        .set('Authorization', people.owner.auth)
        .send({ plazoDias: 0 })
        .expect(400);
      await request(BASE)
        .put('/devoluciones/ajustes')
        .set('Authorization', people.owner.auth)
        .send({ plazoDias: 15 })
        .expect(200, { plazoDias: 15, predeterminado: 10 });
      const bought = await oldSale(12);
      await register(bought, people.vendedor.auth).expect(201);
      await request(BASE)
        .put('/devoluciones/ajustes')
        .set('Authorization', people.owner.auth)
        .send({ plazoDias: 10 })
        .expect(200);
      const again = await oldSale(12);
      const late = await register(again, people.vendedor.auth);
      expect(late.status).toBe(409);
      expect(late.body.message).toContain('Solo el Owner o un administrador');
    });

    it('past the window, Owner/Admin can still register it with a recorded reason', async () => {
      const bought = await oldSale(13);
      const noReason = await register(bought, people.owner.auth);
      expect(noReason.status).toBe(409);
      expect(noReason.body.message).toContain('indicá el motivo');
      const res = await register(bought, people.owner.auth, {
        fuera_de_plazo: 'Cliente frecuente, estuvo de viaje',
      }).expect(201);
      expect(res.body.observaciones).toBe(
        'Fuera de plazo (13 días): Cliente frecuente, estuvo de viaje',
      );
      const audit = await prisma.auditLog.findFirst({
        where: { entidadId: res.body.id, accion: 'CREATE' },
      });
      expect(audit?.valoresPosteriores).toMatchObject({ fueraDePlazo: { dias: 13, plazo: 10 } });
    });
  });

  it('lets the Gestor de stock receive and inspect, never authorize or refund (OR-B4-035 rule 11)', async () => {
    const bought = await sale(customer.id, 'efectivo', 1);
    const created = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: bought.id,
        items: [{ ventaItemId: bought.itemId, cantidad: 1, motivoCodigo: 'ROTO' }],
      })
      .expect(201);
    const id = created.body.id;
    await request(BASE)
      .put(`/devoluciones/${id}/authorize`)
      .set('Authorization', people.gestor.auth)
      .send({ condition: 'accepted' })
      .expect(403);
    await request(BASE)
      .put(`/devoluciones/${id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${id}/receive`)
      .set('Authorization', people.vendedor.auth)
      .send({ items: [{ itemId: created.body.items[0].id, destino: 'REINGRESO' }] })
      .expect(403);
    await request(BASE)
      .put(`/devoluciones/${id}/receive`)
      .set('Authorization', people.gestor.auth)
      .send({
        items: [{ itemId: created.body.items[0].id, destino: 'REINGRESO' }],
        condition_check: 'Revisado por depósito',
      })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${id}/process-refund`)
      .set('Authorization', people.gestor.auth)
      .send({})
      .expect(403);
    await request(BASE)
      .put(`/devoluciones/${id}/exchange`)
      .set('Authorization', people.gestor.auth)
      .send({ items: [{ productoId: product.id, cantidad: 1 }] })
      .expect(403);
  });

  it('refunds a sale paid with several methods by the amounts chosen for each (OR-B4-035 rule 7)', async () => {
    const created = await request(BASE)
      .post('/ventas')
      .set('Authorization', people.owner.auth)
      .send({
        canal: 'presencial',
        clienteId: customer.id,
        items: [{ productoId: product.id, cantidad: 3 }],
      })
      .expect(201);
    for (const [medio, monto] of [
      ['efectivo', 10],
      ['transferencia', 20],
    ] as const) {
      await request(BASE)
        .post(`/ventas/${created.body.id}/pagos`)
        .set('Authorization', people.owner.auth)
        .send({ medio, monto })
        .expect(201);
    }
    const ret = await request(BASE)
      .post('/devoluciones')
      .set('Authorization', people.vendedor.auth)
      .send({
        ventaId: created.body.id,
        items: [
          { ventaItemId: created.body.VentaItem[0].id, cantidad: 3, motivoCodigo: 'VENCIDO' },
        ],
      })
      .expect(201);
    const id = ret.body.id;
    await request(BASE)
      .put(`/devoluciones/${id}/authorize`)
      .set('Authorization', people.owner.auth)
      .send({ condition: 'accepted' })
      .expect(200);
    await request(BASE)
      .put(`/devoluciones/${id}/receive`)
      .set('Authorization', people.owner.auth)
      .send({ items: [{ itemId: ret.body.items[0].id, destino: 'DESCARTE' }] })
      .expect(200);
    const refund = (splits: unknown) =>
      request(BASE)
        .put(`/devoluciones/${id}/process-refund`)
        .set('Authorization', people.owner.auth)
        .send({ splits });

    const tooMuch = await refund([{ metodo: 'transferencia', monto: 25 }]);
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.message).toContain('se pagaron $ 20,00');
    expect((await refund([{ metodo: 'QR', monto: 5 }])).status).toBe(400);

    const res = await refund([
      { metodo: 'efectivo', monto: 10 },
      { metodo: 'transferencia', monto: 20 },
    ]).expect(200);
    expect(res.body).toMatchObject({
      estado: 'PROCESADA',
      reembolso: { estado: 'PENDIENTE_MANUAL', metodo: 'mixto', monto: '30' },
    });
    expect(res.body.reembolso.resultado).toContain(
      '$ 10,00 por efectivo + $ 20,00 por transferencia',
    );
    const cash = await prisma.movimientoCaja.findFirst({
      where: { referenciaId: id, tipo: 'Devolucion' },
    });
    expect(Number(cash?.monto)).toBe(10);
  });
});
