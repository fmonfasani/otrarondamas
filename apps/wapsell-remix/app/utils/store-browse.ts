/**
 * OR-B4-047 — the practical store: the listing the API answers (/:slug/tienda/catalogo), and the
 * pure helpers that keep every filter in the link, so a search can be shared as it is.
 */
import { formatMoney, parseArsNumber } from './format';
import type { StoreProduct } from './store';

export type CategoryFacet = {
  id: string;
  nombre: string;
  cantidad: number;
  subcategorias: Array<{ id: string; nombre: string; cantidad: number }>;
};

export type StoreListing = {
  productos: StoreProduct[];
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
  facetas: {
    categorias: CategoryFacet[];
    marcas: Array<{ nombre: string; cantidad: number }>;
    precio: { min: number; max: number } | null;
  };
  /** Set when a further page could not be loaded («Ver más»). */
  error?: string;
};

export const EMPTY_LISTING: StoreListing = {
  productos: [],
  total: 0,
  pagina: 1,
  paginas: 1,
  porPagina: 24,
  facetas: { categorias: [], marcas: [], precio: null },
};

/** The product page of a store, as the API answers it. */
export type StoreProductDetail = StoreProduct & {
  marca: string | null;
  descripcion: string | null;
  /** Its photos, in order (OR-B4-046 rule 12). */
  fotos: string[];
  categoria: { id: string; nombre: string };
  subcategoria: { id: string; nombre: string } | null;
};

export type Suggestions = {
  /** The text these suggestions answer (the Remix route echoes it), so stale ones are never shown. */
  q?: string;
  productos: Array<{ productoId: string; nombre: string; marca: string | null; precio: string }>;
  categorias: Array<{ id: string; nombre: string }>;
};

export const ORDER_OPTIONS = [
  { value: 'destacados', label: 'Destacados' },
  { value: 'vendidos', label: 'Más vendidos' },
  { value: 'precio-asc', label: 'Menor precio' },
  { value: 'precio-desc', label: 'Mayor precio' },
  { value: 'nuevos', label: 'Novedades' },
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BRANDS = 20;

/** A price typed by the customer ("2.000", "1500,50"); null when empty or not a price. */
function priceOf(value: string | null): number | null {
  const amount = parseArsNumber(value);
  return amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * The filters of the store's link, cleaned: what the API would refuse is dropped instead of
 * sent, so an old or hand-edited link still opens the store. `search` is the old name of `q`.
 */
export function listingQuery(url: URL): URLSearchParams {
  const from = url.searchParams;
  const out = new URLSearchParams();
  const q = (from.get('q') ?? from.get('search') ?? '').trim().slice(0, 100);
  if (q) out.set('q', q);
  for (const key of ['cat', 'sub']) {
    const value = from.get(key);
    if (value && UUID.test(value)) out.set(key, value);
  }
  const brands = [...new Set(from.getAll('marca').map((b) => b.trim().slice(0, 80)).filter(Boolean))];
  for (const brand of brands.slice(0, MAX_BRANDS)) out.append('marca', brand);
  for (const key of ['min', 'max']) {
    const amount = priceOf(from.get(key));
    if (amount !== null) out.set(key, String(amount));
  }
  if (from.get('stock') === '1') out.set('stock', '1');
  const orden = from.get('orden');
  if (orden && orden !== 'destacados' && ORDER_OPTIONS.some((o) => o.value === orden)) out.set('orden', orden);
  const pagina = Number(from.get('pagina'));
  if (Number.isInteger(pagina) && pagina > 1 && pagina <= 1000) out.set('pagina', String(pagina));
  return out;
}

/**
 * The store link with some filters changed (null removes one). Changing what is listed goes back
 * to the first page, unless the change is the page itself.
 */
export function linkWith(base: string, query: URLSearchParams, changes: Record<string, string | string[] | null>) {
  const next = new URLSearchParams(query);
  if (!('pagina' in changes)) next.delete('pagina');
  for (const [key, value] of Object.entries(changes)) {
    next.delete(key);
    if (value === null) continue;
    for (const v of Array.isArray(value) ? value : [value]) next.append(key, v);
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

/** The filters in use, each with the link that removes it, to show them as chips. */
export function activeFilters(base: string, query: URLSearchParams, facets: StoreListing['facetas']) {
  const chips: Array<{ label: string; href: string }> = [];
  const q = query.get('q');
  if (q) chips.push({ label: `«${q}»`, href: linkWith(base, query, { q: null }) });
  const cat = facets.categorias.find((c) => c.id === query.get('cat'));
  if (cat) chips.push({ label: cat.nombre, href: linkWith(base, query, { cat: null, sub: null }) });
  const sub = cat?.subcategorias.find((s) => s.id === query.get('sub'));
  if (sub) chips.push({ label: sub.nombre, href: linkWith(base, query, { sub: null }) });
  const brands = query.getAll('marca');
  for (const brand of brands) {
    chips.push({ label: brand, href: linkWith(base, query, { marca: brands.filter((b) => b !== brand) }) });
  }
  const min = query.get('min');
  const max = query.get('max');
  if (min) chips.push({ label: `Desde ${formatMoney(min)}`, href: linkWith(base, query, { min: null }) });
  if (max) chips.push({ label: `Hasta ${formatMoney(max)}`, href: linkWith(base, query, { max: null }) });
  if (query.get('stock') === '1') chips.push({ label: 'Con stock', href: linkWith(base, query, { stock: null }) });
  return chips;
}

/** How many of the filters inside the «Filtros» panel are in use (brand, price, stock). */
export const panelFilterCount = (query: URLSearchParams) =>
  query.getAll('marca').length + (query.get('min') ? 1 : 0) + (query.get('max') ? 1 : 0) + (query.get('stock') === '1' ? 1 : 0);

/** The products of a later page joined to what is already on screen, without repeating any. */
export function appendPage(shown: StoreProduct[], next: StoreProduct[]) {
  const seen = new Set(shown.map((p) => p.productoId));
  return [...shown, ...next.filter((p) => !seen.has(p.productoId))];
}

/** Address of a product photo in the store. */
export const storePhotoSrc = (slug: string, productoId: string, fotoId: string) =>
  `/tienda/${slug}/foto/${encodeURIComponent(productoId)}/${encodeURIComponent(fotoId)}`;

/** Address of a product page. */
export const productHref = (slug: string, productoId: string) => `/tienda/${slug}/producto/${encodeURIComponent(productoId)}`;
