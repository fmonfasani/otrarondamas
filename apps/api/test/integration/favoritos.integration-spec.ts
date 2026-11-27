import type { ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * Marketplace, step 3b (Owner, 2026-11-26) — the buyer's ♥ products across stores, and the
 * searches counted for «más buscados». A buyer only reaches their own list, only with a buyer
 * session, only for published products; the counts never leave the API.
 */
describe('Favoritos y más buscados', () => {
  const PORT = '3404';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let product: { id: string; nombre: string };
  let hidden: { id: string };
  const buyers: Record<'ana' | 'beto', { id: string; jwt: string }> = {} as never;

  const login = async (key: 'ana' | 'beto') => {
    const email = `fav-${key}-${suffix}@example.com`;
    const created = await prisma.comprador.create({
      data: {
        email,
        nombre: key,
        passwordHash: await bcrypt.hash('clave-fav-1', 4),
        emailVerificadoAt: new Date(),
      },
    });
    const res = await request(BASE)
      .post('/auth/comprador/login')
      .send({ email, password: 'clave-fav-1' })
      .expect(200);
    buyers[key] = { id: created.id, jwt: res.body.accessToken as string };
  };
  const as = (key: 'ana' | 'beto') => `Bearer ${buyers[key].jwt}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: { nombre: `Favoritos ${suffix}`, slug: `favoritos-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    product = await createStoreProduct(prisma, shop.id, 'Fav', 'A', suffix);
    await prisma.producto.update({
      where: { id: product.id },
      data: { nombre: `Mermelada Favorita ${suffix}` },
    });
    hidden = await createStoreProduct(prisma, shop.id, 'Fav', 'B', suffix);
    await prisma.producto.update({ where: { id: hidden.id }, data: { publicado: false } });
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
    await login('ana');
    await login('beto');
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.compradorFavorito.deleteMany({
      where: { compradorId: { in: Object.values(buyers).map((b) => b.id) } },
    });
    await prisma.comprador.deleteMany({ where: { email: { endsWith: `-${suffix}@example.com` } } });
    await prisma.busquedaDiaria.deleteMany({ where: { termino: { contains: String(suffix) } } });
    await deleteStoreCompanies(prisma, [shop.id]);
    await prisma.$disconnect();
  });

  it('needs a buyer session', async () => {
    await request(BASE).get('/auth/comprador/favoritos').expect(401);
    await request(BASE).put(`/auth/comprador/favoritos/${product.id}`).expect(401);
    await request(BASE)
      .get('/auth/comprador/favoritos')
      .set('Authorization', 'Bearer no-es-un-token')
      .expect(401);
  });

  it('keeps ♥ products per buyer, at the store price, and only published ones', async () => {
    await request(BASE)
      .put(`/auth/comprador/favoritos/${product.id}`)
      .set('Authorization', as('ana'))
      .expect(200, { favorito: true });
    // Twice is still once.
    await request(BASE)
      .put(`/auth/comprador/favoritos/${product.id}`)
      .set('Authorization', as('ana'))
      .expect(200);
    await request(BASE)
      .put(`/auth/comprador/favoritos/${hidden.id}`)
      .set('Authorization', as('ana'))
      .expect(404);
    await request(BASE)
      .put('/auth/comprador/favoritos/no-es-uuid')
      .set('Authorization', as('ana'))
      .expect(400);

    const ids = await request(BASE)
      .get('/auth/comprador/favoritos/ids')
      .set('Authorization', as('ana'))
      .expect(200);
    expect(ids.body).toEqual({ ids: [product.id] });
    const list = await request(BASE)
      .get('/auth/comprador/favoritos')
      .set('Authorization', as('ana'))
      .expect(200);
    expect(list.body.favoritos).toEqual([
      expect.objectContaining({
        productoId: product.id,
        precio: '10.00',
        disponible: true,
        tienda: { nombre: `Favoritos ${suffix}`, slug: shop.slug },
      }),
    ]);

    // Another buyer sees only their own (empty) list and cannot remove Ana's.
    await request(BASE)
      .get('/auth/comprador/favoritos/ids')
      .set('Authorization', as('beto'))
      .expect(200, { ids: [] });
    await request(BASE)
      .delete(`/auth/comprador/favoritos/${product.id}`)
      .set('Authorization', as('beto'))
      .expect(200);
    expect(await prisma.compradorFavorito.count({ where: { compradorId: buyers.ana.id } })).toBe(1);
  });

  it('shows a favorite that can no longer be bought as «no disponible», and removes it', async () => {
    await prisma.producto.update({ where: { id: product.id }, data: { publicado: false } });
    const list = await request(BASE)
      .get('/auth/comprador/favoritos')
      .set('Authorization', as('ana'))
      .expect(200);
    expect(list.body.favoritos[0]).toMatchObject({ disponible: false, precio: null });
    await prisma.producto.update({ where: { id: product.id }, data: { publicado: true } });
    await request(BASE)
      .delete(`/auth/comprador/favoritos/${product.id}`)
      .set('Authorization', as('ana'))
      .expect(200, { favorito: false });
    await request(BASE)
      .get('/auth/comprador/favoritos/ids')
      .set('Authorization', as('ana'))
      .expect(200, { ids: [] });
  });

  it('counts a search that found products for «más buscados», never one that found nothing', async () => {
    await request(BASE)
      .get('/explorar/buscar')
      .query({ q: `Mermelada ${suffix}` })
      .expect(200);
    await request(BASE)
      .get('/explorar/buscar')
      .query({ q: `nada-por-aca ${suffix}` })
      .expect(200);
    // Counted in memory, written once a minute: wait for the write.
    const deadline = Date.now() + 75_000;
    let rows: Array<{ termino: string; veces: number }> = [];
    while (Date.now() < deadline) {
      rows = await prisma.busquedaDiaria.findMany({
        where: { termino: { contains: String(suffix) } },
        select: { termino: true, veces: true },
      });
      if (rows.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    expect(rows).toEqual([{ termino: `mermelada ${suffix}`, veces: 1 }]);
    // The explorer carries the trends without any count.
    const explorer = await request(BASE).get('/explorar').expect(200);
    expect(explorer.body.tendencias).toEqual(
      expect.objectContaining({ terminos: expect.any(Array), productos: expect.any(Array) }),
    );
    expect(JSON.stringify(explorer.body)).not.toMatch(/"(veces|buscados|vendidos)"/);
    // «más buscados» is an order the search accepts.
    await request(BASE).get('/explorar/buscar').query({ orden: 'buscados' }).expect(200);
  }, 90000);
});
