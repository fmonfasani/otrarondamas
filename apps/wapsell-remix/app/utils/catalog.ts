/**
 * Shapes of /catalogo/productos and /catalogo/jerarquia, and the pure helpers the
 * Catálogo screen uses (OR-B4-028: the panel shows category + subcategory; the Tipo and
 * Subtipo the model requires are the "General" ones of each subcategory).
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
  costo: string;
  precioMinorista: string;
  precioMayorista: string | null;
  descuentoPorcentaje: string | null;
  activo: boolean;
}

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
  return { ok: true, body };
}

export function matchesFilters(product: Product, filters: { category: string | null; status: string }) {
  if (filters.category && product.familiaId !== filters.category) return false;
  if (filters.status === 'activos' && !product.activo) return false;
  if (filters.status === 'inactivos' && product.activo) return false;
  return true;
}
