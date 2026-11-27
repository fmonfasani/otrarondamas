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
    await createStoreProduct(prisma, shops.oculto.id, 'Explorar', 'B', suffix);
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
});
