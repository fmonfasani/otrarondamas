/**
 * OR-B4-054 (Owner, 2026-11-27) — delivery and pickup of a store. The delivery fee is all the
 * courier's: $ 2.500 base + $ 500 per km or fraction, in a straight line. Wapsell sets both
 * values; a store may raise them, never lower them.
 */
export type DeliverySettings = { envio: boolean; retiro: boolean; radioKm: number; base: number; porKm: number };
export type DeliveryPanel = {
  envios: DeliverySettings;
  ubicacionConfirmada: boolean;
  minimos: { base: number; porKm: number };
  puedeEditar: boolean;
};

export const WAPSELL_DELIVERY = { base: 2500, porKm: 500 } as const;
export const MAX_RADIUS_KM = 50;
const MAX_FEE = 1_000_000;

/** «$ 4.000». */
export const pesos = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;

/** Every km or fraction is charged: 2,1 km → 3 km. */
export function feeFor(km: number, s: { base: number; porKm: number }) {
  const kmCobrados = Math.max(1, Math.ceil(Math.round(km * 10) / 10));
  return { kmCobrados, costo: s.base + kmCobrados * s.porKm };
}

/** «a 2,1 km se cobran 3 km: $ 2.500 + 3 × $ 500 = $ 4.000». */
export function feeExample(s: { base: number; porKm: number }, km = 2.1) {
  const { kmCobrados, costo } = feeFor(km, s);
  return `a ${String(km).replace('.', ',')} km se cobran ${kmCobrados} km: ${pesos(s.base)} + ${kmCobrados} × ${pesos(s.porKm)} = ${pesos(costo)}`;
}

const whole = (value: FormDataEntryValue | null) => {
  const text = (typeof value === 'string' ? value : '').replace(/[$.\s]/g, '');
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
};

/** The Ajustes form, checked the way the API checks it. */
export function deliveryFrom(form: FormData): { ok: true; body: DeliverySettings } | { ok: false; message: string } {
  const body = {
    envio: form.get('envio') === 'true',
    retiro: form.get('retiro') === 'true',
    radioKm: whole(form.get('radioKm')),
    base: whole(form.get('base')),
    porKm: whole(form.get('porKm')),
  };
  if (!body.envio && !body.retiro) return { ok: false, message: 'Ofrecé envío, retiro en el local o los dos.' };
  if (!(body.radioKm >= 1 && body.radioKm <= MAX_RADIUS_KM)) return { ok: false, message: `El radio va de 1 a ${MAX_RADIUS_KM} km.` };
  if (!(body.base >= WAPSELL_DELIVERY.base && body.base <= MAX_FEE)) return { ok: false, message: 'La base del envío es de $ 2.500 como mínimo.' };
  if (!(body.porKm >= WAPSELL_DELIVERY.porKm && body.porKm <= MAX_FEE)) return { ok: false, message: 'Cada km cuesta $ 500 como mínimo.' };
  return { ok: true, body };
}

export function deliveryMessage(s: DeliverySettings) {
  if (!s.envio) return 'Listo: tus clientes retiran los pedidos en el local.';
  return `Listo: enviás hasta ${s.radioKm} km (${feeExample(s)})${s.retiro ? ', y también se puede retirar en el local' : ''}.`;
}
