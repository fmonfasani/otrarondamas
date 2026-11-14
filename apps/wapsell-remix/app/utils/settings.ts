/** Pure helpers of Mi perfil and Ajustes. */
import { MIN_PASSWORD_LENGTH } from '~/components/auth/PasswordField';

export type Business = {
  nombre: string;
  slug: string;
  telefono: string;
  direccion: string;
  horario: string;
  descripcion: string;
  puedeEditar: boolean;
};

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

/** The Business form: a name of 2+ letters and the contact fields (empty is fine). */
export function businessFrom(form: FormData): { ok: true; data: Record<string, string> } | { ok: false; message: string } {
  const nombre = String(form.get('nombre') ?? '').trim();
  if (nombre.length < 2) return { ok: false, message: 'El nombre del negocio tiene que tener al menos 2 letras.' };
  const data: Record<string, string> = { nombre };
  for (const f of CONTACT_FIELDS) data[f.name] = String(form.get(f.name) ?? '').trim().slice(0, f.max);
  return { ok: true, data };
}

/** The store's public address for a Business slug. */
export const storeUrl = (slug: string, origin = 'https://app.wapsell.com') => `${origin}/tienda/${slug}`;
