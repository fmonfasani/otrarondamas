/**
 * Shapes of /inventario/* and /compras, /proveedores, and pure helpers for the
 * Inventario and Compras screens. No I/O, unit-tested directly.
 */
import { parseArsNumber } from './format';

export interface StockRow {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  unidadBase: string;
  stockTotal: number;
  /** OR-B4-049: held by confirmed orders that have not left the business. */
  reservado: number;
  /** What can still be sold: stock minus what is reserved. */
  disponible: number;
  stockMinimo: number;
  stockBajo: boolean;
}
export interface Batch {
  id: string;
  numeroLote: string;
  /** Only for products that control expiry (OR-B4-046 rule 9). */
  vencimiento: string | null;
  cantidad: string;
}
export interface StockMovement {
  id: string;
  tipoMovimiento: string;
  cantidad: string;
  motivo: string;
  createdAt: string;
  loteId: string | null;
  loteVencidoAlMomento: boolean;
}
export interface Alerts {
  diasAnticipacion: number;
  stockBajo: Array<{ productoId: string; nombre: string; codigoInterno: string; stockTotal: number; stockMinimo: number }>;
  lotesPorVencer: Array<{ loteId: string; productoId: string; productoNombre: string; numeroLote: string; vencimiento: string; cantidad: string }>;
}
export interface Supplier {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}
export interface PurchaseItem {
  id: string;
  productoId: string;
  cantidadPedida: string;
  cantidadRecibida: string;
  costoUnitario: string;
}
export interface Purchase {
  id: string;
  estado: 'BORRADOR' | 'EMITIDA' | 'RECEPCION_PARCIAL' | 'RECIBIDA';
  total: string;
  fechaOrden: string;
  fechaRecepcionEsperada: string | null;
  Proveedor: Supplier;
  CompraItem: PurchaseItem[];
  RecepcionCompra?: Array<{ id: string; createdAt: string }>;
}

/** Mirrors the canonical matrix (the API still decides). */
export function inventoryAbilities(role: string) {
  const stockRoles = ['OWNER', 'ADMIN', 'GESTOR_DE_STOCK'];
  return {
    adjust: stockRoles.includes(role),
    setMinimum: stockRoles.includes(role),
    purchases: stockRoles.includes(role),
  };
}

export const PURCHASE_STATES: Record<Purchase['estado'], { label: string; tone: string }> = {
  BORRADOR: { label: 'Borrador', tone: 'muted' },
  EMITIDA: { label: 'Emitida', tone: 'secondary' },
  RECEPCION_PARCIAL: { label: 'Recibida en parte', tone: 'warning' },
  RECIBIDA: { label: 'Recibida', tone: 'success' },
};

export const ADJUSTMENT_REASONS = ['Conteo físico', 'Rotura', 'Vencimiento', 'Robo o pérdida', 'Consumo interno', 'Otro'];

export function pendingOf(item: PurchaseItem): number {
  return Math.max(0, Number(item.cantidadPedida) - Number(item.cantidadRecibida));
}

/** Suggested batch number for a receipt: short purchase id + receipt number (editable). */
export function suggestedBatchNumber(purchase: Pick<Purchase, 'id' | 'RecepcionCompra'>): string {
  return `C${purchase.id.replace(/-/g, '').slice(0, 6).toUpperCase()}-${(purchase.RecepcionCompra?.length ?? 0) + 1}`;
}

/** Days from today (local calendar) until a batch expires; negative when expired. */
export function daysUntil(iso: string, now = new Date()): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const target = new Date(iso);
  return Math.round((Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - day(now)) / 86_400_000);
}

export function expiryLabel(iso: string | null, now = new Date()): { label: string; tone: string } {
  if (!iso) return { label: 'Sin vencimiento', tone: 'muted' };
  const days = daysUntil(iso, now);
  if (days < 0) return { label: `Vencido hace ${-days} ${-days === 1 ? 'día' : 'días'}`, tone: 'warning' };
  if (days === 0) return { label: 'Vence hoy', tone: 'warning' };
  if (days <= 7) return { label: `Vence en ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'warning' };
  return { label: new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC' }), tone: 'muted' };
}

const num = (value: FormDataEntryValue | undefined | null) => {
  const n = parseArsNumber(value);
  return n !== null && n < 0 ? Number.NaN : n;
};

/** Purchase rows from repeated fields (productoId[], cantidad[], costo[]); blank rows skipped. */
export function purchaseItemsFrom(form: FormData):
  | { ok: true; items: Array<{ productoId: string; cantidadPedida: number; costoUnitario: number }> }
  | { ok: false; message: string } {
  const products = form.getAll('productoId').map(String);
  const quantities = form.getAll('cantidad');
  const costs = form.getAll('costo');
  const items: Array<{ productoId: string; cantidadPedida: number; costoUnitario: number }> = [];
  for (let i = 0; i < products.length; i++) {
    const productoId = products[i];
    const cantidad = num(quantities[i]);
    const costo = num(costs[i]);
    if (!productoId && cantidad === null && costo === null) continue;
    if (!productoId) return { ok: false, message: `Elige el producto de la fila ${i + 1}.` };
    if (!(cantidad && cantidad > 0)) return { ok: false, message: `La cantidad de la fila ${i + 1} tiene que ser mayor a cero.` };
    if (!(costo && costo > 0)) return { ok: false, message: `El costo de la fila ${i + 1} tiene que ser mayor a cero.` };
    items.push({ productoId, cantidadPedida: cantidad, costoUnitario: costo });
  }
  if (items.length === 0) return { ok: false, message: 'Agrega al menos un producto.' };
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productoId)) return { ok: false, message: 'Un producto está repetido; usa una sola fila por producto.' };
    seen.add(item.productoId);
  }
  return { ok: true, items };
}

/**
 * Receipt rows (compraItemId[], recibido[], lote[], vencimiento[], controlaVencimiento[]); a 0/blank
 * quantity is skipped. OR-B4-046 rule 9: the lot number is optional, and the expiry date is asked
 * only for products that control expiry (the API checks it too).
 */
export function receiptItemsFrom(form: FormData):
  | { ok: true; items: Array<{ compraItemId: string; cantidadRecibida: number; numeroLote?: string; vencimiento?: string }> }
  | { ok: false; message: string } {
  const ids = form.getAll('compraItemId').map(String);
  const quantities = form.getAll('recibido');
  const batches = form.getAll('lote').map((v) => String(v).trim());
  const expiries = form.getAll('vencimiento').map((v) => String(v).trim());
  const needsExpiry = form.getAll('controlaVencimiento').map(String);
  const items = [];
  for (let i = 0; i < ids.length; i++) {
    const cantidad = num(quantities[i]);
    if (cantidad === null || cantidad === 0) continue;
    if (Number.isNaN(cantidad) || cantidad < 0) return { ok: false, message: 'Las cantidades recibidas tienen que ser números positivos.' };
    const expiry = expiries[i] ?? '';
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return { ok: false, message: 'La fecha de vencimiento no es válida.' };
    if (!expiry && needsExpiry[i] === '1') {
      return { ok: false, message: 'Indicá la fecha de vencimiento de los productos que la controlan.' };
    }
    items.push({
      compraItemId: ids[i],
      cantidadRecibida: cantidad,
      ...(batches[i] ? { numeroLote: batches[i] } : {}),
      ...(expiry ? { vencimiento: expiry } : {}),
    });
  }
  if (items.length === 0) return { ok: false, message: 'Ingresa la cantidad recibida de al menos un producto.' };
  return { ok: true, items };
}

/** Signed integer adjustment from direction + quantity; the API only takes integers ≠ 0. */
export function adjustmentFrom(form: FormData): { ok: true; cantidad: number; motivo: string } | { ok: false; message: string } {
  const qty = Number(String(form.get('cantidad') ?? '').trim());
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, message: 'La cantidad tiene que ser un número entero mayor a cero.' };
  const reason = String(form.get('motivo') ?? '').trim();
  const detail = String(form.get('detalle') ?? '').trim();
  const motivo = reason === 'Otro' ? detail : detail ? `${reason}: ${detail}` : reason;
  if (!motivo) return { ok: false, message: 'Indica el motivo del ajuste.' };
  return { ok: true, cantidad: form.get('direccion') === 'salida' ? -qty : qty, motivo };
}

/* ---------------------------------------------------------------- Opening stock and count (D8) */

/** GET /inventario/conteo: the sheet to count on (OR-B4-046 D8). */
export interface CountSheetRow {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  unidadBase: string;
  controlaVencimiento: boolean;
  stockTotal: number;
  lotes: Array<{ id: string; numeroLote: string; vencimiento: string | null; cantidad: string }>;
}
export interface CountSheet {
  hayMas: boolean;
  productos: CountSheetRow[];
}
export interface CountResult {
  referenciaId: string;
  contados: number;
  ajustados: number;
  diferencias: Array<{ productoId: string; nombre: string; lote: string | null; sistema: number; contado: number; diferencia: number }>;
}

/** GET /inventario/carga-inicial: the products that can still take an opening stock. */
export interface OpeningRow {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  unidadBase: string;
  controlaVencimiento: boolean;
  costo: string;
  stockTotal: number;
}
export interface OpeningSheet {
  total: number;
  productos: OpeningRow[];
}

/** One line of the count sheet: a whole product, one of its lots, or a lot the count finds. */
export interface CountLine {
  key: string;
  kind: 'producto' | 'lote' | 'nuevo';
  productoId: string;
  nombre: string;
  codigoInterno: string;
  loteId: string;
  label: string;
  sistema: number;
  /** The first line of its product (the name is shown once). */
  first: boolean;
}

/**
 * The lines to count: a product that controls expiry is counted lot by lot, plus one line for a lot
 * the count finds (it needs its date); any other product is counted as a whole.
 */
export function countLinesOf(rows: CountSheetRow[]): CountLine[] {
  const lines: CountLine[] = [];
  for (const row of rows) {
    const base = { productoId: row.productoId, nombre: row.nombre, codigoInterno: row.codigoInterno };
    if (!row.controlaVencimiento) {
      lines.push({ ...base, key: row.productoId, kind: 'producto', loteId: '', label: '', sistema: row.stockTotal, first: true });
      continue;
    }
    row.lotes.forEach((lot, i) => {
      lines.push({
        ...base,
        key: lot.id,
        kind: 'lote',
        loteId: lot.id,
        label: `Lote ${lot.numeroLote} · ${expiryLabel(lot.vencimiento).label}`,
        sistema: Number(lot.cantidad),
        first: i === 0,
      });
    });
    lines.push({ ...base, key: `${row.productoId}:nuevo`, kind: 'nuevo', loteId: '', label: 'Otro lote', sistema: 0, first: row.lotes.length === 0 });
  }
  return lines;
}

/** The difference between what was counted and the system: null when blank, NaN when not a valid count. */
export function countDifference(sistema: number, counted: string): number | null {
  const value = parseArsNumber(counted);
  if (value === null) return null;
  if (Number.isNaN(value) || value < 0) return Number.NaN;
  return Math.round((value - sistema) * 1000) / 1000;
}

export type CountItem = {
  productoId: string;
  loteId?: string;
  vencimiento?: string;
  cantidadSistema: number;
  cantidadContada: number;
};

/**
 * Count rows (fila[], productoId[], nombre[], loteId[], vence[], sistema[], contado[]); a blank count is
 * skipped, so whoever counts by parts only sends what they counted.
 */
export function countItemsFrom(form: FormData): { ok: true; items: CountItem[] } | { ok: false; message: string } {
  const kinds = form.getAll('fila').map(String);
  const products = form.getAll('productoId').map(String);
  const names = form.getAll('nombre').map(String);
  const lots = form.getAll('loteId').map(String);
  const dates = form.getAll('vence').map((v) => String(v).trim());
  const systems = form.getAll('sistema').map(String);
  const counts = form.getAll('contado');
  const items: CountItem[] = [];
  for (let i = 0; i < products.length; i++) {
    const counted = parseArsNumber(counts[i]);
    if (counted === null) continue;
    const name = `«${names[i] || 'un producto'}»`;
    if (Number.isNaN(counted) || counted < 0) return { ok: false, message: `Lo contado de ${name} tiene que ser un número, 0 o más.` };
    if (kinds[i] === 'nuevo') {
      if (counted === 0) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dates[i] ?? '')) return { ok: false, message: `Indicá la fecha del otro lote de ${name}.` };
      items.push({ productoId: products[i], vencimiento: dates[i], cantidadSistema: 0, cantidadContada: counted });
      continue;
    }
    items.push({
      productoId: products[i],
      ...(kinds[i] === 'lote' ? { loteId: lots[i] } : {}),
      cantidadSistema: Number(systems[i]),
      cantidadContada: counted,
    });
  }
  if (items.length === 0) return { ok: false, message: 'Escribí lo que contaste en al menos un renglón.' };
  return { ok: true, items };
}

export type OpeningItem = {
  productoId: string;
  cantidad: number;
  vencimiento?: string;
  numeroLote?: string;
  costoUnitario?: number;
};

/** Opening rows (productoId[], nombre[], controla[], cantidad[], vence[], lote[], costo[]); a blank or 0 quantity is skipped. */
export function openingItemsFrom(form: FormData): { ok: true; items: OpeningItem[] } | { ok: false; message: string } {
  const products = form.getAll('productoId').map(String);
  const names = form.getAll('nombre').map(String);
  const controls = form.getAll('controla').map(String);
  const quantities = form.getAll('cantidad');
  const dates = form.getAll('vence').map((v) => String(v).trim());
  const lots = form.getAll('lote').map((v) => String(v).trim());
  const costs = form.getAll('costo');
  const items: OpeningItem[] = [];
  for (let i = 0; i < products.length; i++) {
    const cantidad = parseArsNumber(quantities[i]);
    if (cantidad === null || cantidad === 0) continue;
    const name = `«${names[i] || 'un producto'}»`;
    if (Number.isNaN(cantidad) || cantidad < 0) return { ok: false, message: `La cantidad de ${name} tiene que ser un número positivo.` };
    const date = dates[i] ?? '';
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: `La fecha de ${name} no es válida.` };
    const controlled = controls[i] === '1';
    if (controlled && !date) return { ok: false, message: `${name} controla vencimiento: indicá la fecha del lote.` };
    const costo = parseArsNumber(costs[i]);
    if (costo !== null && (Number.isNaN(costo) || costo < 0)) return { ok: false, message: `El costo de ${name} no es válido.` };
    items.push({
      productoId: products[i],
      cantidad,
      ...(controlled ? { vencimiento: date } : {}),
      ...(lots[i] ? { numeroLote: lots[i] } : {}),
      ...(costo !== null ? { costoUnitario: costo } : {}),
    });
  }
  if (items.length === 0) return { ok: false, message: 'Escribí la cantidad de al menos un producto.' };
  return { ok: true, items };
}

export function countMessage(result: Pick<CountResult, 'contados' | 'ajustados'>): string {
  if (result.ajustados === 0) return 'Conteo registrado: todo lo que contaste coincide con el sistema.';
  return `Conteo registrado: ajustamos el stock de ${result.ajustados} de ${result.contados} ${result.contados === 1 ? 'renglón contado' : 'renglones contados'}.`;
}

export function openingMessage(result: { productos: number; lotes: number }): string {
  const products = `${result.productos} ${result.productos === 1 ? 'producto' : 'productos'}`;
  return result.lotes === result.productos
    ? `Cargamos el stock inicial de ${products}.`
    : `Cargamos el stock inicial de ${products} (${result.lotes} lotes).`;
}

/** A quantity or a cost as the person writes it (es-AR decimals, no thousands separator). */
export function editableNumber(value: string | number): string {
  return Number(value).toLocaleString('es-AR', { maximumFractionDigits: 4, useGrouping: false });
}

/** What the person reads after receiving goods; D10: the prices left to review in Mercadería. */
export function receptionMessage(pricesToReview: number | undefined): string {
  const base = 'Mercadería recibida. El stock ya está actualizado.';
  if (!pricesToReview) return base;
  const which = pricesToReview === 1 ? '1 producto entró' : `${pricesToReview} productos entraron`;
  return `${base} ${which} con otro costo: su precio se revisa en Mercadería.`;
}
