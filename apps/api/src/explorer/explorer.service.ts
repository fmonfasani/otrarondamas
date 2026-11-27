import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { contactOf, storeSettingsOf } from '../negocio/negocio.service';
import { autoRepliesOf, isOpenAt } from '../messaging/auto-replies';
import { StoreCatalogService } from '../store/store-catalog.service';

/** Orders that count for «Más pedidos» (as in the store's best sellers: confirmed on). */
const COUNTED: EstadoPedido[] = [
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'ASIGNADO',
  'EN_CAMINO',
  'ENTREGADO',
  'PARCIALMENTE_ENTREGADO',
];
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
const CACHE_MS = 60_000;
const MAX_BUSINESSES = 200;
const OFFERS_PER_STORE = 6;
const BEST_PER_STORE = 4;
const CAROUSEL = 20;

export type ExplorerStore = {
  nombre: string;
  slug: string;
  rubro: string | null;
  ciudad: string | null;
  provincia: string | null;
  descripcion: string | null;
  abiertoAhora: boolean | null;
  /** The cover: a photo of one of its published products (`productoId`/`fotoId`), if any. */
  portada: { productoId: string; fotoId: string } | null;
  ofertas: number;
};

export type ExplorerProduct = {
  productoId: string;
  nombre: string;
  marca: string | null;
  precio: string;
  precioSinDescuento: string | null;
  descuentoPorcentaje: number | null;
  foto: string | null;
  tienda: { nombre: string; slug: string };
};

/**
 * Marketplace, step 2 (Owner, 2026-11-26) — «Explorar»: every store that chose to appear
 * (Ajustes, on by default), the rubros, and the carousels (today's offers, the most ordered
 * stores, the best sellers, the newest stores). Public and cached a minute.
 *
 * Rankings order by orders and units but never show them (Owner: the competition never sees
 * figures). Prices are the store's own (StoreCatalogService), so the carousel's price is the one
 * the customer pays inside. Platform-wide on purpose (system client, ADR-DAT-019 allowlist).
 */
@Injectable()
export class ExplorerService {
  private cache: { at: number; value: Awaited<ReturnType<ExplorerService['build']>> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: StoreCatalogService,
  ) {}

  async explore(now = Date.now()) {
    if (this.cache && now - this.cache.at < CACHE_MS) return this.cache.value;
    const value = await this.build(new Date(now));
    this.cache = { at: now, value };
    return value;
  }

  private async build(now: Date) {
    const rows = await this.prisma.empresa.findMany({
      where: { interno: false },
      select: { id: true, nombre: true, slug: true, configuracion: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_BUSINESSES,
    });
    const visible = rows.filter((r) => storeSettingsOf(r.configuracion).enExplorador);
    const ids = visible.map((r) => r.id);
    const [published, covers, ordered] = await Promise.all([
      this.prisma.producto.groupBy({
        by: ['empresaId'],
        where: { empresaId: { in: ids }, activo: true, publicado: true },
        _count: { _all: true },
      }),
      this.prisma.productoFoto.findMany({
        where: { empresaId: { in: ids }, orden: 0, Producto: { activo: true, publicado: true } },
        select: {
          empresaId: true,
          productoId: true,
          id: true,
          Producto: { select: { destacado: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.pedido.groupBy({
        by: ['empresaId'],
        where: {
          empresaId: { in: ids },
          estado: { in: COUNTED },
          createdAt: { gte: new Date(now.getTime() - DAYS_30) },
        },
        _count: { _all: true },
      }),
    ]);
    const withProducts = new Set(
      published.filter((p) => p._count._all > 0).map((p) => p.empresaId),
    );
    const coverOf = new Map<string, { productoId: string; fotoId: string; destacado: boolean }>();
    for (const c of covers) {
      const known = coverOf.get(c.empresaId);
      if (!known || (!known.destacado && c.Producto.destacado)) {
        coverOf.set(c.empresaId, {
          productoId: c.productoId,
          fotoId: c.id,
          destacado: c.Producto.destacado,
        });
      }
    }
    const orders = new Map(ordered.map((o) => [o.empresaId, o._count._all]));

    // Only stores with something to show.
    const stores = visible.filter((r) => withProducts.has(r.id));
    const perStore = await Promise.all(
      stores.map(async (r) => {
        const settings = { hideOutOfStock: true };
        const [offers, best] = await Promise.all([
          this.catalog
            .browse(r.id, { enOferta: true, orden: 'destacados', pagina: 1 }, settings)
            .catch(() => null),
          this.catalog.browse(r.id, { orden: 'vendidos', pagina: 1 }, settings).catch(() => null),
        ]);
        return {
          r,
          offers: offers?.productos ?? [],
          total: offers?.total ?? 0,
          best: best?.productos ?? [],
        };
      }),
    );

    const tienda = (r: { nombre: string; slug: string }) => ({ nombre: r.nombre, slug: r.slug });
    const product = (
      p: (typeof perStore)[number]['offers'][number],
      r: { nombre: string; slug: string },
    ): ExplorerProduct => ({
      productoId: p.productoId,
      nombre: p.nombre,
      marca: p.marca ?? null,
      precio: p.precio,
      precioSinDescuento: p.precioSinDescuento,
      descuentoPorcentaje: p.descuentoPorcentaje,
      foto: p.foto,
      tienda: tienda(r),
    });

    const negocios: ExplorerStore[] = perStore.map(({ r, total }) => {
      const perfil = ((r.configuracion ?? {}) as { perfil?: Record<string, unknown> }).perfil ?? {};
      const text = (k: string) =>
        typeof perfil[k] === 'string' && perfil[k] ? (perfil[k] as string) : null;
      const cover = coverOf.get(r.id);
      return {
        nombre: r.nombre,
        slug: r.slug,
        rubro: text('subrubro') ?? text('rubro'),
        ciudad: text('ciudad'),
        provincia: text('provincia'),
        descripcion: contactOf(r.configuracion).descripcion || null,
        abiertoAhora: isOpenAt(autoRepliesOf(r.configuracion).horario, now),
        portada: cover ? { productoId: cover.productoId, fotoId: cover.fotoId } : null,
        ofertas: total,
      };
    });
    const bySlug = new Map(negocios.map((n) => [n.slug, n]));
    const created = new Map(stores.map((r) => [r.slug, r.createdAt.getTime()]));
    const ordersOf = (slug: string) =>
      orders.get(stores.find((s) => s.slug === slug)?.id ?? '') ?? 0;

    // Today's offers: the biggest discounts first, a few per store so one store does not fill it.
    const ofertas = perStore
      .flatMap(({ r, offers }) => offers.slice(0, OFFERS_PER_STORE).map((p) => product(p, r)))
      .sort((a, b) => (b.descuentoPorcentaje ?? 0) - (a.descuentoPorcentaje ?? 0))
      .slice(0, CAROUSEL);
    // Best sellers across stores, interleaved by store (each store's order, never its units).
    const masVendidos = interleave(
      perStore.map(({ r, best }) => best.slice(0, BEST_PER_STORE).map((p) => product(p, r))),
    ).slice(0, CAROUSEL);
    const masPedidos = [...negocios]
      .filter((n) => ordersOf(n.slug) > 0)
      .sort((a, b) => ordersOf(b.slug) - ordersOf(a.slug))
      .slice(0, CAROUSEL)
      .map((n) => n.slug);
    const nuevos = [...negocios]
      .sort((a, b) => (created.get(b.slug) ?? 0) - (created.get(a.slug) ?? 0))
      .slice(0, CAROUSEL)
      .map((n) => n.slug);
    const rubros = [
      ...new Set(negocios.map((n) => n.rubro).filter((x): x is string => Boolean(x))),
    ].sort((a, b) => a.localeCompare(b, 'es'));
    return {
      negocios: [...negocios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      rubros,
      carruseles: {
        ofertas,
        masVendidos,
        masPedidos: masPedidos
          .map((s) => bySlug.get(s))
          .filter((x): x is ExplorerStore => Boolean(x)),
        nuevos: nuevos.map((s) => bySlug.get(s)).filter((x): x is ExplorerStore => Boolean(x)),
      },
      actualizado: now.toISOString(),
    };
  }
}

/** One of each list in turn, so the carousel mixes the stores. */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i += 1) for (const list of lists) if (list[i]) out.push(list[i]);
  return out;
}
