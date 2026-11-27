import { Injectable } from '@nestjs/common';
import { EstadoPedido } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { contactOf, storeSettingsOf } from '../negocio/negocio.service';
import { locationOf, publicLocation, type PublicLocation } from '../negocio/ubicacion';
import { autoRepliesOf, isOpenAt } from '../messaging/auto-replies';
import { StoreCatalogService } from '../store/store-catalog.service';
import { SearchLogService } from './search-log.service';
import {
  didYouMean,
  queryScore,
  search,
  searchable,
  strictlyFound,
  wordScore,
  plain,
  type SearchParams,
  type SearchRow,
  type Searchable,
} from './explorer-search';

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
const STORES_FOUND = 12;
const SUGGESTED = 6;
/** A word shows in «Lo que más se busca» from this many searches in 30 days. */
const TREND_MIN = 3;
const TREND_WORDS = 8;

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
  /** Step 4: where it is on the map (only the zone when the Owner chose so); null = not set. */
  ubicacion: PublicLocation | null;
};

/** A product in the search index: what the customer sees plus what the search needs. */
type IndexedProduct = SearchRow & ExplorerProduct;
type IndexedStore = { store: ExplorerStore; text: Searchable };

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
  /** The Business of each store shown (never sent out: the explorer speaks in slugs). */
  private idBySlug = new Map<string, string>();
  private index: {
    at: number;
    products: IndexedProduct[];
    stores: IndexedStore[];
    trending: string[];
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: StoreCatalogService,
    private readonly searchLog: SearchLogService,
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
    this.idBySlug = new Map(stores.map((r) => [r.slug, r.id]));
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
        ubicacion: publicLocation(locationOf(r.configuracion)),
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

  /**
   * Marketplace, step 3 — the search index: every product a customer can buy now in the stores
   * the explorer shows, at the store's own price, plus the stores themselves. Cached a minute,
   * like the explorer.
   */
  private async searchIndex(now: number) {
    if (this.index && now - this.index.at < CACHE_MS) return this.index;
    const explorer = await this.explore(now);
    const perStore = await Promise.all(
      explorer.negocios.map(async (store) => {
        const id = this.idBySlug.get(store.slug);
        type Item = Awaited<ReturnType<StoreCatalogService['available']>>[number];
        const items: Item[] = id ? await this.catalog.available(id).catch(() => []) : [];
        return items.map((p): IndexedProduct => ({
          productoId: p.productoId,
          nombre: p.nombre,
          marca: p.marca ?? null,
          precio: p.precio,
          precioSinDescuento: p.precioSinDescuento,
          descuentoPorcentaje: p.descuentoPorcentaje,
          foto: p.foto,
          precioCentavos: p.precioCentavos,
          vendidos: p.vendidos,
          buscados: 0,
          destacado: p.destacado,
          createdAt: p.createdAt,
          enOferta: Boolean(p.enOferta),
          tienda: {
            nombre: store.nombre,
            slug: store.slug,
            rubro: store.rubro,
            abiertoAhora: store.abiertoAhora,
          },
          text: searchable(`${p.nombre} ${p.marca ?? ''}`),
        }));
      }),
    );
    const stores = explorer.negocios.map((store) => ({
      store,
      text: searchable(
        [store.nombre, store.rubro, store.ciudad, store.provincia, store.descripcion]
          .filter(Boolean)
          .join(' '),
      ),
    }));
    const products = perStore.flat();
    // Step 3b: each product adds the searches of the last 30 days that find it.
    const popular = await this.searchLog.popular().catch(() => []);
    const trending: string[] = [];
    for (const { termino, veces } of popular) {
      let found = false;
      for (const p of products) {
        if (strictlyFound(termino, p.text)) {
          p.buscados += veces;
          found = true;
        }
      }
      if (found && veces >= TREND_MIN && trending.length < TREND_WORDS) trending.push(termino);
    }
    this.index = { at: now, products, stores, trending };
    return this.index;
  }

  /** What the customer sees of a product found (never the units sold). */
  private shown(p: IndexedProduct): ExplorerProduct & { abiertoAhora: boolean | null } {
    return {
      productoId: p.productoId,
      nombre: p.nombre,
      marca: p.marca,
      precio: p.precio,
      precioSinDescuento: p.precioSinDescuento,
      descuentoPorcentaje: p.descuentoPorcentaje,
      foto: p.foto,
      tienda: { nombre: p.tienda.nombre, slug: p.tienda.slug },
      abiertoAhora: p.tienda.abiertoAhora,
    };
  }

  /** Stores whose name, rubro, place or description has the words, closest first. */
  private storesFound(stores: IndexedStore[], params: SearchParams, limit: number) {
    return stores
      .filter(
        ({ store }) =>
          (!params.rubro || store.rubro === params.rubro) &&
          (!params.abierto || store.abiertoAhora === true),
      )
      .map((s) => ({ s, score: params.q ? queryScore(params.q, s.text) : 1 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.s.store.nombre.localeCompare(b.s.store.nombre, 'es'))
      .slice(0, limit)
      .map((x) => x.s.store);
  }

  /** GET /explorar/buscar — products of every store, the stores found, filters and «¿Quisiste decir…?». */
  async search(params: SearchParams, now = Date.now()) {
    const index = await this.searchIndex(now);
    const found = search(index.products, params);
    const q = params.q?.trim() ?? '';
    // Step 3b: a search that found something counts for «más buscados» (once, on its first page).
    if (q && (params.pagina ?? 1) === 1 && found.total > 0) this.searchLog.record(q);
    return {
      q,
      productos: found.productos.map((p) => this.shown(p)),
      total: found.total,
      pagina: found.pagina,
      paginas: found.paginas,
      negocios: q || params.rubro ? this.storesFound(index.stores, params, STORES_FOUND) : [],
      facetas: { ...found.facetas, rubros: (await this.explore(now)).rubros },
      sugerencia: q
        ? didYouMean(q, [...index.products.map((p) => p.text), ...index.stores.map((s) => s.text)])
        : null,
    };
  }

  /**
   * Step 3b — «Lo que más se busca»: the words people search most (only those that find
   * products) and the products those searches find. Never how many times.
   */
  async trends(now = Date.now()) {
    const index = await this.searchIndex(now);
    const productos = index.products
      .filter((p) => p.buscados > 0)
      .sort((a, b) => b.buscados - a.buscados || b.vendidos - a.vendidos)
      .slice(0, CAROUSEL)
      .map((p) => this.shown(p));
    return { terminos: index.trending, productos };
  }

  /** GET /explorar/sugerencias — while the customer types: products, stores and brands. */
  async suggestions(q: string, now = Date.now()) {
    const query = q.trim();
    if (plain(query).length < 2) return { q: query, productos: [], negocios: [], marcas: [] };
    const index = await this.searchIndex(now);
    const found = search(index.products, { q: query });
    const brands = new Map<string, string>();
    for (const p of index.products) {
      const key = p.marca ? plain(p.marca) : '';
      if (key && !brands.has(key) && wordScore(plain(query), searchable(key)) >= 3) {
        brands.set(key, p.marca as string);
      }
    }
    return {
      q: query,
      productos: found.productos.slice(0, SUGGESTED).map((p) => ({
        productoId: p.productoId,
        nombre: p.nombre,
        precio: p.precio,
        tienda: { nombre: p.tienda.nombre, slug: p.tienda.slug },
      })),
      negocios: this.storesFound(index.stores, { q: query }, 3).map((s) => ({
        nombre: s.nombre,
        slug: s.slug,
        rubro: s.rubro,
      })),
      marcas: [...brands.values()].slice(0, 3),
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
