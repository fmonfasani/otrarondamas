import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
  deleteMessagingOf,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-046 rule 12 — up to 5 photos per product. Checked by their content (JPG, PNG, WebP), kept
 * in order (the first one is the store's), removed with their file, managed only by who manages the
 * Mercadería, never reachable from another Business. The store serves only the photos of published
 * products, with a long public cache; the panel sees every product's photos.
 */
describe('P19-3 — fotos de productos', () => {
  const PORT = '3402';
  const BASE = `http://127.0.0.1:${PORT}`;
  const storage = mkdtempSync(path.join(tmpdir(), 'p19-3-fotos-'));
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let other: { id: string; slug: string };
  const people: Record<string, string> = {};
  let published: string;
  let hidden: string;
  let foreign: string;

  const jpg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(64)]);
  const png = () =>
    Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(64)]);
  const webp = () => Buffer.concat([Buffer.from('RIFF0000WEBPVP8 '), randomBytes(64)]);

  async function person(
    companyId: string,
    role: 'OWNER' | 'VENDEDOR' | 'GESTOR_DE_STOCK',
    key: string,
    legacy: string[],
  ) {
    const email = `p19-3-${key}-${suffix}@example.test`;
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
    for (const nombre of legacy) {
      const permiso = await prisma.permiso.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
        select: { id: true },
      });
      await prisma.usuarioPermiso.create({
        data: { usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] =
      `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`;
  }

  const upload = (who: string, productId: string, file: Buffer, name = 'foto.jpg') =>
    request(BASE)
      .post(`/catalogo/productos/${productId}/fotos`)
      .set('Authorization', people[who])
      .attach('archivo', file, name);
  const panel = (who: string, method: 'get' | 'patch' | 'delete', url: string) =>
    request(BASE)[method](url).set('Authorization', people[who]);
  const ids = async (productId: string) =>
    (await panel('owner', 'get', `/catalogo/productos/${productId}/fotos`).expect(200)).body.map(
      (f: { id: string }) => f.id,
    );
  const filesOf = (companyId: string) =>
    existsSync(path.join(storage, companyId)) ? readdirSync(path.join(storage, companyId)) : [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const company = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P19-3 ${tag} ${suffix}`,
          slug: `p19-3-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    shop = await company('shop');
    other = await company('other');
    await person(shop.id, 'OWNER', 'owner', ['productos.gestionar']);
    await person(shop.id, 'GESTOR_DE_STOCK', 'stock', ['productos.gestionar']);
    await person(shop.id, 'VENDEDOR', 'seller', []);
    await person(other.id, 'OWNER', 'otherOwner', ['productos.gestionar']);
    published = (await createStoreProduct(prisma, shop.id, 'P19-3', 'A', suffix)).id;
    hidden = (await createStoreProduct(prisma, shop.id, 'P19-3', 'B', suffix)).id;
    await prisma.producto.update({ where: { id: hidden }, data: { publicado: false } });
    foreign = (await createStoreProduct(prisma, other.id, 'P19-3', 'Z', suffix)).id;
    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '', CATALOG_STORAGE_DIR: storage });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [shop.id, other.id];
    const usuarioIds = (
      await prisma.usuario.findMany({
        where: { empresaId: { in: companies } },
        select: { id: true },
      })
    ).map((u) => u.id);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, companies);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
    rmSync(storage, { recursive: true, force: true });
  });

  it('adds up to 5 photos in order, checked by their content', async () => {
    const files = [jpg(), png(), webp(), jpg(), jpg()];
    for (const [orden, file] of files.entries()) {
      const res = await upload('owner', published, file).expect(201);
      expect(res.body).toMatchObject({ orden, sizeBytes: file.length });
    }
    expect((await upload('owner', published, jpg()).expect(400)).body.message).toBe(
      'Cada producto lleva hasta 5 fotos.',
    );
    expect(filesOf(shop.id)).toHaveLength(5);
    const pdf = await upload('owner', hidden, Buffer.from('%PDF-1.7 pretending'), 'foto.jpg');
    expect(pdf.status).toBe(400);
    expect(pdf.body.message).toBe('Solo se pueden subir fotos JPG, PNG o WebP.');
  });

  it('serves each photo to the panel with its type', async () => {
    const [first, second] = await ids(published);
    const res = await panel('owner', 'get', `/catalogo/productos/${published}/fotos/${second}`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('private, max-age=86400');
    expect((res.body as Buffer).subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(first).not.toBe(second);
  });

  it('puts a photo first and removes another one together with its file', async () => {
    const before = await ids(published);
    const reordered = await panel('owner', 'patch', `/catalogo/productos/${published}/fotos/orden`)
      .send({ ids: [before[2]] })
      .expect(200);
    expect(reordered.body.map((f: { id: string }) => f.id)).toEqual([
      before[2],
      before[0],
      before[1],
      before[3],
      before[4],
    ]);
    const left = await panel(
      'owner',
      'delete',
      `/catalogo/productos/${published}/fotos/${before[1]}`,
    ).expect(200);
    expect(left.body.map((f: { id: string; orden: number }) => [f.id, f.orden])).toEqual([
      [before[2], 0],
      [before[0], 1],
      [before[3], 2],
      [before[4], 3],
    ]);
    expect(filesOf(shop.id)).toHaveLength(4);
    const trail = await prisma.auditLog.findMany({
      where: { empresaId: shop.id, entidadId: published, accion: 'PRODUCTO_EDITADO' },
      orderBy: { fechaHora: 'desc' },
      select: { valoresAnteriores: true, valoresPosteriores: true },
      take: 1,
    });
    expect(trail[0]).toMatchObject({
      valoresAnteriores: { fotos: 5 },
      valoresPosteriores: { fotos: 4 },
    });
  });

  it('the store shows the first photo in its list and all of them on the product page', async () => {
    const order = await ids(published);
    const list = await request(BASE).get(`/${shop.slug}/tienda/catalogo`).expect(200);
    expect(
      list.body.productos.find((p: { productoId: string }) => p.productoId === published),
    ).toMatchObject({
      foto: order[0],
    });
    const page = await request(BASE).get(`/${shop.slug}/tienda/productos/${published}`).expect(200);
    expect(page.body.fotos).toEqual(order);
    const file = await request(BASE)
      .get(`/${shop.slug}/tienda/productos/${published}/fotos/${order[0]}`)
      .expect(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('never serves the photo of an unpublished product to the store, nor anything of another Business', async () => {
    const own = (await upload('owner', hidden, jpg()).expect(201)).body.id;
    await request(BASE).get(`/${shop.slug}/tienda/productos/${hidden}/fotos/${own}`).expect(404);
    await panel('owner', 'get', `/catalogo/productos/${hidden}/fotos/${own}`).expect(200);
    // Another Business: its owner cannot see, add to or remove this Business's photos.
    const [first] = await ids(published);
    await panel('otherOwner', 'get', `/catalogo/productos/${published}/fotos/${first}`).expect(404);
    await upload('otherOwner', published, jpg()).expect(404);
    await panel('otherOwner', 'delete', `/catalogo/productos/${published}/fotos/${first}`).expect(
      404,
    );
    // A photo id under another product, or another store's slug, finds nothing.
    await request(BASE)
      .get(`/${other.slug}/tienda/productos/${published}/fotos/${first}`)
      .expect(404);
    await panel('owner', 'get', `/catalogo/productos/${foreign}/fotos`).expect(404);
    expect(await ids(published)).toContain(first);
  });

  it('only who manages the Mercadería changes photos; everyone in the team sees them', async () => {
    await upload('seller', hidden, jpg()).expect(403);
    await panel('seller', 'get', `/catalogo/productos/${hidden}/fotos`).expect(200);
    await upload('stock', hidden, png()).expect(201);
  });
});
