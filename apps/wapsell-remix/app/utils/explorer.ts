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

/** Products of the carousels that match the words (name, brand or store). */
export function filterProducts(products: ExplorerProduct[], q: string): ExplorerProduct[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return products;
  return products.filter((p) => {
    const text = fold([p.nombre, p.marca, p.tienda.nombre].filter(Boolean).join(' '));
    return words.every((w) => text.includes(w));
  });
}

export const storeCover = (s: ExplorerStore) =>
  s.portada ? `/tienda/${s.slug}/foto/${encodeURIComponent(s.portada.productoId)}/${encodeURIComponent(s.portada.fotoId)}` : null;

export const productPhoto = (p: ExplorerProduct) =>
  p.foto ? `/tienda/${p.tienda.slug}/foto/${encodeURIComponent(p.productoId)}/${encodeURIComponent(p.foto)}` : null;
