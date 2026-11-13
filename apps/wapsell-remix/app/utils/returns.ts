/** Shapes of /devoluciones and the pure helpers of the Devoluciones screens (OR-B4-034). */
import { formatMoney } from './format';

export type ReturnItem = {
  id: string;
  ventaItemId: string;
  productoId: string;
  producto: string;
  cantidad: number;
  precioDevuelto: string;
  monto: string;
  motivo: string | null;
  destino: string | null;
};

export type CustomerReturn = {
  id: string;
  numero: number | null;
  estado: 'SOLICITADA' | 'AUTORIZADA' | 'RECIBIDA' | 'PROCESADA' | string;
  ventaId: string;
  ventaNumero: number | null;
  ventaFecha: string;
  cliente: { id: string; nombre: string };
  motivo: string;
  observaciones: string | null;
  montoReembolsable: string;
  fechaSolicitud: string;
  fechaAutorizacion: string | null;
  fechaRecibida: string | null;
  fechaProcesada: string | null;
  items: ReturnItem[];
  reembolso: { estado: string; metodo: string | null; monto: string; resultado: string | null } | null;
};

/** Days after the sale a return is accepted (API RETURN_WINDOW_DAYS). */
export const RETURN_WINDOW_DAYS = 10;

export const RETURN_STATES: Record<string, { label: string; tone: string; next: string }> = {
  SOLICITADA: { label: 'Por autorizar', tone: 'warning', next: 'El Owner o un administrador la autoriza.' },
  AUTORIZADA: { label: 'Por recibir', tone: 'warning', next: 'Cuando vuelvan los productos, revisalos y elegí su destino.' },
  RECIBIDA: { label: 'Por reembolsar', tone: 'secondary', next: 'Devolvé el dinero por el mismo medio con que pagó.' },
  PROCESADA: { label: 'Terminada', tone: 'success', next: '' },
};

export const DESTINATIONS = [
  { value: 'REINGRESO', label: 'Vuelve a la venta', help: 'El stock vuelve a los lotes de donde salió.' },
  { value: 'DESCARTE', label: 'Descarte', help: 'No vuelve al stock (dañado, vencido).' },
] as const;

export const returnNumber = (r: { numero: number | null; id: string }) => (r.numero ? `#${r.numero}` : `#${r.id.slice(0, 8)}`);

/** Whole days since the sale, and whether it is still within the window. */
export function returnWindow(saleDate: string, now = new Date()) {
  const days = Math.floor((now.getTime() - new Date(saleDate).getTime()) / 86_400_000);
  return { days, open: days <= RETURN_WINDOW_DAYS, left: Math.max(0, RETURN_WINDOW_DAYS - days) };
}

/** Units of each sale line already returned in earlier returns of the same sale. */
export function returnedBySaleItem(returns: Array<Pick<CustomerReturn, 'ventaId' | 'items'>>, saleId: string) {
  const map = new Map<string, number>();
  for (const r of returns.filter((x) => x.ventaId === saleId)) {
    for (const item of r.items) map.set(item.ventaItemId, (map.get(item.ventaItemId) ?? 0) + item.cantidad);
  }
  return map;
}

/**
 * The lines the form asks to return: every sale line with a quantity > 0 and a reason.
 * Quantities are whole units and never more than what is still returnable.
 */
export function returnItemsFrom(
  form: FormData,
  lines: Array<{ ventaItemId: string; nombre: string; available: number }>,
): { ok: true; items: Array<{ ventaItemId: string; cantidad: number; motivo: string }> } | { ok: false; message: string } {
  const items: Array<{ ventaItemId: string; cantidad: number; motivo: string }> = [];
  for (const line of lines) {
    const raw = String(form.get(`cantidad-${line.ventaItemId}`) ?? '').trim();
    if (!raw || raw === '0') continue;
    const cantidad = Number(raw);
    if (!Number.isInteger(cantidad) || cantidad < 0) return { ok: false, message: `La cantidad de ${line.nombre} tiene que ser un número entero.` };
    if (cantidad > line.available) return { ok: false, message: `De ${line.nombre} se pueden devolver como máximo ${line.available}.` };
    const motivo = String(form.get(`motivo-${line.ventaItemId}`) ?? '').trim();
    if (!motivo) return { ok: false, message: `Contá por qué se devuelve ${line.nombre}.` };
    items.push({ ventaItemId: line.ventaItemId, cantidad, motivo });
  }
  if (items.length === 0) return { ok: false, message: 'Indicá qué productos se devuelven.' };
  return { ok: true, items };
}

/** Destination chosen for each returned product, or the first one missing. */
export function destinationsFrom(form: FormData, items: ReturnItem[]) {
  const chosen = items.map((item) => ({ itemId: item.id, destino: String(form.get(`destino-${item.id}`) ?? ''), producto: item.producto }));
  const missing = chosen.find((c) => !DESTINATIONS.some((d) => d.value === c.destino));
  if (missing) return { ok: false as const, message: `Elegí qué pasa con ${missing.producto}.` };
  return { ok: true as const, items: chosen.map(({ itemId, destino }) => ({ itemId, destino })) };
}

const METHOD_LABELS: Record<string, string> = { efectivo: 'efectivo', transferencia: 'transferencia', QR: 'QR / billetera', MERCADOPAGO: 'Mercado Pago' };

/** How the refund will be (before) or was (after) made, in words. */
export function refundDescription(r: Pick<CustomerReturn, 'reembolso' | 'montoReembolsable'>, method: string | null) {
  if (r.reembolso) {
    if (r.reembolso.estado === 'PENDIENTE_MANUAL') {
      return `Registrado: devolvé ${formatMoney(r.reembolso.monto)} por ${METHOD_LABELS[r.reembolso.metodo ?? ''] ?? 'el medio original'} desde el banco o la billetera. Wapsell no mueve ese dinero.`;
    }
    return r.reembolso.resultado ?? 'Reembolso registrado.';
  }
  if (!method) return 'La venta no tiene cobros registrados: no hay dinero para devolver.';
  if (method === 'efectivo') return 'Sale en efectivo de la caja abierta.';
  return `Se registra para que lo devuelvas por ${METHOD_LABELS[method] ?? method} fuera de Wapsell.`;
}

export const canManageReturns = (role: string) => role === 'OWNER' || role === 'ADMIN';
export const canRegisterReturns = (role: string) => ['OWNER', 'ADMIN', 'VENDEDOR', 'ASISTENTE_LOCAL'].includes(role);
