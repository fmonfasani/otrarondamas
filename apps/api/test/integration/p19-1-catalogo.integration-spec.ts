import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
 * OR-B4-046, stage A — Mercadería and Catálogo. The panel sees every product; the store shows only
 * the published ones, featured first. Only an active product is published and only a published one
 * is featured. Publishing goes one by one or many at once, never touches another Business, and lands
 * in the audit trail. A published product without stock shows «Sin stock» unless the Business hides
 * those. The store (without an account) sells only the Catálogo; a signed-in customer may also order
 * what the Business shared in the chat.
 */
describe('P19-1 — mercadería y catálogo', () => {
  const PORT = '3383';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string; nombre: string };
  let other: { id: string; slug: string; nombre: string };
  const people: Record<string, { usuarioId: string; auth: string }> = {};
  /** Product ids by letter; names sort in letter order («P19-1 Product A …» < «… B …»). */
  const ids: Record<string, string> = {};
  let otherProduct: string;

  async function person(
    companyId: string,
    role: 'OWNER' | 'VENDEDOR' | 'GESTOR_DE_STOCK',
    key: string,
    legacy: string[],
  ) {
    const email = `p19-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: companyId, nombre: `Nombre ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `Nombre ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
    });
    // In `shadow` the legacy assignment decides the route guards.
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
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`,
    };
  }

  const api = (method: 'get' | 'patch' | 'post', path: string, who: string) =>
    request(BASE)[method](path).set('Authorization', people[who].auth);

  const storeIds = async () =>
    (await request(BASE).get(`/${shop.slug}/tienda/productos`).expect(200)).body.map(
      (p: { productoId: string }) => p.productoId,
    );

  const flags = (id: string) =>
    prisma.producto.findUniqueOrThrow({
      where: { id },
      select: { activo: true, publicado: true, destacado: true },
    });

  const auditOf = (id: string) =>
    prisma.auditLog.findMany({
      where: { empresaId: shop.id, entidadId: id },
      orderBy: { fechaHora: 'asc' },
      select: { accion: true, valoresAnteriores: true, valoresPosteriores: true },
    });

  /** Another product in the same category as `of`, with stock and outside the store. */
  async function sibling(of: string, letter: string) {
    const base = await prisma.producto.findUniqueOrThrow({ where: { id: of } });
    const created = await prisma.producto.create({
      data: {
        empresaId: base.empresaId,
        nombre: `P19-1 Product ${letter} ${suffix}`,
        codigoInterno: `P191-${letter}-${suffix}`,
        familiaId: base.familiaId,
        subfamiliaId: base.subfamiliaId,
        tipoId: base.tipoId,
        subtipoId: base.subtipoId,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    await prisma.lote.create({
      data: {
        empresaId: base.empresaId,
        productoId: created.id,
        numeroLote: `L-${letter}-${suffix}`,
        vencimiento: new Date('2099-01-01'),
        cantidad: 5,
      },
    });
    return created.id;
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const company = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P19-1 ${tag} ${suffix}`,
          slug: `p19-1-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true, nombre: true },
      });
    shop = await company('shop');
    other = await company('other');
    await person(shop.id, 'OWNER', 'owner', ['productos.gestionar']);
    await person(shop.id, 'GESTOR_DE_STOCK', 'stock', ['productos.gestionar']);
    await person(shop.id, 'VENDEDOR', 'seller', []);

    // A: published. B: published and featured. C: active, outside the store. D: inactive.
    // E: published, without stock.
    for (const letter of ['A', 'B', 'C', 'D', 'E']) {
      ids[letter] = (await createStoreProduct(prisma, shop.id, 'P19-1', letter, suffix)).id;
    }
    await prisma.producto.update({ where: { id: ids.B }, data: { destacado: true } });
    await prisma.producto.update({ where: { id: ids.C }, data: { publicado: false } });
    await prisma.producto.update({
      where: { id: ids.D },
      data: { activo: false, publicado: false },
    });
    await prisma.lote.deleteMany({ where: { productoId: ids.E } });
    // F and G share a category, both outside the store.
    ids.F = (await createStoreProduct(prisma, shop.id, 'P19-1', 'F', suffix)).id;
    await prisma.producto.update({ where: { id: ids.F }, data: { publicado: false } });
    ids.G = await sibling(ids.F, 'G');
    otherProduct = (await createStoreProduct(prisma, other.id, 'P19-1', 'Z', suffix)).id;

    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
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
  });

  it('the store shows only the Catálogo, featured first; the panel sees every product', async () => {
    const store = await request(BASE).get(`/${shop.slug}/tienda/productos`).expect(200);
    expect(store.body.map((p: { productoId: string }) => p.productoId)).toEqual([
      ids.B,
      ids.A,
      ids.E,
    ]);
    expect(store.body[0]).toMatchObject({ destacado: true, disponible: true });
    expect(store.body[2]).toMatchObject({ productoId: ids.E, disponible: false });

    const panel = await api('get', '/catalogo/productos', 'owner').expect(200);
    const listed = panel.body.map((p: { id: string }) => p.id);
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) expect(listed).toContain(ids[letter]);
  });

  it('a published product without stock shows «Sin stock», unless the Business hides those', async () => {
    const hide = (ocultarSinStock: boolean) =>
      api('patch', '/negocio', 'owner').send({ nombre: shop.nombre, ocultarSinStock }).expect(200);
    const saved = await hide(true);
    expect(saved.body.ocultarSinStock).toBe(true);
    expect(await storeIds()).toEqual([ids.B, ids.A]);
    await hide(false);
    expect(await storeIds()).toEqual([ids.B, ids.A, ids.E]);
  });

  it('publishes one product from the panel, and refuses to publish an inactive one', async () => {
    const res = await api('patch', `/catalogo/productos/${ids.C}`, 'owner')
      .send({ publicado: true })
      .expect(200);
    expect(res.body).toMatchObject({ publicado: true, destacado: false });
    expect((await auditOf(ids.C)).map((a) => a.accion)).toEqual(['PRODUCTO_PUBLICADO']);
    expect(await storeIds()).toContain(ids.C);

    const refused = await api('patch', `/catalogo/productos/${ids.D}`, 'owner').send({
      publicado: true,
    });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe('Un producto inactivo no se publica en la tienda.');
    expect(await flags(ids.D)).toEqual({ activo: false, publicado: false, destacado: false });
  });

  it('deactivating takes the product out of the store; reactivating does not publish it again', async () => {
    await api('patch', `/catalogo/productos/${ids.C}`, 'owner')
      .send({ destacado: true })
      .expect(200);
    await api('patch', `/catalogo/productos/${ids.C}`, 'owner').send({ activo: false }).expect(200);
    expect(await flags(ids.C)).toEqual({ activo: false, publicado: false, destacado: false });
    expect(await storeIds()).not.toContain(ids.C);

    await api('patch', `/catalogo/productos/${ids.C}`, 'owner').send({ activo: true }).expect(200);
    expect(await flags(ids.C)).toEqual({ activo: true, publicado: false, destacado: false });
    const featureHidden = await api('patch', `/catalogo/productos/${ids.C}`, 'owner').send({
      destacado: true,
    });
    expect(featureHidden.status).toBe(400);
  });

  it('keeps the store description, without surrounding blanks', async () => {
    const res = await api('patch', `/catalogo/productos/${ids.A}`, 'owner')
      .send({ descripcion: '  Botella de 750 ml.  ' })
      .expect(200);
    expect(res.body.descripcion).toBe('Botella de 750 ml.');
    const cleared = await api('patch', `/catalogo/productos/${ids.A}`, 'owner')
      .send({ descripcion: '   ' })
      .expect(200);
    expect(cleared.body.descripcion).toBeNull();
  });

  it('publishes many at once: the picked ones, only if active', async () => {
    const res = await api('post', '/catalogo/productos/publicacion', 'owner')
      .send({ ids: [ids.C, ids.D], publicado: true })
      .expect(200);
    expect(res.body).toEqual({ actualizados: 1 });
    expect((await flags(ids.C)).publicado).toBe(true);
    expect((await flags(ids.D)).publicado).toBe(false);
  });

  it('unpublishing many drops the featured mark, and each change is in the audit trail', async () => {
    const res = await api('post', '/catalogo/productos/publicacion', 'owner')
      .send({ ids: [ids.A, ids.B, ids.C], publicado: false })
      .expect(200);
    expect(res.body).toEqual({ actualizados: 3 });
    expect(await flags(ids.B)).toEqual({ activo: true, publicado: false, destacado: false });
    const trail = await auditOf(ids.B);
    expect(trail.at(-1)).toMatchObject({
      accion: 'PRODUCTO_DESPUBLICADO',
      valoresAnteriores: { publicado: true },
      valoresPosteriores: { publicado: false },
    });
    expect(await storeIds()).toEqual([ids.E]);
  });

  it('publishes a whole category at once', async () => {
    const familiaId = (await prisma.producto.findUniqueOrThrow({ where: { id: ids.F } })).familiaId;
    const res = await api('post', '/catalogo/productos/publicacion', 'stock')
      .send({ familiaId, publicado: true })
      .expect(200);
    expect(res.body).toEqual({ actualizados: 2 });
    for (const id of [ids.F, ids.G]) {
      expect((await auditOf(id)).map((a) => a.accion)).toEqual(['PRODUCTO_PUBLICADO']);
    }
    const again = await api('post', '/catalogo/productos/publicacion', 'stock')
      .send({ familiaId, publicado: true })
      .expect(200);
    expect(again.body).toEqual({ actualizados: 0 });
  });

  it('asks for the products or a category, not both and not neither', async () => {
    const familiaId = (await prisma.producto.findUniqueOrThrow({ where: { id: ids.F } })).familiaId;
    for (const body of [{ publicado: true }, { publicado: true, ids: [ids.A], familiaId }]) {
      const res = await api('post', '/catalogo/productos/publicacion', 'owner').send(body);
      expect(res.status).toBe(400);
    }
  });

  it('never touches the products of another Business', async () => {
    const res = await api('post', '/catalogo/productos/publicacion', 'owner')
      .send({ ids: [otherProduct], publicado: false })
      .expect(200);
    expect(res.body).toEqual({ actualizados: 0 });
    expect((await flags(otherProduct)).publicado).toBe(true);
  });

  it('only who manages the Mercadería publishes', async () => {
    await api('post', '/catalogo/productos/publicacion', 'seller')
      .send({ ids: [ids.A], publicado: true })
      .expect(403);
    expect((await flags(ids.A)).publicado).toBe(false);
  });

  it('the store without an account sells only the Catálogo; a signed-in customer can order what the chat shared', async () => {
    // D is inactive; reactivate it outside the store, like a product shared in the chat.
    await prisma.producto.update({ where: { id: ids.D }, data: { activo: true } });
    const anonymous = await request(BASE)
      .post(`/${shop.slug}/tienda/pedidos`)
      .send({
        nombre: 'Visitante',
        email: `p19-1-visitor-${suffix}@example.test`,
        items: [{ productoId: ids.D, cantidad: 1 }],
      });
    expect(anonymous.status).toBe(400);
    expect(anonymous.body.message).toBe(`Producto ${ids.D} no disponible`);

    const account = await request(BASE)
      .post(`/auth/cliente/negocio/${shop.slug}/registro`)
      .send({
        nombre: 'Clienta del chat',
        email: `p19-1-buyer-${suffix}@example.test`,
        password: randomUUID(),
      })
      .expect(201);
    const order = await request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', `Bearer ${account.body.accessToken}`)
      .send({ items: [{ productoId: ids.D, cantidad: 1 }] })
      .expect(201);
    expect(order.body.empresaId).toBe(shop.id);
  });
});
