const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

/** Amounts arrive from the API as decimal strings. */
export function formatMoney(value: string | number | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : value ?? 0;
  return money.format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return time.format(new Date(value));
}

export type OrderState =
  | 'RECIBIDO'
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'PARCIALMENTE_ENTREGADO'
  | 'ENTREGA_FALLIDA'
  | 'CANCELADO';

/** Label and chip tone per Order state (R8-ORD-002 vocabulary). */
export const ORDER_STATES: Record<OrderState, { label: string; tone: string }> = {
  RECIBIDO: { label: 'Por confirmar', tone: 'warning' },
  CONFIRMADO: { label: 'Confirmado', tone: 'secondary' },
  EN_PREPARACION: { label: 'En preparación', tone: 'secondary' },
  LISTO: { label: 'Listo', tone: 'secondary' },
  ASIGNADO: { label: 'Asignado', tone: 'secondary' },
  EN_CAMINO: { label: 'En camino', tone: 'secondary' },
  ENTREGADO: { label: 'Entregado', tone: 'success' },
  PARCIALMENTE_ENTREGADO: { label: 'Entrega parcial', tone: 'warning' },
  ENTREGA_FALLIDA: { label: 'Entrega fallida', tone: 'primary' },
  CANCELADO: { label: 'Cancelado', tone: 'muted' },
};

export function orderState(state: string) {
  return ORDER_STATES[state as OrderState] ?? { label: state, tone: 'muted' };
}

/**
 * A number typed the Argentine way: "1.234,50", "5.000" (thousands) or "2.5" / "1234.5"
 * (decimal point). `$` and spaces are ignored. null when empty, NaN when it is not a number.
 * Before this, "5.000" was read as 5 (catalog prices, inventory, cash and sales).
 */
export function parseArsNumber(value: FormDataEntryValue | null | undefined): number | null {
  const raw = String(value ?? '').replace(/[$\s]/g, '');
  if (!raw) return null;
  const thousands = /^-?\d{1,3}(\.\d{3})+$/.test(raw);
  const normalized = raw.includes(',') || thousands ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}
