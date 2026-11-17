import { Prisma } from '@prisma/client';
import type { AuditAction } from './audit-catalog';

export { recordAudit } from './audit-catalog';

const PRICE_FIELDS = [
  'costo',
  'precioMinorista',
  'precioMayorista',
  'descuentoPorcentaje',
] as const;
const OTHER_FIELDS = [
  'nombre',
  'codigoInterno',
  'codigoBarras',
  'marca',
  'familiaId',
  'subfamiliaId',
  'tipoId',
  'subtipoId',
  'unidadBase',
  'stockMinimo',
] as const;

/** Prisma Decimals compare and store as plain numbers; empty is null. */
function plain(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber();
  return v;
}

/**
 * OR-B4-041 — what a product edit means for the audit trail: a (de)activation, a price
 * change, or another edit; only the fields that changed, plus the product name. Null when
 * nothing changed.
 */
export function productAuditEntry(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): {
  accion: AuditAction;
  entidad: string;
  entidadId: string;
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
} | null {
  const changed = (k: string) =>
    JSON.stringify(plain(before[k])) !== JSON.stringify(plain(after[k]));
  const fields = [...PRICE_FIELDS, ...OTHER_FIELDS, 'activo'].filter(changed);
  if (fields.length === 0) return null;
  const pick = (o: Record<string, unknown>) =>
    Object.fromEntries(fields.map((k) => [k, plain(o[k])]));
  let accion: AuditAction = 'PRODUCTO_EDITADO';
  if (fields.includes('activo'))
    accion = after.activo ? 'PRODUCTO_ACTIVADO' : 'PRODUCTO_DESACTIVADO';
  else if (PRICE_FIELDS.some((k) => fields.includes(k))) accion = 'PRODUCTO_PRECIO_CAMBIADO';
  return {
    accion,
    entidad: 'Producto',
    entidadId: typeof after.id === 'string' ? after.id : '',
    // The name rides along so the trail says which product, even when it did not change.
    antes: { nombre: before.nombre, ...pick(before) },
    despues: { nombre: after.nombre, ...pick(after) },
  };
}
