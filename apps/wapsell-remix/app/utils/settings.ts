/** Pure helpers of Mi perfil and Ajustes. */
import { MIN_PASSWORD_LENGTH } from '~/components/auth/PasswordField';

export type Business = {
  nombre: string;
  slug: string;
  telefono: string;
  direccion: string;
  horario: string;
  descripcion: string;
  /** OR-B4-046 rule 3: hide published products without stock instead of showing «Sin stock». */
  ocultarSinStock: boolean;
  puedeEditar: boolean;
  /** OR-B4-051 rule 1: the counter's discount for paying the whole sale in cash / by transfer. */
  descuentoEfectivo?: number;
  descuentoTransferencia?: number;
  /** Who changes prices (Owner, Admin) sets those discounts. */
  puedeEditarPrecios?: boolean;
};

/** Reads the two payment-method discounts (0 to 50 %, empty is 0). */
export function paymentDiscountsFrom(
  form: FormData,
): { ok: true; body: { descuentoEfectivo: number; descuentoTransferencia: number } } | { ok: false; message: string } {
  const read = (name: string) => {
    const raw = String(form.get(name) ?? '').replace('%', '').replace(',', '.').trim();
    if (raw === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n * 100) / 100 : null;
  };
  const descuentoEfectivo = read('descuentoEfectivo');
  const descuentoTransferencia = read('descuentoTransferencia');
  if (descuentoEfectivo === null || descuentoTransferencia === null) {
    return { ok: false, message: 'Cada descuento va de 0 a 50 %.' };
  }
  return { ok: true, body: { descuentoEfectivo, descuentoTransferencia } };
}

/** What the person reads after saving them. */
export function paymentDiscountsMessage(body: { descuentoEfectivo: number; descuentoTransferencia: number }): string {
  const parts = [
    body.descuentoEfectivo > 0 ? `${String(body.descuentoEfectivo).replace('.', ',')} % en efectivo` : null,
    body.descuentoTransferencia > 0 ? `${String(body.descuentoTransferencia).replace('.', ',')} % por transferencia` : null,
  ].filter(Boolean);
  return parts.length ? `Listo: el mostrador descuenta ${parts.join(' y ')}.` : 'Listo: sin descuentos por medio de pago.';
}

export const CONTACT_FIELDS = [
  { name: 'telefono', label: 'Teléfono o WhatsApp', max: 40, placeholder: 'Ej.: 11 5555-0000' },
  { name: 'direccion', label: 'Dirección', max: 200, placeholder: 'Ej.: Av. Corrientes 1234, CABA' },
  { name: 'horario', label: 'Horario', max: 200, placeholder: 'Ej.: Lun a sáb de 9 a 20' },
  { name: 'descripcion', label: 'Qué vendés (se ve en la tienda)', max: 500, placeholder: 'Ej.: Bebidas, almacén y fiambrería' },
] as const;

/** The new password, checked like the API does before sending it. */
export function passwordChangeFrom(form: FormData): { ok: true; actual: string; nueva: string } | { ok: false; message: string } {
  const actual = String(form.get('actual') ?? '');
  const nueva = String(form.get('nueva') ?? '');
  const repetida = String(form.get('repetida') ?? '');
  if (!actual) return { ok: false, message: 'Escribí tu contraseña actual.' };
  if (nueva.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `La contraseña nueva tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  if (nueva !== repetida) return { ok: false, message: 'Las dos contraseñas nuevas no coinciden.' };
  if (nueva === actual) return { ok: false, message: 'La contraseña nueva tiene que ser distinta de la actual.' };
  return { ok: true, actual, nueva };
}

/**
 * The Business form: a name of 2+ letters, the contact fields (empty is fine) and how the store
 * shows products without stock (a checkbox: absent means show them).
 */
export function businessFrom(
  form: FormData,
): { ok: true; data: Record<string, string | boolean> } | { ok: false; message: string } {
  const nombre = String(form.get('nombre') ?? '').trim();
  if (nombre.length < 2) return { ok: false, message: 'El nombre del negocio tiene que tener al menos 2 letras.' };
  const data: Record<string, string | boolean> = { nombre };
  for (const f of CONTACT_FIELDS) data[f.name] = String(form.get(f.name) ?? '').trim().slice(0, f.max);
  data.ocultarSinStock = form.get('ocultarSinStock') === 'true';
  return { ok: true, data };
}

/** The store's public address for a Business slug. */
export const storeUrl = (slug: string, origin = 'https://app.wapsell.com') => `${origin}/tienda/${slug}`;
