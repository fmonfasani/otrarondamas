import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signCustomerToken } from './helpers/customer-token.fixture';
import {
  createStoreProduct,
  deleteMessagingOf,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-054, fase 2b — the customer chooses delivery or pickup when ordering. The delivery fee is
 * computed by the server ($ 2.500 + $ 500 per km or fraction, inside the store's radius) and kept
 * apart from the products. A Wapsell account saves addresses; nobody reaches another's.
 */
describe('Checkout con envío o retiro', () => {
  const PORT = '3409';
  const BASE = `http://127.0.0.1:${PORT}`;
  const DOOR = { lat: -32.946812, lng: -60.639347 };
  const north = (km: number) => ({ lat: DOOR.lat + km / 111.2, lng: DOOR.lng });
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let productId: string;
  const buyers: string[] = [];
  const auth: Record<string, string> = {};

  async function customer(key: string, withAccount: boolean) {
    const email = `checkout-${key}-${suffix}@example.test`;
    const buyer = withAccount
      ? await prisma.comprador.create({ data: { email, nombre: key }, select: { id: true } })
      : null;
    if (buyer) buyers.push(buyer.id);
    const cliente = await prisma.cliente.create({
      data: { empresaId: shop.id, nombre: key, email, compradorId: buyer?.id ?? null },
      select: { id: true },
    });
    auth[key] = `Bearer ${signCustomerToken(cliente.id, shop.id)}`;
  }

  const order = (key: string, entrega?: Record<string, unknown>) =>
    request(BASE)
      .post(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', auth[key])
      .send({ items: [{ productoId: productId, cantidad: 1 }], ...(entrega ? { entrega } : {}) });

  const addresses = (key: string) =>
    request(BASE).get(`/${shop.slug}/tienda/mis-direcciones`).set('Authorization', auth[key]);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    shop = await prisma.empresa.create({
      data: {
        nombre: `Checkout ${suffix}`,
        slug: `checkout-${suffix}`,
        configuracion: {
          ubicacion: {
            ...DOOR,
            zona: false,
            direccion: 'Córdoba 1000',
            confirmadaAt: new Date().toISOString(),
          },
          envios: { envio: true, retiro: true, radioKm: 5, base: 2500, porKm: 500 },
        },
      },
      select: { id: true, slug: true },
    });
    productId = (await createStoreProduct(prisma, shop.id, 'Chk', 'A', suffix)).id;
    await customer('ana', true);
    await customer('beto', true);
    await customer('solo', false);
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.compradorDireccion.deleteMany({ where: { compradorId: { in: buyers } } });
    await deleteMessagingOf(prisma, [shop.id]);
    await deleteStoreCompanies(prisma, [shop.id]);
    await prisma.comprador.deleteMany({ where: { id: { in: buyers } } });
    await prisma.$disconnect();
  });

  it('saves the addresses of a Wapsell account, and only its owner reaches them', async () => {
    expect((await addresses('ana').expect(200)).body).toEqual({
      direcciones: [],
      puedeGuardar: true,
    });
    const home = await request(BASE)
      .post(`/${shop.slug}/tienda/mis-direcciones`)
      .set('Authorization', auth.ana)
      .send({
        etiqueta: ' Casa ',
        direccion: 'Av. Pellegrini 1234, 4° B',
        indicaciones: 'Timbre 4B',
        ...north(2.1),
      })
      .expect(201);
    expect(home.body).toMatchObject({
      etiqueta: 'Casa',
      direccion: 'Av. Pellegrini 1234, 4° B',
      indicaciones: 'Timbre 4B',
    });
    await request(BASE)
      .put(`/${shop.slug}/tienda/mis-direcciones/${home.body.id}`)
      .set('Authorization', auth.ana)
      .send({ etiqueta: 'Casa', direccion: 'Av. Pellegrini 1234, 4° B', ...north(2.1) })
      .expect(200);
    // Another buyer never reaches it.
    await request(BASE)
      .put(`/${shop.slug}/tienda/mis-direcciones/${home.body.id}`)
      .set('Authorization', auth.beto)
      .send({ etiqueta: 'Mía', direccion: 'Otra 1', ...north(1) })
      .expect(404);
    await request(BASE)
      .delete(`/${shop.slug}/tienda/mis-direcciones/${home.body.id}`)
      .set('Authorization', auth.beto)
      .expect(404);
    expect((await addresses('beto').expect(200)).body.direcciones).toEqual([]);
    expect((await addresses('ana').expect(200)).body.direcciones).toHaveLength(1);
    // Outside Argentina, or without an account: no.
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-direcciones`)
      .set('Authorization', auth.ana)
      .send({ etiqueta: 'Madrid', direccion: 'Gran Vía 1', lat: 40.4, lng: -3.7 })
      .expect(400);
    expect((await addresses('solo').expect(200)).body).toEqual({
      direcciones: [],
      puedeGuardar: false,
    });
    await request(BASE)
      .post(`/${shop.slug}/tienda/mis-direcciones`)
      .set('Authorization', auth.solo)
      .send({ etiqueta: 'Casa', direccion: 'Calle 1', ...north(1) })
      .expect(403);
    await request(BASE).get(`/${shop.slug}/tienda/mis-direcciones`).expect(401);
  });

  it('keeps at most 10 addresses per account', async () => {
    const save = (i: number) =>
      request(BASE)
        .post(`/${shop.slug}/tienda/mis-direcciones`)
        .set('Authorization', auth.beto)
        .send({ etiqueta: `Lugar ${i}`, direccion: `Calle ${i}`, ...north(1) });
    for (let i = 0; i < 10; i += 1) await save(i).expect(201); // NOSONAR: one after another, to count
    const eleventh = await save(10).expect(400);
    expect(eleventh.body.message).toContain('hasta 10 direcciones');
  });

  it('charges the delivery the server computes, apart from the products', async () => {
    const placed = await order('ana', {
      tipo: 'ENVIO',
      direccion: 'Av. Pellegrini 1234, 4° B',
      indicaciones: 'Timbre 4B',
      ...north(2.1),
      costoEnvio: 1,
    }).expect(201);
    const saved = await prisma.pedido.findUnique({ where: { id: placed.body.id } });
    expect(saved).toMatchObject({
      tipoEntrega: 'ENVIO',
      direccionEntrega: 'Av. Pellegrini 1234, 4° B',
      indicacionesEntrega: 'Timbre 4B',
      kmEntrega: 2.1,
    });
    expect(Number(saved?.costoEnvio)).toBe(4000);
    const mine = await request(BASE)
      .get(`/${shop.slug}/tienda/mis-pedidos`)
      .set('Authorization', auth.ana)
      .expect(200);
    expect(mine.body[0]).toMatchObject({ tipoEntrega: 'ENVIO', costoEnvio: '4000' });
    expect(Number(mine.body[0].total)).toBe(Number(saved?.total));
  });

  it('keeps the latest choice when the open order grows: pickup costs nothing', async () => {
    const grown = await order('ana', { tipo: 'RETIRO' }).expect(201);
    expect(grown.body.sumado).toBe(true);
    const saved = await prisma.pedido.findUnique({ where: { id: grown.body.id } });
    expect(saved).toMatchObject({ tipoEntrega: 'RETIRO', direccionEntrega: null, kmEntrega: null });
    expect(Number(saved?.costoEnvio)).toBe(0);
  });

  it('says why it cannot deliver, and never places that order', async () => {
    const far = await order('beto', { tipo: 'ENVIO', direccion: 'Lejos 1', ...north(8) }).expect(
      400,
    );
    expect(far.body.message).toBe('Tu dirección está a 8 km y el negocio envía hasta 5 km.');
    await order('beto', { tipo: 'ENVIO', ...north(1) }).expect(400);
    await order('beto', { tipo: 'ENVIO', direccion: 'Madrid 1', lat: 40.4, lng: -3.7 }).expect(400);
    await prisma.empresa.update({
      where: { id: shop.id },
      data: {
        configuracion: {
          ubicacion: {
            ...DOOR,
            zona: false,
            direccion: 'Córdoba 1000',
            confirmadaAt: new Date().toISOString(),
          },
          envios: { envio: true, retiro: false, radioKm: 5, base: 2500, porKm: 500 },
        },
      },
    });
    const noPickup = await order('beto', { tipo: 'RETIRO' }).expect(400);
    expect(noPickup.body.message).toContain('no ofrece retiro');
    const beto = await prisma.cliente.findFirst({ where: { empresaId: shop.id, nombre: 'beto' } });
    expect(await prisma.pedido.count({ where: { clienteId: beto?.id } })).toBe(0);
  });
});
