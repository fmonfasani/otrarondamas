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
  stockMinimo: number;
  stockBajo: boolean;
}
export interface Batch {
  id: string;
  numeroLote: string;
  vencimiento: string;
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

export function expiryLabel(iso: string, now = new Date()): { label: string; tone: string } {
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

/** Receipt rows (compraItemId[], recibido[], lote[], vencimiento[]); a 0/blank quantity is skipped. */
export function receiptItemsFrom(form: FormData):
  | { ok: true; items: Array<{ compraItemId: string; cantidadRecibida: number; numeroLote: string; vencimiento: string }> }
  | { ok: false; message: string } {
  const ids = form.getAll('compraItemId').map(String);
  const quantities = form.getAll('recibido');
  const batches = form.getAll('lote').map((v) => String(v).trim());
  const expiries = form.getAll('vencimiento').map(String);
  const items = [];
  for (let i = 0; i < ids.length; i++) {
    const cantidad = num(quantities[i]);
    if (cantidad === null || cantidad === 0) continue;
    if (Number.isNaN(cantidad) || cantidad < 0) return { ok: false, message: 'Las cantidades recibidas tienen que ser números positivos.' };
    if (!batches[i]) return { ok: false, message: 'Cada producto recibido necesita un número de lote.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiries[i] ?? '')) return { ok: false, message: 'Cada producto recibido necesita una fecha de vencimiento.' };
    items.push({ compraItemId: ids[i], cantidadRecibida: cantidad, numeroLote: batches[i], vencimiento: expiries[i] });
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
