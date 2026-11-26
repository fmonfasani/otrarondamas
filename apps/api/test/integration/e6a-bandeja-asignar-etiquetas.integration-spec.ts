import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteMessagingOf, deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * E6a (messaging like WhatsApp Business) — each person's inbox (pin, archive, mute), giving a
 * customer chat to a team member (Owner/Admin), and customer labels (Owner/Admin make them,
 * anyone on the team uses them, the customer never sees them). Real API and PostgreSQL.
 */
describe('E6a — bandeja, asignar chats y etiquetas', () => {
  const PORT = '3399';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let other: { id: string };
  const staff: Record<string, { usuarioId: string; userId: string; auth: string }> = {};
  const customers: Array<{ id: string }> = [];
  const chats: string[] = [];
  let sent = 0;

  const customerAuth = (i = 0) => `Bearer ${signCustomerToken(customers[i].id, company.id)}`;

  async function person(role: 'OWNER' | 'VENDEDOR', key: string) {
    const email = `e6a-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: key, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role, status: 'ACTIVE' },
    });
    staff[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company.id, permisos: [] })}`,
    };
  }

  const inbox = async (who: string) =>
    (
      await request(BASE)
        .get('/messaging/conversations')
        .set('Authorization', staff[who].auth)
        .expect(200)
    ).body as Array<Record<string, any>>;
  const row = async (who: string, id: string) => (await inbox(who)).find((c) => c.id === id);
  const customerSays = (i: number, content: string) =>
    request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth(i))
      .send({ clientMessageId: `c-${i}-${(sent += 1)}`, content })
      .expect(201);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `E6a ${suffix}`, slug: `e6a-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    other = await prisma.empresa.create({
      data: { nombre: `E6a otro ${suffix}`, slug: `e6a-otro-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    await person('OWNER', 'duena');
    await person('VENDEDOR', 'juan');
    await person('VENDEDOR', 'ana');
    for (const i of [0, 1, 2, 3, 4]) {
      customers.push(
        await prisma.cliente.create({
          data: {
            empresaId: company.id,
            nombre: `Cliente ${i}`,
            email: `e6a-c${i}-${suffix}@example.test`,
          },
          select: { id: true },
        }),
      );
    }
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
    for (const i of [0, 1, 2, 3, 4]) {
      chats.push((await customerSays(i, `Hola, soy el cliente ${i}`)).body.conversationId);
    }
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.conversation.updateMany({
      where: { businessId: company.id },
      data: { assignedUserId: null },
    });
    await deleteMessagingOf(prisma, [company.id, other.id]);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    const ids = Object.values(staff).map((s) => s.usuarioId);
    await prisma.user.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await deleteStoreCompanies(prisma, [company.id, other.id]);
    await prisma.$disconnect();
  });

  it('pins up to 3 chats, only in the inbox of whoever pinned them', async () => {
    for (const id of chats.slice(0, 3)) {
      await request(BASE)
        .put(`/messaging/conversations/${id}/fijado`)
        .set('Authorization', staff.duena.auth)
        .expect(200);
    }
    const fourth = await request(BASE)
      .put(`/messaging/conversations/${chats[3]}/fijado`)
      .set('Authorization', staff.duena.auth);
    expect(fourth.status).toBe(409);
    expect(fourth.body.message).toContain('hasta 3');
    expect((await row('duena', chats[0]))?.fijado).toBe(true);
    await request(BASE)
      .delete(`/messaging/conversations/${chats[2]}/fijado`)
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect((await row('duena', chats[2]))?.fijado).toBe(false);
  });

  it('archives a chat until the customer writes again', async () => {
    await request(BASE)
      .put(`/messaging/conversations/${chats[4]}/archivado`)
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect(await row('duena', chats[4])).toMatchObject({ archivado: true, fijado: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await customerSays(4, '¿Siguen ahí?');
    expect((await row('duena', chats[4]))?.archivado).toBe(false);
  });

  it('mutes for 8 hours, a week or always, and unmutes', async () => {
    const eight = await request(BASE)
      .put(`/messaging/conversations/${chats[1]}/silencio`)
      .set('Authorization', staff.duena.auth)
      .send({ por: '8h' })
      .expect(200);
    const hours = (Date.parse(eight.body.silenciadoHasta) - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8);
    await request(BASE)
      .put(`/messaging/conversations/${chats[1]}/silencio`)
      .set('Authorization', staff.duena.auth)
      .send({ por: 'siempre' })
      .expect(200);
    expect((await row('duena', chats[1]))?.silenciadoHasta).toMatch(/^2100/);
    await request(BASE)
      .put(`/messaging/conversations/${chats[1]}/silencio`)
      .set('Authorization', staff.duena.auth)
      .send({ por: '3 años' })
      .expect(400);
    await request(BASE)
      .delete(`/messaging/conversations/${chats[1]}/silencio`)
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect((await row('duena', chats[1]))?.silenciadoHasta).toBeNull();
  });

  it('lets only Owner/Admin give a chat to a seller, who then sees its whole history', async () => {
    await request(BASE)
      .get(`/messaging/conversations/${chats[0]}/messages`)
      .set('Authorization', staff.juan.auth)
      .expect(403);
    await request(BASE)
      .put(`/messaging/conversations/${chats[0]}/asignado`)
      .set('Authorization', staff.juan.auth)
      .send({ userId: staff.juan.userId })
      .expect(403);
    await request(BASE)
      .put(`/messaging/conversations/${chats[0]}/asignado`)
      .set('Authorization', staff.duena.auth)
      .send({ userId: staff.juan.userId })
      .expect(200);
    const history = await request(BASE)
      .get(`/messaging/conversations/${chats[0]}/messages`)
      .set('Authorization', staff.juan.auth)
      .expect(200);
    expect(history.body.map((m: { content: string }) => m.content)).toContain(
      'Hola, soy el cliente 0',
    );
    expect(await row('juan', chats[0])).toMatchObject({
      asignadoA: { userId: staff.juan.userId, nombre: 'juan' },
    });
    expect((await row('duena', chats[0]))?.asignadoA?.nombre).toBe('juan');
  });

  it('moves the chat to another seller: the first one leaves it', async () => {
    await request(BASE)
      .put(`/messaging/conversations/${chats[0]}/asignado`)
      .set('Authorization', staff.duena.auth)
      .send({ userId: staff.ana.userId })
      .expect(200);
    expect(await row('juan', chats[0])).toBeUndefined();
    expect((await row('ana', chats[0]))?.asignadoA?.nombre).toBe('ana');
    // The Owner never leaves: she reads every chat.
    await request(BASE)
      .delete(`/messaging/conversations/${chats[0]}/asignado`)
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect((await row('duena', chats[0]))?.asignadoA).toBeNull();
    // Nobody outside the team.
    await request(BASE)
      .put(`/messaging/conversations/${chats[1]}/asignado`)
      .set('Authorization', staff.duena.auth)
      .send({ userId: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
  });

  it('labels: Owner/Admin make them, anyone on the team uses them, the customer never sees them', async () => {
    await request(BASE)
      .post('/messaging/etiquetas')
      .set('Authorization', staff.juan.auth)
      .send({ nombre: 'VIP', color: 'violeta' })
      .expect(403);
    const vip = (
      await request(BASE)
        .post('/messaging/etiquetas')
        .set('Authorization', staff.duena.auth)
        .send({ nombre: 'VIP', color: 'violeta' })
        .expect(201)
    ).body;
    await request(BASE)
      .post('/messaging/etiquetas')
      .set('Authorization', staff.duena.auth)
      .send({ nombre: ' VIP ', color: 'rojo' })
      .expect(409);
    await request(BASE)
      .post('/messaging/etiquetas')
      .set('Authorization', staff.duena.auth)
      .send({ nombre: 'Rara', color: 'fucsia' })
      .expect(400);
    await request(BASE)
      .put(`/messaging/clientes/${customers[1].id}/etiquetas/${vip.id}`)
      .set('Authorization', staff.juan.auth)
      .expect(200);
    expect((await row('duena', chats[1]))?.etiquetas).toEqual([
      { id: vip.id, nombre: 'VIP', color: 'violeta' },
    ]);
    const customerView = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth(1))
      .expect(200);
    expect(JSON.stringify(customerView.body)).not.toContain('VIP');
    await request(BASE)
      .put(`/messaging/conversations/${chats[1]}/fijado`)
      .set('Authorization', customerAuth(1))
      .expect(403);
    // A customer of another Business cannot be labelled from here.
    const stranger = await prisma.cliente.create({
      data: { empresaId: other.id, nombre: 'Ajeno', email: `e6a-x-${suffix}@example.test` },
      select: { id: true },
    });
    await request(BASE)
      .put(`/messaging/clientes/${stranger.id}/etiquetas/${vip.id}`)
      .set('Authorization', staff.duena.auth)
      .expect(404);
    // Deleting the label takes it off every customer.
    await request(BASE)
      .delete(`/messaging/etiquetas/${vip.id}`)
      .set('Authorization', staff.duena.auth)
      .expect(204);
    expect((await row('duena', chats[1]))?.etiquetas).toEqual([]);
  });
});
