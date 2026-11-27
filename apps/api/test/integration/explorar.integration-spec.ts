import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
} from './helpers/store-catalog.fixture';

/**
 * Marketplace, step 2 (Owner, 2026-11-26) — Wapsell's explorer: only stores that chose to appear
 * (on by default) and have something published; never the internal business; today's offers with
 * the price the store charges; the most ordered stores without their figures. Public.
 * Step 3: the search across stores forgives typos and sees only those same stores.
 */
describe('Explorar — los negocios de Wapsell', () => {
  const PORT = '3403';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  const shops: Record<string, { id: string; slug: string }> = {};
  let offered: { id: string; nombre: string };
  let ofertaId: string;
  let internal: { slug: string } | null = null;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const shop = async (key: string, configuracion: object) => {
      shops[key] = await prisma.empresa.create({
        data: {
          nombre: `Explorar ${key} ${suffix}`,
          slug: `explorar-${key}-${suffix}`,
          configuracion,
        },
        select: { id: true, slug: true },
      });
    };
    await shop('almacen', {
      perfil: { rubro: 'Almacén', ciudad: 'Rosario' },
      negocio: { descripcion: 'De barrio' },
    });
    await shop('oculto', { tienda: { enExplorador: false } });
    await shop('vacio', {});
    offered = await createStoreProduct(prisma, shops.almacen.id, 'Explorar', 'A', suffix);
    const hidden = await createStoreProduct(prisma, shops.oculto.id, 'Explorar', 'B', suffix);
    // Step 3: products named as people search them.
    await prisma.producto.update({
      where: { id: offered.id },
      data: { nombre: `Yerba Explorar ${suffix}`, marca: 'Playadito' },
    });
    offered.nombre = `Yerba Explorar ${suffix}`;
    await prisma.producto.update({
      where: { id: hidden.id },
      data: { nombre: `Yerba Oculta ${suffix}` },
    });
    // The platform's internal business (only one can exist) never shows.
    internal = await prisma.empresa.findFirst({ where: { interno: true }, select: { slug: true } });
    const oferta = await prisma.oferta.create({
      data: {
        empresaId: shops.almacen.id,
        nombre: 'Semana de la yerba',
        tipo: 'PORCENTAJE',
        descuentoPorcentaje: 20,
        desde: new Date(Date.now() - 3600_000),
        hasta: new Date(Date.now() + 86400_000),
      },
    });
    ofertaId = oferta.id;
    await prisma.ofertaProducto.create({
      data: { empresaId: shops.almacen.id, ofertaId: oferta.id, productoId: offered.id },
    });
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.ofertaProducto.deleteMany({ where: { ofertaId } });
    await prisma.oferta.deleteMany({ where: { id: ofertaId } });
    await deleteStoreCompanies(
      prisma,
      Object.values(shops).map((s) => s.id),
    );
    await prisma.$disconnect();
  });

  it('shows only the stores that chose to appear and have something published', async () => {
    const res = await request(BASE).get('/explorar').expect(200);
    expect(res.headers['cache-control']).toContain('max-age=60');
    const slugs = res.body.negocios.map((n: { slug: string }) => n.slug);
    expect(slugs).toContain(shops.almacen.slug);
    expect(slugs).not.toContain(shops.oculto.slug);
    expect(slugs).not.toContain(shops.vacio.slug);
    if (internal) expect(slugs).not.toContain(internal.slug);
    const almacen = res.body.negocios.find((n: { slug: string }) => n.slug === shops.almacen.slug);
    expect(almacen).toMatchObject({
      rubro: 'Almacén',
      ciudad: 'Rosario',
      descripcion: 'De barrio',
      abiertoAhora: null,
      ofertas: 1,
    });
    expect(res.body.rubros).toContain('Almacén');
  });

  it('carries today’s offers with the price the store charges, and never sales figures', async () => {
    const res = await request(BASE).get('/explorar').expect(200);
    const offer = res.body.carruseles.ofertas.find(
      (p: { productoId: string }) => p.productoId === offered.id,
    );
    expect(offer).toMatchObject({
      precio: '8.00',
      precioSinDescuento: '10.00',
      descuentoPorcentaje: 20,
      tienda: { slug: shops.almacen.slug },
    });
    expect(JSON.stringify(res.body)).not.toMatch(
      /"(cantidad|pedidos|vendidos|unidades|stockTotal)"/,
    );
  });

  it('searches every store forgiving typos, and never a hidden store', async () => {
    const res = await request(BASE)
      .get('/explorar/buscar')
      .query({ q: `yerva ${suffix}` })
      .expect(200);
    expect(res.headers['cache-control']).toContain('max-age=60');
    expect(res.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      offered.id,
    ]);
    expect(res.body.productos[0]).toMatchObject({
      nombre: offered.nombre,
      marca: 'Playadito',
      precio: '8.00',
      tienda: { slug: shops.almacen.slug },
    });
    expect(res.body.sugerencia).toBe(`yerba ${suffix}`);
    expect(res.body.facetas.marcas).toEqual([{ nombre: 'Playadito', cantidad: 1 }]);
    expect(JSON.stringify(res.body)).not.toMatch(/"(vendidos|stockTotal|precioCentavos)"/);
    expect(JSON.stringify(res.body)).not.toContain(shops.oculto.slug);
  });

  it('filters by offer and brand, finds stores by place, and suggests while typing', async () => {
    const onOffer = await request(BASE)
      .get('/explorar/buscar')
      .query({ q: String(suffix), oferta: '1', marca: 'playadito' })
      .expect(200);
    expect(onOffer.body.total).toBe(1);
    const stores = await request(BASE)
      .get('/explorar/buscar')
      .query({ q: `rosario ${suffix}` })
      .expect(200);
    expect(stores.body.negocios.map((n: { slug: string }) => n.slug)).toEqual([shops.almacen.slug]);
    const typing = await request(BASE)
      .get('/explorar/sugerencias')
      .query({ q: `Explorar ${suffix}` })
      .expect(200);
    expect(typing.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      offered.id,
    ]);
    expect(typing.body.negocios.map((n: { slug: string }) => n.slug)).toContain(shops.almacen.slug);
  });

  it('rejects a search it does not understand', async () => {
    await request(BASE).get('/explorar/buscar').query({ orden: 'barato' }).expect(400);
    await request(BASE).get('/explorar/buscar').query({ min: '-1' }).expect(400);
  });
});
