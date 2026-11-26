import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteMessagingOf, deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * E5 (messaging like WhatsApp) — voice notes and videos from the team and the customer (Owner,
 * 2026-11-26: videos up to 64 MB), played by pieces (Range); link previews that never visit
 * the inside of the server; and only real files are handed back. Real API and PostgreSQL.
 */
describe('E5 — notas de voz, videos y vista previa de links', () => {
  const PORT = '3398';
  const BASE = `http://127.0.0.1:${PORT}`;
  const storage = mkdtempSync(path.join(tmpdir(), 'e5-chat-'));
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string; slug: string };
  let owner: { usuarioId: string; userId: string; auth: string };
  let customer: { id: string };
  let conversationId: string;

  const WEBM = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x84]),
    Buffer.from('webm'),
    Buffer.alloc(2000, 7),
  ]);
  const MP4 = Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]),
    Buffer.from('ftypisom'),
    Buffer.alloc(200 * 1024, 3),
  ]);
  const JPEG = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF'),
  ]);
  const customerAuth = () => `Bearer ${signCustomerToken(customer.id, company.id)}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `E5 ${suffix}`, slug: `e5-medios-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    const email = `e5-owner-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: 'Dueña', email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: 'Dueña', usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    owner = {
      usuarioId: usuario.id,
      userId: user.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: 'Dueña', empresaId: company.id, permisos: [] })}`,
    };
    customer = await prisma.cliente.create({
      data: { empresaId: company.id, nombre: 'Cliente Voz', email: `e5-c-${suffix}@example.test` },
      select: { id: true },
    });
    server = spawnApi({ PORT, MESSAGING_STORAGE_DIR: storage });
    await waitPort(Number(PORT));
    const chat = await request(BASE)
      .post(`/${company.slug}/tienda/chat/mensajes`)
      .set('Authorization', customerAuth())
      .send({ clientMessageId: 'c-1', content: 'Hola' })
      .expect(201);
    conversationId = chat.body.conversationId;
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await deleteMessagingOf(prisma, [company.id]);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({ where: { id: owner?.userId } });
    await prisma.usuario.deleteMany({ where: { id: owner?.usuarioId } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
    rmSync(storage, { recursive: true, force: true });
  });

  const teamUpload = (
    file: Buffer,
    name: string,
    key: string,
    fields: Record<string, string> = {},
  ) => {
    let call = request(BASE)
      .post(`/messaging/conversations/${conversationId}/attachments`)
      .set('Authorization', owner.auth)
      .field('clientMessageId', key);
    for (const [field, value] of Object.entries(fields)) call = call.field(field, value);
    return call.attach('archivo', file, name);
  };
  const ownerMessages = async () =>
    (
      await request(BASE)
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', owner.auth)
        .expect(200)
    ).body as Array<Record<string, any>>;

  it('takes a voice note from the customer and shows its length to the team', async () => {
    const sent = await request(BASE)
      .post(`/${company.slug}/tienda/chat/adjuntos`)
      .set('Authorization', customerAuth())
      .field('clientMessageId', 'voz-1')
      .field('voz', '1')
      .field('duracion', '7')
      .attach('archivo', WEBM, 'grabacion.webm')
      .expect(201);
    expect(sent.body.adjuntos).toEqual([
      expect.objectContaining({
        tipo: 'audio',
        mimeType: 'audio/webm',
        duracion: 7,
        nombre: 'nota-de-voz.webm',
      }),
    ]);
    const seen = (await ownerMessages()).find((m) => m.adjuntos?.[0]?.tipo === 'audio');
    expect(seen).toMatchObject({ type: 'VOICE' });
    // A voice note is not typed text: the customer cannot edit it.
    const chat = await request(BASE)
      .get(`/${company.slug}/tienda/chat`)
      .set('Authorization', customerAuth())
      .expect(200);
    const mine = chat.body.messages.find(
      (m: Record<string, any>) => m.adjuntos?.[0]?.tipo === 'audio',
    );
    expect(mine.editable).toBeUndefined();
  });

  it('refuses a "voice note" that is not audio, and a duration that is not a number', async () => {
    const photo = await teamUpload(JPEG, 'x.webm', 'voz-2', { voz: '1' });
    expect(photo.status).toBe(400);
    expect(photo.body.message).toContain('nota de voz');
    const odd = await teamUpload(WEBM, 'x.webm', 'voz-3', { voz: '1', duracion: '-5' });
    expect(odd.status).toBe(400);
  });

  it('takes a video from the team and serves it by pieces, inline', async () => {
    const sent = await teamUpload(MP4, 'VID_0001.MP4', 'vid-1').expect(201);
    const video = sent.body.adjuntos[0];
    expect(video).toMatchObject({ tipo: 'video', mimeType: 'video/mp4', nombre: 'VID_0001.mp4' });
    const piece = await request(BASE)
      .get(`/messaging/conversations/attachments/${video.id}`)
      .set('Authorization', owner.auth)
      .set('Range', 'bytes=0-99')
      .expect(206);
    expect(piece.headers['content-range']).toBe(`bytes 0-99/${MP4.length}`);
    expect(piece.headers['content-type']).toBe('video/mp4');
    expect(piece.headers['content-disposition']).toMatch(/^inline/);
    expect(piece.headers['x-content-type-options']).toBe('nosniff');
  });

  it('refuses a video over 64 MB and a photo over 10 MB', async () => {
    const big = await teamUpload(
      Buffer.concat([MP4, Buffer.alloc(64 * 1024 * 1024)]),
      'largo.mp4',
      'vid-2',
    );
    expect([400, 413]).toContain(big.status);
    const photo = await teamUpload(
      Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024)]),
      'f.jpg',
      'f-1',
    );
    expect(photo.status).toBe(400);
    expect(photo.body.message).toContain('10 MB');
  }, 60000);

  it('never visits a link that points inside the server', async () => {
    await request(BASE)
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', owner.auth)
      .send({
        clientMessageId: 'l-1',
        content: `mirá http://localhost:${PORT}/health y http://169.254.169.254/latest/meta-data`,
      })
      .expect(201);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const previews = await prisma.attachment.count({
      where: { businessId: company.id, mimeType: 'application/vnd.wapsell.link+json' },
    });
    expect(previews).toBe(0);
  });

  it('shows a link preview, hands back only its checked photo, and never a card as a file', async () => {
    const message = await prisma.message.findFirstOrThrow({
      where: { businessId: company.id, clientMessageId: 'l-1' },
      select: { id: true },
    });
    mkdirSync(path.join(storage, company.id), { recursive: true });
    writeFileSync(path.join(storage, company.id, 'vista.jpg'), JPEG);
    const withPhoto = await prisma.attachment.create({
      data: {
        businessId: company.id,
        messageId: message.id,
        storageKey: `${company.id}/vista.jpg`,
        filename: 'Remera azul',
        mimeType: 'application/vnd.wapsell.link+json',
        sizeBytes: BigInt(JPEG.length),
        metadata: {
          url: 'https://tienda.test/remera',
          titulo: 'Remera azul',
          descripcion: null,
          sitio: 'tienda.test',
          imagenMime: 'image/jpeg',
        },
      },
    });
    const seen = (await ownerMessages()).find((m) => m.id === message.id);
    expect(seen?.adjuntos).toEqual([
      {
        tipo: 'enlace',
        id: withPhoto.id,
        url: 'https://tienda.test/remera',
        titulo: 'Remera azul',
        descripcion: null,
        sitio: 'tienda.test',
        imagen: true,
      },
    ]);
    const photo = await request(BASE)
      .get(`/messaging/conversations/attachments/${withPhoto.id}`)
      .set('Authorization', owner.auth)
      .expect(200);
    expect(photo.headers['content-type']).toBe('image/jpeg');

    // An order card is data, not a file: nothing to download behind it.
    const card = await prisma.attachment.create({
      data: {
        businessId: company.id,
        messageId: message.id,
        storageKey: `${company.id}/vista.jpg`,
        filename: 'Yerba',
        mimeType: 'application/vnd.wapsell.order+json',
        sizeBytes: BigInt(0),
        metadata: {},
      },
    });
    await request(BASE)
      .get(`/messaging/conversations/attachments/${card.id}`)
      .set('Authorization', owner.auth)
      .expect(404);
  });
});
