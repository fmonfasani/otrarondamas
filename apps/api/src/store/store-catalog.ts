/**
 * OR-B4-047 — a practical store: search, categories with counts, filters, order and paging over
 * the Catálogo (OR-B4-046). Pure functions over the published products of one Business, so the
 * rules are tested without a database. The service loads the rows through the Business's scoped
 * client and hands them here.
 */

/** Products per page; «Ver más» brings the next page. */
export const PAGE_SIZE = 24;
/** Best sellers: units sold in the last 30 days (counter and store). */
export const BEST_SELLERS_DAYS = 30;
/** Suggestions while typing. */
export const SUGGESTION_LIMIT = 6;

export const ORDERS = ['destacados', 'vendidos', 'precio-asc', 'precio-desc', 'nuevos'] as const;
export type CatalogOrder = (typeof ORDERS)[number];

/** One published product, as the store browses it. */
export type CatalogRow = {
  productoId: string;
  nombre: string;
  marca: string | null;
  codigoInterno: string;
  familiaId: string;
  subfamiliaId: string;
  unidadBase: string;
  destacado: boolean;
  createdAt: Date;
  /** The price the customer pays (with the product discount), in cents to compare exactly. */
  precioCentavos: number;
  stockTotal: number;
  /** Units sold in the last 30 days; only loaded when ordering by best sellers. */
  vendidos: number;
  /** Something lowers its price today: an offer or the product's discount (stage C3). */
  enOferta?: boolean;
};

export type BrowseParams = {
  q?: string;
  cat?: string;
  sub?: string;
  marcas?: string[];
  /** Price range on the price the customer pays, in pesos. */
  min?: number;
  max?: number;
  conStock?: boolean;
  enOferta?: boolean;
  orden?: CatalogOrder;
  pagina?: number;
};

export type Facets = {
  categorias: Array<{
    id: string;
    nombre: string;
    cantidad: number;
    subcategorias: Array<{ id: string; nombre: string; cantidad: number }>;
  }>;
  marcas: Array<{ nombre: string; cantidad: number }>;
  precio: { min: number; max: number } | null;
};

/** Lowercase, without accents: «Café» and «cafe» are the same word. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Every word of the query appears in the name, the brand or the code. */
export function matchesQuery(
  row: Pick<CatalogRow, 'nombre' | 'marca' | 'codigoInterno'>,
  q: string,
) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(`${row.nombre} ${row.marca ?? ''} ${row.codigoInterno}`);
  return words.every((word) => haystack.includes(word));
}

const byName = (a: CatalogRow, b: CatalogRow) => a.nombre.localeCompare(b.nombre, 'es');
const featuredFirst = (a: CatalogRow, b: CatalogRow) => Number(b.destacado) - Number(a.destacado);

/** The order the customer asked for; ties go by featured, then by name. */
export function sortRows<T extends CatalogRow>(rows: T[], orden: CatalogOrder = 'destacados'): T[] {
  const sorted = [...rows];
  const compare: Record<CatalogOrder, (a: T, b: T) => number> = {
    destacados: (a, b) => featuredFirst(a, b) || byName(a, b),
    vendidos: (a, b) => b.vendidos - a.vendidos || featuredFirst(a, b) || byName(a, b),
    'precio-asc': (a, b) => a.precioCentavos - b.precioCentavos || byName(a, b),
    'precio-desc': (a, b) => b.precioCentavos - a.precioCentavos || byName(a, b),
    nuevos: (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byName(a, b),
  };
  return sorted.sort(compare[orden]);
}

type Node = { id: string; nombre: string };
type SubNode = Node & { familiaId: string; general: boolean };

/**
 * Categories with how many products each one has among `rows`, and their subcategories (the
 * «General» one of each category is the category itself, so it is not listed). Empty ones are left
 * out, so the store never offers a category with nothing in it.
 */
export function categoryFacet(rows: CatalogRow[], familias: Node[], subfamilias: SubNode[]) {
  const byFamily = new Map<string, number>();
  const bySub = new Map<string, number>();
  for (const row of rows) {
    byFamily.set(row.familiaId, (byFamily.get(row.familiaId) ?? 0) + 1);
    bySub.set(row.subfamiliaId, (bySub.get(row.subfamiliaId) ?? 0) + 1);
  }
  return familias
    .filter((f) => byFamily.has(f.id))
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      cantidad: byFamily.get(f.id) ?? 0,
      subcategorias: subfamilias
        .filter((s) => s.familiaId === f.id && !s.general && bySub.has(s.id))
        .map((s) => ({ id: s.id, nombre: s.nombre, cantidad: bySub.get(s.id) ?? 0 }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Brands among `rows`, most products first. */
export function brandFacet(rows: CatalogRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const brand = row.marca?.trim();
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * The store listing. Each facet counts what the customer could still pick: categories over the
 * search, brands and the price range over the search and the category. Then brand, price and
 * stock narrow the list, the order applies, and one page is cut.
 */
export function browse<T extends CatalogRow>(
  rows: T[],
  params: BrowseParams,
  hierarchy: { familias: Node[]; subfamilias: SubNode[] },
) {
  const searched = params.q ? rows.filter((r) => matchesQuery(r, params.q as string)) : rows;
  const inCategory = searched.filter(
    (r) =>
      (!params.cat || r.familiaId === params.cat) && (!params.sub || r.subfamiliaId === params.sub),
  );
  const brands = new Set((params.marcas ?? []).map((b) => normalize(b)));
  const minCents = params.min === undefined ? undefined : Math.round(params.min * 100);
  const maxCents = params.max === undefined ? undefined : Math.round(params.max * 100);
  const filtered = inCategory.filter(
    (r) =>
      (brands.size === 0 || brands.has(normalize(r.marca ?? ''))) &&
      (minCents === undefined || r.precioCentavos >= minCents) &&
      (maxCents === undefined || r.precioCentavos <= maxCents) &&
      (!params.conStock || r.stockTotal > 0) &&
      (!params.enOferta || Boolean(r.enOferta)),
  );
  const sorted = sortRows(filtered, params.orden);
  const paginas = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagina = Math.min(Math.max(1, params.pagina ?? 1), paginas);
  const prices = inCategory.map((r) => r.precioCentavos);
  const facetas: Facets = {
    categorias: categoryFacet(searched, hierarchy.familias, hierarchy.subfamilias),
    marcas: brandFacet(inCategory),
    precio: prices.length
      ? { min: Math.min(...prices) / 100, max: Math.max(...prices) / 100 }
      : null,
  };
  return {
    productos: sorted.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    total: sorted.length,
    pagina,
    paginas,
    porPagina: PAGE_SIZE,
    facetas,
  };
}

/**
 * Suggestions while typing: names that start with the query first, then featured, then by name.
 * Categories whose name matches come apart, so the customer can jump to them.
 */
export function suggest<T extends CatalogRow>(rows: T[], q: string, familias: Node[]) {
  const query = normalize(q);
  if (query.length < 2) return { productos: [] as T[], categorias: [] as Node[] };
  const startsFirst = (r: CatalogRow) => (normalize(r.nombre).startsWith(query) ? 0 : 1);
  const productos = rows
    .filter((r) => matchesQuery(r, q))
    .sort((a, b) => startsFirst(a) - startsFirst(b) || featuredFirst(a, b) || byName(a, b))
    .slice(0, SUGGESTION_LIMIT);
  const withProducts = new Set(rows.map((r) => r.familiaId));
  const categorias = familias
    .filter((f) => withProducts.has(f.id) && normalize(f.nombre).includes(query))
    .slice(0, 3)
    .map((f) => ({ id: f.id, nombre: f.nombre }));
  return { productos, categorias };
}
