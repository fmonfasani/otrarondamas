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

/**
 * E6b (messaging like WhatsApp Business) — the greeting and the away message (off until the
 * Owner turns them on; the greeting with the first message or after 14 days, the away message
 * when closed, once every 12 h), the store's profile in the customer's chat, and the customer's
 * «+ Productos». Real API and PostgreSQL.
 */
describe('E6b — mensajes automáticos, perfil y productos del cliente', () => {
  const PORT = '3400';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  const staff: Record<string, { usuarioId: string; userId: string; auth: string }> = {};
  let customer: { id: string };
  let product: { id: string; nombre: string };
  let hidden: { id: string };
  let sent = 0;

  // Open one minute a day: closed for the whole test.
  const closedAllDay = Object.fromEntries(
    ['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, [['00:00', '00:01']]]),
  );
  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, company.id)}`;
  const customerSays = (content: string) =>
    request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: `c-${(sent += 1)}`, content })
      .expect(201);
  const chat = async () =>
    (
      await request(BASE)
        .get(`/${company.slug}/tienda/chat`)
        .set('Authorization', customerAuth())
        .expect(200)
    ).body;

  async function person(role: 'OWNER' | 'VENDEDOR', key: string) {
    const email = `e6b-${key}-${suffix}@example.test`;
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

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: {
        nombre: `E6b ${suffix}`,
        slug: `e6b-${suffix}`,
        configuracion: {
          negocio: {
            descripcion: 'Almacén de barrio',
            horario: 'Lun a vie 9 a 13 y 17 a 21',
            direccion: 'Av. Siempreviva 742',
            telefono: '11 5555-0000',
          },
        },
      },
      select: { id: true, slug: true },
    });
    await person('OWNER', 'duena');
    await person('VENDEDOR', 'juan');
    customer = await prisma.cliente.create({
      data: { empresaId: company.id, nombre: 'Martina', email: `e6b-c-${suffix}@example.test` },
      select: { id: true },
    });
    product = await createStoreProduct(prisma, company.id, 'E6b', 'A', suffix);
    hidden = await createStoreProduct(prisma, company.id, 'E6b', 'B', suffix);
    await prisma.producto.update({ where: { id: hidden.id }, data: { publicado: false } });
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await deleteMessagingOf(prisma, [company.id]);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    const ids = Object.values(staff).map((s) => s.usuarioId);
    await prisma.user.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
  });

  it('start turned off: a first message gets no automatic answer', async () => {
    const settings = await request(BASE)
      .get('/messaging/automaticos')
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect(settings.body).toMatchObject({
      bienvenida: { activo: false },
      ausencia: { activo: false },
      puedeEditar: true,
    });
    await customerSays('Hola, ¿están?');
    const body = await chat();
    expect(body.messages.filter((m: { automatico?: boolean }) => m.automatico)).toHaveLength(0);
    // The store's profile and «closed» need hours: without them, the chat does not say.
    expect(body.perfil).toMatchObject({
      descripcion: 'Almacén de barrio',
      direccion: 'Av. Siempreviva 742',
      abiertoAhora: null,
    });
  });

  it('only Owner/Admin turn them on, with valid hours', async () => {
    const value = {
      bienvenida: { activo: true, texto: '¡Hola! Ya te respondemos.' },
      ausencia: { activo: true, texto: 'Ahora estamos cerrados.' },
      horario: closedAllDay,
    };
    await request(BASE)
      .put('/messaging/automaticos')
      .set('Authorization', staff.juan.auth)
      .send(value)
      .expect(403);
    const overlap = await request(BASE)
      .put('/messaging/automaticos')
      .set('Authorization', staff.duena.auth)
      .send({
        ...value,
        horario: {
          '1': [
            ['09:00', '14:00'],
            ['13:00', '18:00'],
          ],
        },
      });
    expect(overlap.status).toBe(400);
    expect(overlap.body.message).toContain('no se pisan');
    await request(BASE)
      .put('/messaging/automaticos')
      .set('Authorization', staff.duena.auth)
      .send(value)
      .expect(200);
  });

  it('closed: the away message answers, once every 12 hours, as the store, marked automatic', async () => {
    // A new customer's first message: greeting and away message.
    await prisma.message.deleteMany({ where: { businessId: company.id } });
    await customerSays('¿Tienen yerba?');
    let body = await chat();
    const autos = body.messages.filter((m: { automatico?: boolean }) => m.automatico);
    expect(autos.map((m: { content: string; mine: boolean }) => [m.content, m.mine])).toEqual([
      ['¡Hola! Ya te respondemos.', false],
      ['Ahora estamos cerrados.', false],
    ]);
    expect(body.perfil.abiertoAhora).toBe(false);
    await customerSays('¿Y mañana abren?');
    body = await chat();
    expect(body.messages.filter((m: { automatico?: boolean }) => m.automatico)).toHaveLength(2);
    // For the team they are not news: the unread count is the customer's two messages.
    const inbox = await request(BASE)
      .get('/messaging/conversations')
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect(inbox.body[0].unreadCount).toBe(2);
    const seen = await request(BASE)
      .get(`/messaging/conversations/${body.conversationId}/messages`)
      .set('Authorization', staff.duena.auth)
      .expect(200);
    expect(seen.body.filter((m: { automatico?: boolean }) => m.automatico)).toHaveLength(2);
  });

  it('«+ Productos»: the customer sends a published product, never a hidden one', async () => {
    const card = await request(BASE)
      .post(`/${company.slug}/tienda/chat/productos`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'p-1', productoId: product.id })
      .expect(201);
    expect(card.body.adjuntos).toEqual([
      expect.objectContaining({ tipo: 'producto', productoId: product.id, nombre: product.nombre }),
    ]);
    await request(BASE)
      .post(`/${company.slug}/tienda/chat/productos`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'p-2', productoId: hidden.id })
      .expect(404);
    const body = await chat();
    const mine = body.messages.find(
      (m: { adjuntos?: Array<{ tipo: string }>; mine: boolean }) =>
        m.mine && m.adjuntos?.some((a) => a.tipo === 'producto'),
    );
    expect(mine).toBeDefined();
  });
});
