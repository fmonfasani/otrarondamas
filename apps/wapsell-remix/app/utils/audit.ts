/** Shapes of /auditoria and the pure helpers of the Auditoría screen (OR-B4-041). */

export type AuditItem = {
  id: string;
  fecha: string;
  accion: string;
  nombre: string;
  tema: string;
  temaNombre: string;
  sobre: string | null;
  motivo: string | null;
  persona: { id: string; nombre: string } | null;
};

export type AuditList = {
  total: number;
  page: number;
  pageSize: number;
  todo: boolean;
  temas: Array<{ clave: string; nombre: string }>;
  personas: Array<{ id: string; nombre: string }>;
  items: AuditItem[];
};

export type AuditDetail = AuditItem & {
  entidad: string;
  entidadId: string | null;
  autorizado: boolean;
  persona: { id: string; nombre: string; email: string } | null;
  cambios: Array<{ campo: string; antes: unknown; despues: unknown }>;
};

const FILTER_KEYS = ['desde', 'hasta', 'tema', 'usuarioId'] as const;

/** The filters in the page's address, passed on as they are (the API checks them). */
export function auditQuery(search: URLSearchParams, extra: Record<string, string> = {}) {
  const out = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = search.get(key)?.trim();
    if (value) out.set(key, value);
  }
  for (const [k, v] of Object.entries(extra)) out.set(k, v);
  return out;
}

export const hasFilters = (search: URLSearchParams) => FILTER_KEYS.some((k) => search.get(k));

/** Field names people read. */
const FIELD_NAMES: Record<string, string> = {
  nombre: 'Nombre',
  email: 'Email',
  rol: 'Rol',
  estado: 'Estado',
  estadoLegajo: 'Legajo',
  costo: 'Costo',
  precioMinorista: 'Precio minorista',
  precioMayorista: 'Precio mayorista',
  descuentoPorcentaje: 'Descuento (%)',
  activo: 'Activo',
  codigoInterno: 'Código interno',
  codigoBarras: 'Código de barras',
  marca: 'Marca',
  stockMinimo: 'Stock mínimo',
  unidadBase: 'Unidad',
  montoInicial: 'Monto inicial',
  montoFinal: 'Monto final',
  monto: 'Monto',
  tipo: 'Tipo',
  diferencia: 'Diferencia',
  efectivoEsperado: 'Efectivo esperado',
  efectivoContado: 'Efectivo contado',
  requiereAutorizacion: 'Requiere autorización',
  persona: 'Persona',
  telefono: 'Teléfono',
  direccion: 'Dirección',
};

export const fieldName = (key: string) => FIELD_NAMES[key] ?? key;

const MONEY_FIELDS = new Set([
  'costo',
  'precioMinorista',
  'precioMayorista',
  'montoInicial',
  'montoFinal',
  'monto',
  'diferencia',
  'efectivoEsperado',
  'efectivoContado',
]);

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** A before/after value as text: money, yes/no, «—» for empty. */
export function valueText(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (MONEY_FIELDS.has(field) && Number.isFinite(Number(value))) return money.format(Number(value));
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
