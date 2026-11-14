import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteMessagingOf, deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * OR-B4-037 — photos and PDFs in the conversation: checked by content, up to 10 MB, stored
 * in the server folder, and served only to whoever may read the conversation.
 */
describe('P13-3 — fotos y PDF en el chat', () => {
  const PORT = '3376';
  const BASE = `http://127.0.0.1:${PORT}`;
  const storage = mkdtempSync(path.join(tmpdir(), 'p13-3-chat-'));
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  const staff: Record<string, { usuarioId: string; userId: string; auth: string }> = {};
  let customer: { id: string };
  let stranger: { id: string };
  let conversationId: string;

  const JPEG = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF fake image body'),
  ]);
  const PDF = Buffer.from('%PDF-1.4\n% fake pdf\n');
  const customerAuth = (id = customer.id) => `Bearer ${signCustomerToken(id, company.id)}`;

  async function person(role: 'OWNER' | 'VENDEDOR', key: string) {
    const email = `p13-3-${key}-${suffix}@example.test`;
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
      data: { nombre: `P13-3 ${suffix}`, slug: `p13-3-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    await person('OWNER', 'owner');
    await person('VENDEDOR', 'vendedor');
    customer = await prisma.cliente.create({
      data: {
        empresaId: company.id,
        nombre: 'Cliente Fotos',
        email: `p13-3-c-${suffix}@example.test`,
      },
      select: { id: true },
    });
    stranger = await prisma.cliente.create({
      data: { empresaId: company.id, nombre: 'Otro', email: `p13-3-o-${suffix}@example.test` },
      select: { id: true },
    });
    server = spawnApi({ PORT, MESSAGING_STORAGE_DIR: storage });
    await waitPort(Number(PORT));
    const chat = await request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'c-1', content: 'Les mando una foto' })
      .expect(201);
    conversationId = chat.body.conversationId;
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await deleteMessagingOf(prisma, [company.id]);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    const usuarioIds = Object.values(staff).map((s) => s.usuarioId);
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
    rmSync(storage, { recursive: true, force: true });
  });

  const upload = (auth: string, file: Buffer, name: string, clientMessageId: string) =>
    request(BASE)
      .post(`/messaging/conversations/${conversationId}/attachments`)
      .set('Authorization', auth)
      .field('clientMessageId', clientMessageId)
      .field('caption', 'Así llega')
      .attach('archivo', file, name);

  it('lets the team send a photo, checked by its content, once per retry key', async () => {
    const res = await upload(staff.owner.auth, JPEG, 'foto de la caja.png', 'f-1').expect(201);
    expect(res.body).toMatchObject({ type: 'IMAGE', content: 'Así llega' });
    expect(res.body.adjuntos).toEqual([
      expect.objectContaining({
        tipo: 'imagen',
        mimeType: 'image/jpeg',
        nombre: 'foto de la caja.jpg',
      }),
    ]);
    const again = await upload(staff.owner.auth, JPEG, 'foto de la caja.png', 'f-1').expect(201);
    expect(again.body.id).toBe(res.body.id);
    expect(readdirSync(path.join(storage, company.id))).toHaveLength(1);
  });

  it('refuses what is not a photo or a PDF, and files over 10 MB', async () => {
    const fake = await upload(
      staff.owner.auth,
      Buffer.from('<script>alert(1)</script>'),
      'foto.jpg',
      'f-2',
    );
    expect(fake.status).toBe(400);
    expect(fake.body.message).toContain('Solo se pueden mandar fotos');
    const big = await upload(
      staff.owner.auth,
      Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024)]),
      'grande.jpg',
      'f-3',
    );
    expect([400, 413]).toContain(big.status);
  });

  it('lets the customer send a PDF and see the team’s photo; serves files with safe headers', async () => {
    const sent = await request(BASE)
      .post(`/${company.slug}/tienda/chat/adjuntos`)
      .set('Authorization', customerAuth())
      .field('clientMessageId', 'c-2')
      .attach('archivo', PDF, 'ticket.pdf')
      .expect(201);
    expect(sent.body.adjuntos[0]).toMatchObject({
      tipo: 'archivo',
      mimeType: 'application/pdf',
      nombre: 'ticket.pdf',
    });

    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    const photo = chat.body.messages
      .flatMap((m: { adjuntos: Array<{ id: string; tipo: string }> }) => m.adjuntos)
      .find((a: { tipo: string }) => a.tipo === 'imagen');
    const file = await request(BASE)
      .get(`/${company.slug}/tienda/chat/adjuntos/${photo.id}`)
      .set('Authorization', customerAuth())
      .expect(200);
    expect(file.headers['content-type']).toContain('image/jpeg');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['content-disposition']).toMatch(/^inline/);

    const pdf = await request(BASE)
      .get(`/messaging/conversations/attachments/${sent.body.adjuntos[0].id}`)
      .set('Authorization', staff.owner.auth)
      .expect(200);
    expect(pdf.headers['content-disposition']).toMatch(/^attachment; filename="ticket.pdf"/);
  });

  it('never serves a file to someone outside the conversation', async () => {
    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    const anyFile = chat.body.messages.flatMap(
      (m: { adjuntos: Array<{ id: string }> }) => m.adjuntos,
    )[0];
    await request(BASE)
      .get(`/${company.slug}/tienda/chat/adjuntos/${anyFile.id}`)
      .set('Authorization', customerAuth(stranger.id))
      .expect(404);
    const res = await request(BASE)
      .get(`/messaging/conversations/attachments/${anyFile.id}`)
      .set('Authorization', staff.vendedor.auth);
    expect([403, 404]).toContain(res.status);
  });
});
