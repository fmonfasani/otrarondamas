/**
 * Marketplace, step 2 (Owner, 2026-11-26) — what GET /explorar answers and the explorer's pure
 * helpers (filter by rubro and text, the store's cover photo).
 */

export type ExplorerStore = {
  nombre: string;
  slug: string;
  rubro: string | null;
  ciudad: string | null;
  provincia: string | null;
  descripcion: string | null;
  abiertoAhora: boolean | null;
  portada: { productoId: string; fotoId: string } | null;
  ofertas: number;
  /** Step 4: the confirmed place (rounded to the zone when the Owner chose so); null = not on the map. */
  ubicacion?: { lat: number; lng: number; zona: boolean } | null;
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

export type Explorer = {
  negocios: ExplorerStore[];
  rubros: string[];
  carruseles: {
    ofertas: ExplorerProduct[];
    masVendidos: ExplorerProduct[];
    masPedidos: ExplorerStore[];
    nuevos: ExplorerStore[];
  };
  /** Step 3b — «Lo que más se busca»: words and products, never how many times. */
  tendencias?: { terminos: string[]; productos: ExplorerProduct[] };
};

export const EMPTY_EXPLORER: Explorer = {
  negocios: [],
  rubros: [],
  carruseles: { ofertas: [], masVendidos: [], masPedidos: [], nuevos: [] },
};

/** Lower case, no accents: «Almacén» and «almacen» are the same word. */
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** What a store's card says under its name: «Almacén · Rosario». */
export const storeLine = (s: Pick<ExplorerStore, 'rubro' | 'ciudad' | 'provincia'>) =>
  [s.rubro, s.ciudad ?? s.provincia].filter(Boolean).join(' · ') || 'Tienda en Wapsell';

/** Stores of a rubro whose name, rubro, place or description has every word typed. */
export function filterStores(stores: ExplorerStore[], options: { rubro?: string | null; q?: string }): ExplorerStore[] {
  const words = fold(options.q ?? '').split(/\s+/).filter(Boolean);
  return stores.filter((s) => {
    if (options.rubro && s.rubro !== options.rubro) return false;
    if (words.length === 0) return true;
    const text = fold([s.nombre, s.rubro, s.ciudad, s.provincia, s.descripcion].filter(Boolean).join(' '));
    return words.every((w) => text.includes(w));
  });
}

export const storeCover = (s: ExplorerStore) =>
  s.portada ? `/tienda/${s.slug}/foto/${encodeURIComponent(s.portada.productoId)}/${encodeURIComponent(s.portada.fotoId)}` : null;

export const productPhoto = (p: ExplorerProduct) =>
  p.foto ? `/tienda/${p.tienda.slug}/foto/${encodeURIComponent(p.productoId)}/${encodeURIComponent(p.foto)}` : null;

/** Marketplace, step 3 — what GET /explorar/buscar answers. */
export type ExplorerFound = ExplorerProduct & { abiertoAhora: boolean | null };

export type ExplorerSearchResult = {
  q: string;
  productos: ExplorerFound[];
  total: number;
  pagina: number;
  paginas: number;
  negocios: ExplorerStore[];
  facetas: {
    marcas: Array<{ nombre: string; cantidad: number }>;
    precio: { min: number; max: number } | null;
    rubros: string[];
  };
  /** «¿Quisiste decir…?» when a word was only found by sound or with a slip. */
  sugerencia: string | null;
};

export const EMPTY_SEARCH: ExplorerSearchResult = {
  q: '',
  productos: [],
  total: 0,
  pagina: 1,
  paginas: 1,
  negocios: [],
  facetas: { marcas: [], precio: null, rubros: [] },
  sugerencia: null,
};

/** While the customer types (GET /explorar/sugerencias). */
export type ExplorerSuggestions = {
  q: string;
  productos: Array<{ productoId: string; nombre: string; precio: string; tienda: { nombre: string; slug: string } }>;
  negocios: Array<{ nombre: string; slug: string; rubro: string | null }>;
  marcas: string[];
};

export const SEARCH_ORDERS = [
  ['relevancia', 'Más relevantes'],
  ['vendidos', 'Más vendidos'],
  ['buscados', 'Más buscados'],
  ['precio-asc', 'Menor precio'],
  ['precio-desc', 'Mayor precio'],
  ['nuevos', 'Más nuevos'],
] as const;

/** The filters the search page passes on to the API, and nothing else. */
export const SEARCH_KEYS = ['q', 'rubro', 'marca', 'min', 'max', 'oferta', 'abierto', 'orden', 'pagina'] as const;

export function searchParamsOf(url: URL): URLSearchParams {
  const out = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    for (const value of url.searchParams.getAll(key)) {
      const v = value.trim().slice(0, 100);
      if (v) out.append(key, v);
    }
  }
  return out;
}

/**
 * The link of the search with one thing changed: `null` removes it, an array sets every value.
 * Changing a filter goes back to page 1.
 */
export function searchHref(current: URLSearchParams, change: Record<string, string | string[] | null>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(change)) {
    next.delete(key);
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
    else if (value !== null && value !== '') next.set(key, value);
  }
  if (!('pagina' in change)) next.delete('pagina');
  const text = next.toString();
  return text ? `/buscar?${text}` : '/buscar';
}

/** Step 3b — a buyer's ♥ product (GET /auth/comprador/favoritos). */
export type FavoriteProduct = Omit<ExplorerProduct, 'precio'> & { precio: string | null; disponible: boolean };

/** Where a visitor goes to sign in and come back to the same page. */
export const loginTo = (path: string) => `/es/auth/login?redirectTo=${encodeURIComponent(path)}`;
