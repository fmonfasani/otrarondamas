/** Pure helpers of the counter sale screen (Ventas / POS), wired to /ventas on the API. */
import { parseArsNumber } from './format';

export type SearchProduct = {
  id: string;
  nombre: string;
  codigoInterno: string | null;
  precioMinorista: string;
  unidadBase: string | null;
  stockDisponible: number;
};

/** One line of the sale being built. Prices shown here are only a preview: the API prices it. */
export type SaleLine = { productoId: string; nombre: string; precio: string; cantidad: number; stock: number };

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'QR', label: 'QR / billetera' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const COLLECTION_STATES: Record<string, { label: string; tone: string }> = {
  COBRADA: { label: 'Cobrada', tone: 'success' },
  PARCIAL: { label: 'Cobro parcial', tone: 'warning' },
  PENDIENTE: { label: 'Sin cobrar', tone: 'primary' },
};

const MAX_LINES = 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Reads the parsed number of an "es-AR" money/quantity field ("1.234,5" or "1234.5"). */
export function parseNumber(value: FormDataEntryValue | null): number | null {
  const n = parseArsNumber(value);
  return n === null || Number.isNaN(n) ? null : n;
}

/** The sale lines a form sent (JSON); null when malformed. Quantities may be fractional (kg). */
export function parseSaleLines(raw: FormDataEntryValue | null): Array<{ productoId: string; cantidad: number }> | null {
  let value: unknown;
  try {
    value = JSON.parse(String(raw ?? '[]'));
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LINES) return null;
  const items: Array<{ productoId: string; cantidad: number }> = [];
  for (const entry of value) {
    const { productoId, cantidad } = (entry ?? {}) as { productoId?: unknown; cantidad?: unknown };
    if (typeof productoId !== 'string' || !productoId) return null;
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0) return null;
    items.push({ productoId, cantidad: Math.round(cantidad * 1000) / 1000 });
  }
  return items;
}

export function addLine(lines: SaleLine[], product: SearchProduct): SaleLine[] {
  if (lines.some((line) => line.productoId === product.id)) {
    return lines.map((line) => (line.productoId === product.id ? { ...line, cantidad: line.cantidad + 1 } : line));
  }
  return [
    ...lines,
    { productoId: product.id, nombre: product.nombre, precio: String(product.precioMinorista), cantidad: 1, stock: product.stockDisponible },
  ];
}

export const previewTotal = (lines: SaleLine[]) => round2(lines.reduce((sum, l) => sum + Number(l.precio) * l.cantidad, 0));

export type PaymentInput =
  | { ok: true; medio: PaymentMethod; monto: number; montoRecibido?: number; referencia?: string }
  | { ok: false; message: string };

/** The payment to register for `total` (the API's total), from the sale form. */
export function paymentFrom(form: FormData, total: number): PaymentInput {
  const medio = String(form.get('medio') ?? '') as PaymentMethod;
  if (!PAYMENT_METHODS.some((m) => m.value === medio)) return { ok: false, message: 'Elegí cómo paga el cliente.' };
  if (medio === 'efectivo') {
    const received = parseNumber(form.get('recibido'));
    if (received === null) return { ok: true, medio, monto: total };
    if (received < total) return { ok: false, message: 'Lo que entrega el cliente no alcanza para el total.' };
    return { ok: true, medio, monto: total, montoRecibido: round2(received) };
  }
  const referencia = String(form.get('referencia') ?? '').trim();
  return { ok: true, medio, monto: total, ...(referencia ? { referencia } : {}) };
}

/** The JSON body of POST /ventas/:id/pagos for a valid payment. */
export function paymentBody(payment: Extract<PaymentInput, { ok: true }>) {
  return {
    medio: payment.medio,
    monto: payment.monto,
    ...(payment.montoRecibido === undefined ? {} : { montoRecibido: payment.montoRecibido }),
    ...(payment.referencia ? { referencia: payment.referencia } : {}),
  };
}

/** Change to give back in cash; null while what was handed over is unknown or short. */
export function changeFor(total: number, received: number | null): number | null {
  if (received === null || received < total) return null;
  return round2(received - total);
}

const CODES: Record<string, string> = {
  CAJA_CERRADA: 'La caja está cerrada. Abrila en Caja para cobrar en efectivo.',
  PAGO_EXCEDE_SALDO: 'El pago supera lo que falta cobrar.',
  MONTO_RECIBIDO_INSUFICIENTE: 'Lo que entrega el cliente no alcanza para el total.',
  PRODUCTO_NO_ENCONTRADO: 'Uno de los productos ya no existe.',
  PRODUCTO_INACTIVO: 'Uno de los productos está desactivado.',
  CLIENTE_NO_ENCONTRADO: 'Ese cliente no está disponible.',
  DESCUENTO_NO_AUTORIZADO: 'No se pueden aplicar descuentos manuales.',
  VENTA_ANULADA: 'La venta está anulada.',
};

/** The API's answer, in words for the person at the counter (codes and product ids translated). */
export function saleErrorMessage(message: string, lines: Array<{ productoId: string; nombre: string }> = []): string {
  if (CODES[message]) return CODES[message];
  const stock = /Stock insuficiente para el producto ([\w-]+): disponible ([\d.]+)/.exec(message);
  if (stock) {
    const name = lines.find((l) => l.productoId === stock[1])?.nombre ?? 'un producto';
    return `No hay stock suficiente de ${name}: quedan ${Number(stock[2])}.`;
  }
  return message;
}

/** "#00000012" as the API formats it, or the short id when the sale has no number. */
export const saleNumber = (sale: { numeroFormateado?: string | null; id: string }) =>
  sale.numeroFormateado ?? `#${sale.id.slice(0, 8)}`;

/** Start of today in Buenos Aires, as an ISO instant (for "today's sales"). */
export function startOfTodayBA(now = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now);
  return new Date(`${day}T00:00:00-03:00`).toISOString();
}
