import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteMessagingOf,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';
import { seedUsuarioPermissions } from './helpers/usuario-permissions.fixture';

/**
 * OR-B4-037 — automatic order notices in the customer's chat: received, confirmed and
 * cancelled (with its reason), one message per order and event.
 */
describe('P13-2 — avisos de pedidos en el chat', () => {
  const PORT = '3377';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let owner: { usuarioId: string; auth: string };
  let ownerUserId: string;
  let customer: { id: string };
  let product: { id: string };

  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, company.id)}`;
  const order = async () =>
    (
      await request(BASE)
        .post(`/${company.slug}/tienda/mis-pedidos`)
        .set('Authorization', customerAuth())
        .send({ items: [{ productoId: product.id, cantidad: 1 }] })
        .expect(201)
    ).body.id as string;
  const notices = () =>
    prisma.message.findMany({
      where: { businessId: company.id, clientMessageId: { startsWith: 'pedido-' } },
      orderBy: { sequence: 'asc' },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `P13-2 ${suffix}`, slug: `p13-2-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    const email = `p13-2-owner-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: 'Owner', email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: 'Owner', usuarioId: usuario.id },
      select: { id: true },
    });
    ownerUserId = user.id;
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    await seedUsuarioPermissions(prisma, [usuario.id], ['pedidos.gestionar']);
    owner = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: 'Owner', empresaId: company.id, permisos: ['pedidos.gestionar'] })}`,
    };
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente Avisos',
        email: `p13-2-cliente-${suffix}@example.test`,
      },
      select: { id: true },
    });
    product = await createStoreProduct(prisma, company.id, 'P13-2', 'A', suffix);
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.auditLog.deleteMany({ where: { empresaId: company.id } });
    await deleteMessagingOf(prisma, [company.id]);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({ where: { id: ownerUserId } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: owner.usuarioId } });
    // Orders and stock movements reference the user who took or made them, and those references
    // restrict deletes (ADR-DAT-020): they go first.
    await prisma.pedidoItem.deleteMany({ where: { empresaId: company.id } });
    await prisma.pedido.deleteMany({ where: { empresaId: company.id } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: company.id } });
    await prisma.usuario.deleteMany({ where: { id: owner.usuarioId } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
  });

  it('the order enters the chat as one card with its number; ordering again while open adds to it', async () => {
    const first = await order();
    // OR-B4-053: not confirmed yet, so this goes into the same order (one open order).
    const again = await order();
    expect(again).toBe(first);
    const placed = await prisma.pedido.findUniqueOrThrow({
      where: { id: first },
      include: { PedidoItem: true },
    });
    expect(placed.numero).toBe(1);
    expect(placed.PedidoItem).toHaveLength(1);
    expect(Number(placed.PedidoItem[0].cantidad)).toBe(2);

    const received = await notices();
    expect(received.map((m) => m.clientMessageId)).toEqual([
      `pedido-${first}-recibido`,
      expect.stringMatching(new RegExp(`^pedido-${first}-suma-`)),
    ]);
    expect(received[0].content).toContain('Recibimos tu pedido N° 1');
    expect(received[1].content).toMatch(/^Sumamos 1 producto a tu pedido N° 1\. Total: \$ /);

    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(chat.body.messages.map((m: { content: string }) => m.content)).toEqual(
      received.map((m) => m.content),
    );
    expect(chat.body.messages.every((m: { mine: boolean }) => !m.mine)).toBe(true);
    // Both are system notices; the first carries the live order card.
    expect(chat.body.messages.every((m: { aviso?: boolean }) => m.aviso === true)).toBe(true);
    expect(chat.body.messages[0].adjuntos).toEqual([
      {
        tipo: 'pedido',
        id: expect.any(String),
        pedidoId: first,
        numero: 1,
        estado: 'RECIBIDO',
        total: placed.total.toFixed(2),
        items: [{ producto: expect.any(String), cantidad: 2 }],
      },
    ]);
  });

  it('tells it when the order is confirmed (the card follows), and a later order is a new one — cancelled with the reason, once', async () => {
    const [first] = (await notices()).map((m) =>
      m.clientMessageId.split('-').slice(1, -1).join('-'),
    );
    await request(BASE)
      .patch(`/pedidos/${first}/estado`)
      .set('Authorization', owner.auth)
      .send({ estado: 'CONFIRMADO' })
      .expect(200);
    // Confirmed: ordering again opens a new order, with the next number.
    const second = await order();
    expect(second).not.toBe(first);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: second } })).numero).toBe(2);
    await request(BASE)
      .post(`/pedidos/${second}/cancel`)
      .set('Authorization', owner.auth)
      .send({ motivo: 'Sin stock del sabor pedido' })
      .expect(200);
    // Cancelling again is a no-op, and so is its notice.
    await request(BASE)
      .post(`/pedidos/${second}/cancel`)
      .set('Authorization', owner.auth)
      .send({ motivo: 'Otra vez' })
      .expect(200);
    const all = await notices();
    const confirmed = all.find((m) => m.clientMessageId === `pedido-${first}-CONFIRMADO`);
    const cancelled = all.filter((m) => m.clientMessageId === `pedido-${second}-CANCELADO`);
    expect(confirmed?.content).toMatch(/^Confirmamos tu pedido N° 1 por \$ /);
    // No online payments in this store: no pay link.
    expect(confirmed?.content).not.toContain('pagarlo online');
    expect(all.some((m) => m.clientMessageId === `pedido-${second}-recibido`)).toBe(true);
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].content).toBe(
      'Cancelamos tu pedido N° 2. Motivo: Sin stock del sabor pedido',
    );
    expect(new Set(all.map((m) => m.conversationId)).size).toBe(1);

    // The first card now shows the order confirmed.
    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    const cards = chat.body.messages.flatMap(
      (m: { adjuntos: Array<{ tipo: string; numero: number; estado: string }> }) => m.adjuntos,
    );
    expect(cards.map((c: { numero: number; estado: string }) => [c.numero, c.estado])).toEqual([
      [1, 'CONFIRMADO'],
      [2, 'CANCELADO'],
    ]);
  });

  it('numbers orders placed at the same moment without repeating (one sequence per business)', async () => {
    const others = await Promise.all(
      [1, 2, 3].map((n) =>
        prisma.cliente.create({
          data: {
            empresaId: company.id,
            nombre: `Cliente ${n}`,
            email: `p13-2-otro-${n}-${suffix}@example.test`,
          },
          select: { id: true },
        }),
      ),
    );
    const ids = await Promise.all(
      others.map(
        async (other) =>
          (
            await request(BASE)
              .post(`/${company.slug}/tienda/mis-pedidos`)
              .set('Authorization', `Bearer ${signCustomerToken(other.id, company.id)}`)
              .send({ items: [{ productoId: product.id, cantidad: 1 }] })
              .expect(201)
          ).body.id as string,
      ),
    );
    const numbers = (
      await prisma.pedido.findMany({ where: { id: { in: ids } }, select: { numero: true } })
    ).map((o) => o.numero);
    expect([...numbers].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([3, 4, 5]);
  });
});
