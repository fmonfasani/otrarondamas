/**
 * Shapes of /catalogo/productos and /catalogo/jerarquia, and the pure helpers the
 * Mercadería screen uses (OR-B4-028: the panel shows category + subcategory; the Tipo and
 * Subtipo the model requires are the "General" ones of each subcategory). OR-B4-046: the
 * Mercadería is every product; the Catálogo is what the Business publishes in its store.
 */
import { parseArsNumber } from './format';

export interface Product {
  id: string;
  nombre: string;
  codigoInterno: string;
  codigoBarras: string | null;
  marca: string | null;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  unidadBase: string;
  /** The last cost that entered (a purchase, the opening stock), or the one typed in. */
  costo: string;
  /** ADR-DAT-009: moving weighted average; null until something enters with a cost. */
  costoPromedio?: string | null;
  precioMinorista: string;
  precioMayorista: string | null;
  descuentoPorcentaje: string | null;
  /** D10: the price that keeps the markup after a new cost, for a person to apply or dismiss. */
  precioSugerido?: string | null;
  activo: boolean;
  /** In the store (the Catálogo). Only an active product is published. */
  publicado: boolean;
  /** First in the store. Only a published product is featured. */
  destacado: boolean;
  /** What the customer reads on the product page. */
  descripcion: string | null;
  /** OR-B4-046 rule 9: its lots carry an expiry date (FEFO); otherwise they leave in arrival order. */
  controlaVencimiento: boolean;
}

/** Longest store description the API takes. */
export const DESCRIPTION_MAX = 2000;

/** OR-B4-046 rule 12: photos per product, and what one upload may weigh before the API's check. */
export const MAX_PHOTOS = 5;
export const PHOTO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
/** The browser shrinks photos to this longest side before sending them. */
export const PHOTO_MAX_SIDE = 1600;

export type ProductPhoto = { id: string; orden: number; mimeType: string; sizeBytes: number };

/** Address of a product photo in the panel. */
export const panelPhotoSrc = (productId: string, photoId: string) =>
  `/panel/mercaderia/foto/${encodeURIComponent(productId)}/${encodeURIComponent(photoId)}`;

/** What the photos form says after coming back without JavaScript (`?fotos=`). */
export const photosNotice = (value: string | null) =>
  value === null ? null : value === 'ok' ? { ok: true, message: 'Fotos actualizadas.' } : { ok: false, message: value };

interface Node {
  id: string;
  nombre: string;
  prefijo: string;
}
export interface Hierarchy {
  familias: Node[];
  subfamilias: Array<Node & { familiaId: string }>;
  tipos: Array<Node & { subfamiliaId: string }>;
  subtipos: Array<Node & { tipoId: string }>;
}

export const UNITS = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'KILOGRAMO', label: 'Kilogramo' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'METRO', label: 'Metro' },
  { value: 'PACK', label: 'Pack' },
  { value: 'CAJA', label: 'Caja' },
];

/** Who can do what, mirroring the canonical matrix (the API still decides). */
export function catalogAbilities(role: string) {
  const manage = ['OWNER', 'ADMIN', 'GESTOR_DE_STOCK'].includes(role);
  const pricing = ['OWNER', 'ADMIN'].includes(role);
  return { manageCategories: manage, createProducts: manage && pricing, editProducts: manage, changePrices: pricing };
}

/** "1.234,50", "1234.5", "$ 900" → number; empty → null; garbage → NaN. */
export function parseAmount(value: FormDataEntryValue | null): number | null {
  return parseArsNumber(value);
}

/** Subcategory options grouped by category, "General" shown as the category itself. */
export function categoryOptions(hierarchy: Hierarchy) {
  return hierarchy.familias.map((familia) => ({
    familia,
    subcategories: hierarchy.subfamilias
      .filter((sub) => sub.familiaId === familia.id)
      .sort((a, b) => (a.prefijo === 'GEN' ? -1 : b.prefijo === 'GEN' ? 1 : a.nombre.localeCompare(b.nombre, 'es')))
      .map((sub) => ({ id: sub.id, label: sub.prefijo === 'GEN' ? `${familia.nombre} (general)` : `${familia.nombre} › ${sub.nombre}` })),
  }));
}

/**
 * Full 4-level chain for a subcategory: its "General" Tipo/Subtipo (prefix GEN) or, for
 * catalogs loaded before OR-B4-028, the first one available. Null when incomplete.
 */
export function chainFor(hierarchy: Hierarchy, subfamiliaId: string) {
  const subfamilia = hierarchy.subfamilias.find((s) => s.id === subfamiliaId);
  if (!subfamilia) return null;
  const tipos = hierarchy.tipos.filter((t) => t.subfamiliaId === subfamilia.id);
  const tipo = tipos.find((t) => t.prefijo === 'GEN') ?? tipos[0];
  if (!tipo) return null;
  const subtipos = hierarchy.subtipos.filter((s) => s.tipoId === tipo.id);
  const subtipo = subtipos.find((s) => s.prefijo === 'GEN') ?? subtipos[0];
  if (!subtipo) return null;
  return { familiaId: subfamilia.familiaId, subfamiliaId: subfamilia.id, tipoId: tipo.id, subtipoId: subtipo.id };
}

export function categoryLabel(hierarchy: Hierarchy, product: Pick<Product, 'familiaId' | 'subfamiliaId'>) {
  const familia = hierarchy.familias.find((f) => f.id === product.familiaId);
  const sub = hierarchy.subfamilias.find((s) => s.id === product.subfamiliaId);
  if (!familia) return '—';
  return sub && sub.prefijo !== 'GEN' ? `${familia.nombre} › ${sub.nombre}` : familia.nombre;
}

type Fields = Record<string, FormDataEntryValue | null>;
type Payload = Record<string, string | number | boolean>;

/**
 * Validates the product form and builds the API body. Price fields are only included
 * when the caller may change prices; on edit, a price left as it was is not resent (the
 * API asks PRICING_CHANGE for any body carrying a price).
 */
export function productPayload(
  fields: Fields,
  hierarchy: Hierarchy,
  options: { mode: 'create' | 'update'; changePrices: boolean; current?: Product },
): { ok: true; body: Payload } | { ok: false; message: string } {
  const text = (key: string) => String(fields[key] ?? '').trim();
  const nombre = text('nombre');
  if (!nombre) return { ok: false, message: 'El nombre es obligatorio.' };
  const body: Payload = { nombre, unidadBase: text('unidadBase') || 'UNIDAD' };
  for (const key of ['marca', 'codigoBarras'] as const) {
    const value = text(key);
    if (value || options.current?.[key]) body[key] = value;
  }
  if (options.mode === 'create' && text('codigoInterno')) body.codigoInterno = text('codigoInterno').toUpperCase();

  const subfamiliaId = text('subfamiliaId');
  if (options.mode === 'create' || subfamiliaId !== options.current?.subfamiliaId) {
    const chain = chainFor(hierarchy, subfamiliaId);
    if (!chain) return { ok: false, message: 'Elige una categoría.' };
    Object.assign(body, chain);
  }

  if (options.changePrices) {
    const prices: Array<[string, keyof Product, boolean]> = [
      ['costo', 'costo', true],
      ['precioMinorista', 'precioMinorista', true],
      ['precioMayorista', 'precioMayorista', false],
    ];
    for (const [field, column, required] of prices) {
      const amount = parseAmount(fields[field]);
      if (amount === null) {
        if (required) return { ok: false, message: 'El costo y el precio de venta son obligatorios.' };
        continue;
      }
      if (!(amount > 0)) return { ok: false, message: 'Los precios tienen que ser números mayores a cero.' };
      if (options.current && Number(options.current[column]) === amount) continue;
      body[field] = amount;
    }
    const discount = parseAmount(fields.descuentoPorcentaje);
    if (discount !== null) {
      if (!(discount >= 0 && discount <= 100)) return { ok: false, message: 'El descuento va de 0 a 100.' };
      if (!options.current || Number(options.current.descuentoPorcentaje ?? 0) !== discount) body.descuentoPorcentaje = discount;
    }
  }

  // OR-B4-046: the store fields. Each checkbox travels after a hidden "false", so a field the
  // form did not send at all leaves things as they are.
  const flag = (key: string) => (fields[key] === undefined || fields[key] === null ? undefined : String(fields[key]) === 'true');
  const publicado = flag('publicado');
  const destacado = flag('destacado');
  if (destacado && !(publicado ?? options.current?.publicado)) {
    return { ok: false, message: 'Solo un producto publicado en la tienda puede ser destacado.' };
  }
  if (publicado !== undefined && publicado !== Boolean(options.current?.publicado)) body.publicado = publicado;
  const controlaVencimiento = flag('controlaVencimiento');
  if (controlaVencimiento !== undefined && controlaVencimiento !== Boolean(options.current?.controlaVencimiento)) {
    body.controlaVencimiento = controlaVencimiento;
  }
  if (destacado !== undefined && destacado !== Boolean(options.current?.destacado)) body.destacado = destacado;
  if (fields.descripcion !== undefined && fields.descripcion !== null) {
    const descripcion = text('descripcion');
    if (descripcion.length > DESCRIPTION_MAX) return { ok: false, message: `La descripción puede tener hasta ${DESCRIPTION_MAX} caracteres.` };
    if (descripcion !== (options.current?.descripcion ?? '')) body.descripcion = descripcion;
  }
  return { ok: true, body };
}

/** Store filter of the list: in the store, outside it, or both (null). */
export type StoreFilter = 'publicados' | 'sin-publicar' | null;

export function matchesFilters(
  product: Product,
  filters: { category: string | null; status: string; store?: StoreFilter; review?: boolean },
) {
  if (filters.review && !hasPriceToReview(product)) return false;
  if (filters.category && product.familiaId !== filters.category) return false;
  if (filters.status === 'activos' && !product.activo) return false;
  if (filters.status === 'inactivos' && product.activo) return false;
  if (filters.store === 'publicados' && !product.publicado) return false;
  if (filters.store === 'sin-publicar' && product.publicado) return false;
  return true;
}

export const storeFilterOf = (value: string | null): StoreFilter =>
  value === 'publicados' || value === 'sin-publicar' ? value : null;

/** What the Business reads after publishing or unpublishing many products at once. */
export function publishMessage(updated: number, publicado: boolean) {
  if (updated === 0) {
    return publicado
      ? 'No había productos para publicar: ya estaban en la tienda o están inactivos.'
      : 'Esos productos ya estaban fuera de la tienda.';
  }
  const products = updated === 1 ? '1 producto' : `${updated} productos`;
  return publicado ? `Listo: ${products} en la tienda.` : `Listo: ${products} fuera de la tienda.`;
}

/** D10 (stage C1): an active product whose cost changed and whose price nobody reviewed yet. */
export const hasPriceToReview = (product: Product) => product.activo && Boolean(product.precioSugerido);

/** Markup over cost, in whole percent; null when there is no cost or the numbers are not valid. */
export function markupOf(price: number | string | null | undefined, cost: number | string | null | undefined): number | null {
  const p = Number(price);
  const c = Number(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0 || price === null || price === '' || price === undefined) return null;
  return Math.round(((p - c) / c) * 100);
}

/** «Ganancia: 50 % sobre el costo» and friends, for the editor. */
export function markupLabel(markup: number | null): string {
  if (markup === null) return 'Cargá el costo para ver la ganancia.';
  if (markup < 0) return `Pérdida: ${Math.abs(markup)} % por debajo del costo.`;
  return `Ganancia: ${markup} % sobre el costo.`;
}

/** What the person reads after applying or dismissing a suggested price. */
export function reviewMessage(applied: boolean, price: string | null | undefined, format: (v: string) => string) {
  return applied && price ? `Listo: el precio ahora es ${format(price)}.` : 'Listo: el precio quedó como estaba.';
}
