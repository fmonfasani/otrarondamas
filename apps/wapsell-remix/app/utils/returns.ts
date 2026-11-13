/** Shapes of /devoluciones and the pure helpers of the Devoluciones screens (OR-B4-034, OR-B4-035). */
import { formatMoney, parseArsNumber } from './format';

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

/** Default days after the sale a return is accepted (API RETURN_WINDOW_DAYS); each Business can change it (OR-B4-035 rule 4). */
export const RETURN_WINDOW_DAYS = 10;

export const RETURN_STATES: Record<string, { label: string; tone: string; next: string }> = {
  SOLICITADA: { label: 'Por autorizar', tone: 'warning', next: 'El Owner o un administrador la autoriza.' },
  AUTORIZADA: { label: 'Por recibir', tone: 'warning', next: 'Cuando vuelvan los productos, el equipo (o el gestor de stock) los revisa y elige su destino.' },
  RECIBIDA: { label: 'Por reembolsar', tone: 'secondary', next: 'Devolvé el dinero por el mismo medio con que pagó.' },
  PROCESADA: { label: 'Terminada', tone: 'success', next: '' },
};

/** OR-B4-035 rule 6 — the fixed reasons (API RETURN_REASONS); «Otro» needs a comment. */
export const RETURN_REASONS = [
  { value: 'ROTO', label: 'Roto o dañado' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'PRODUCTO_EQUIVOCADO', label: 'Producto equivocado' },
  { value: 'NO_LE_GUSTO', label: 'No le gustó' },
  { value: 'OTRO', label: 'Otro' },
] as const;

/**
 * The state to show. A cancelled or rejected return (OR-B4-035) is stored as PROCESADA with a
 * RECHAZADO refund; its result says which one it was.
 */
export function returnState(r: Pick<CustomerReturn, 'estado' | 'reembolso'>) {
  if (r.estado === 'PROCESADA' && r.reembolso?.estado === 'RECHAZADO') {
    return r.reembolso.resultado?.startsWith('Cancelada')
      ? { label: 'Cancelada', tone: 'muted', next: '' }
      : { label: 'Rechazada', tone: 'muted', next: '' };
  }
  return RETURN_STATES[r.estado] ?? { label: r.estado, tone: 'muted', next: '' };
}

export const isClosedWithoutRefund = (r: Partial<Pick<CustomerReturn, 'reembolso'>>) => r.reembolso?.estado === 'RECHAZADO';

export const DESTINATIONS = [
  { value: 'REINGRESO', label: 'Vuelve a la venta', help: 'El stock vuelve a los lotes de donde salió.' },
  { value: 'DESCARTE', label: 'Descarte', help: 'No vuelve al stock (dañado, vencido).' },
] as const;

export const returnNumber = (r: { numero: number | null; id: string }) => (r.numero ? `#${r.numero}` : `#${r.id.slice(0, 8)}`);

/** Whole days since the sale, and whether it is still within the Business's window. */
export function returnWindow(saleDate: string, now = new Date(), limit = RETURN_WINDOW_DAYS) {
  const days = Math.floor((now.getTime() - new Date(saleDate).getTime()) / 86_400_000);
  return { days, limit, open: days <= limit, left: Math.max(0, limit - days) };
}

/** OR-B4-035 rule 4 — the window typed in the settings form: whole days, 1 to 365. */
export function windowDaysFrom(value: FormDataEntryValue | null): number | null {
  const days = Number(String(value ?? '').trim());
  return Number.isInteger(days) && days >= 1 && days <= 365 ? days : null;
}

/** Units of each sale line already returned in earlier returns of the same sale (cancelled or rejected ones took nothing back). */
export function returnedBySaleItem(
  returns: Array<Pick<CustomerReturn, 'ventaId' | 'items'> & Partial<Pick<CustomerReturn, 'reembolso'>>>,
  saleId: string,
) {
  const map = new Map<string, number>();
  for (const r of returns.filter((x) => x.ventaId === saleId && !isClosedWithoutRefund(x))) {
    for (const item of r.items) map.set(item.ventaItemId, (map.get(item.ventaItemId) ?? 0) + item.cantidad);
  }
  return map;
}

export type ReturnLineInput = { ventaItemId: string; cantidad: number; motivoCodigo: string; motivo?: string };

/**
 * The lines the form asks to return: every sale line with a quantity > 0 and a reason from the
 * list (a comment is optional, except for «Otro»). Quantities are whole units and never more
 * than what is still returnable.
 */
export function returnItemsFrom(
  form: FormData,
  lines: Array<{ ventaItemId: string; nombre: string; available: number }>,
): { ok: true; items: ReturnLineInput[] } | { ok: false; message: string } {
  const items: ReturnLineInput[] = [];
  for (const line of lines) {
    const raw = String(form.get(`cantidad-${line.ventaItemId}`) ?? '').trim();
    if (!raw || raw === '0') continue;
    const cantidad = Number(raw);
    if (!Number.isInteger(cantidad) || cantidad < 0) return { ok: false, message: `La cantidad de ${line.nombre} tiene que ser un número entero.` };
    if (cantidad > line.available) return { ok: false, message: `De ${line.nombre} se pueden devolver como máximo ${line.available}.` };
    const motivoCodigo = String(form.get(`razon-${line.ventaItemId}`) ?? '');
    if (!RETURN_REASONS.some((r) => r.value === motivoCodigo)) return { ok: false, message: `Elegí por qué se devuelve ${line.nombre}.` };
    const motivo = String(form.get(`motivo-${line.ventaItemId}`) ?? '').trim();
    if (motivoCodigo === 'OTRO' && !motivo) return { ok: false, message: `Contá por qué se devuelve ${line.nombre}.` };
    items.push({ ventaItemId: line.ventaItemId, cantidad, motivoCodigo, ...(motivo ? { motivo } : {}) });
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

/**
 * OR-B4-035 rule 3 — the amount to refund: empty means all of it; otherwise more than 0 and
 * no more than what the return is worth. `amount` is only set for a partial refund.
 */
export function refundAmountFrom(form: FormData, maximum: number): { ok: true; amount?: number } | { ok: false; message: string } {
  const value = parseArsNumber(form.get('amount'));
  if (value === null) return { ok: true };
  if (!Number.isFinite(value) || value <= 0) return { ok: false, message: 'Escribí un monto mayor a 0.' };
  if (Math.round(value * 100) > Math.round(maximum * 100)) return { ok: false, message: `Se puede devolver como máximo ${formatMoney(maximum)}.` };
  return Math.round(value * 100) === Math.round(maximum * 100) ? { ok: true } : { ok: true, amount: Math.round(value * 100) / 100 };
}

/** OR-B4-035 rule 2 — the products taken in exchange (`cambio-<productoId>` = whole units). */
export function exchangeItemsFrom(form: FormData): { ok: true; items: Array<{ productoId: string; cantidad: number }> } | { ok: false; message: string } {
  const items: Array<{ productoId: string; cantidad: number }> = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('cambio-')) continue;
    const raw = String(value).trim();
    if (!raw || raw === '0') continue;
    const cantidad = Number(raw);
    if (!Number.isInteger(cantidad) || cantidad < 0) return { ok: false, message: 'Las cantidades tienen que ser números enteros.' };
    items.push({ productoId: key.slice('cambio-'.length), cantidad });
  }
  if (items.length === 0) return { ok: false, message: 'Elegí los productos que se lleva a cambio.' };
  return { ok: true, items };
}

/** What the exchange did, in words. */
export function exchangeSummary(n: { numero: number | null; diferencia: string; resto: string; pendiente: string }) {
  const sale = n.numero ? `la venta #${n.numero}` : 'una venta nueva';
  if (Number(n.pendiente) > 0) return `Cambio hecho con ${sale}. Falta cobrar ${formatMoney(n.pendiente)}: cobralo desde la venta.`;
  if (Number(n.diferencia) > 0) return `Cambio hecho con ${sale}. El cliente pagó ${formatMoney(n.diferencia)} de diferencia.`;
  if (Number(n.resto) > 0) return `Cambio hecho con ${sale}. Se devolvieron ${formatMoney(n.resto)} de diferencia.`;
  return `Cambio hecho con ${sale}.`;
}

/**
 * OR-B4-035 rule 7 — the refund split proportionally to what each method paid. Cents are
 * rounded and the remainder goes to the method that paid the most, so the parts add up.
 */
export function proportionalSplits(paidBy: Array<{ metodo: string; pagado: number }>, total: number) {
  const paid = paidBy.reduce((sum, p) => sum + p.pagado, 0);
  if (paid <= 0) return paidBy.map((p) => ({ ...p, monto: 0 }));
  const cents = Math.round(total * 100);
  const parts = paidBy.map((p) => ({ ...p, cents: Math.floor((cents * p.pagado) / paid) }));
  const rest = cents - parts.reduce((sum, p) => sum + p.cents, 0);
  const largest = parts.reduce((top, p, i) => (p.pagado > parts[top].pagado ? i : top), 0);
  parts[largest].cents += rest;
  return parts.map(({ cents: c, ...p }) => ({ ...p, monto: c / 100 }));
}

/** The amounts typed for each method (`split-<metodo>`); at least one above 0, none above what it paid. */
export function splitsFrom(form: FormData, paidBy: Array<{ metodo: string; pagado: number }>):
  | { ok: true; splits: Array<{ metodo: string; monto: number }> }
  | { ok: false; message: string } {
  const splits: Array<{ metodo: string; monto: number }> = [];
  for (const { metodo, pagado } of paidBy) {
    const value = parseArsNumber(form.get(`split-${metodo}`));
    if (value === null || value === 0) continue;
    if (!Number.isFinite(value) || value < 0) return { ok: false, message: `Revisá el monto de ${METHOD_LABELS[metodo] ?? metodo}.` };
    if (Math.round(value * 100) > Math.round(pagado * 100)) {
      return { ok: false, message: `Con ${METHOD_LABELS[metodo] ?? metodo} se pagaron ${formatMoney(pagado)}: no se puede devolver más.` };
    }
    splits.push({ metodo, monto: Math.round(value * 100) / 100 });
  }
  if (splits.length === 0) return { ok: false, message: 'Escribí cuánto se devuelve por cada medio.' };
  return { ok: true, splits };
}

/** What each method paid for the sale, leaving aside credit from an exchange. */
export function paidByMethod(payments: Array<{ medio: string; monto: string; estado: string }>) {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.estado !== 'APROBADO' || p.medio === 'cambio') continue;
    map.set(p.medio, Math.round(((map.get(p.medio) ?? 0) + Number(p.monto)) * 100) / 100);
  }
  return [...map].map(([metodo, pagado]) => ({ metodo, pagado })).sort((a, b) => b.pagado - a.pagado);
}

export const methodLabel = (metodo: string) => METHOD_LABELS[metodo] ?? metodo;

const METHOD_LABELS: Record<string, string> = { efectivo: 'efectivo', transferencia: 'transferencia', QR: 'QR / billetera', MERCADOPAGO: 'Mercado Pago', cambio: 'cambio' };

/** How the refund will be (before) or was (after) made, in words. */
export function refundDescription(r: Pick<CustomerReturn, 'reembolso' | 'montoReembolsable'>, method: string | null) {
  if (r.reembolso) {
    // OR-B4-035 rule 7 — split among methods: the result already says how much by each.
    if (r.reembolso.metodo === 'mixto') return r.reembolso.resultado ?? 'Reembolso registrado.';
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
/** OR-B4-035 rule 11 — receiving and inspecting also belongs to the Gestor de stock. */
export const canReceiveReturns = (role: string) => canManageReturns(role) || role === 'GESTOR_DE_STOCK';
export const canRegisterReturns = (role: string) => ['OWNER', 'ADMIN', 'VENDEDOR', 'ASISTENTE_LOCAL'].includes(role);
