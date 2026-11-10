import { SetMetadata } from '@nestjs/common';
import { CUSTOMER_POLICY, type Permission } from './canonical-permissions';

/**
 * Stage 3 of the Authorization spec (§5.3, #161 / #168): every endpoint protected by a
 * legacy `@RequirePermission` / `@Authorize` also declares the exact canonical permission
 * it needs. The canonical engine (shadow mode) uses this declaration instead of the
 * coarse legacy translation. The legacy decorators still decide.
 */
export const CANONICAL_PERMISSION_KEY = 'canonicalPermission';

/** The raw request fields a requirement may inspect (before validation pipes run). */
export interface CanonicalRequest {
  body?: unknown;
}

/** All listed permissions are required. */
export type CanonicalRequirement =
  | Permission
  | typeof CUSTOMER_POLICY
  | readonly Permission[]
  | ((request: CanonicalRequest) => readonly Permission[]);

export const CanonicalPermission = (requirement: CanonicalRequirement) =>
  SetMetadata(CANONICAL_PERMISSION_KEY, requirement);

/**
 * Reads the handler's (or else the controller's) declaration. Never throws: the shadow
 * engine must not be able to break a request.
 */
export function readCanonicalRequirement(context: {
  getHandler: () => unknown;
  getClass: () => unknown;
}): CanonicalRequirement | undefined {
  try {
    for (const target of [context.getHandler(), context.getClass()]) {
      if (typeof target !== 'function') continue;
      const value = Reflect.getMetadata(CANONICAL_PERMISSION_KEY, target) as
        CanonicalRequirement | undefined;
      if (value !== undefined) return value;
    }
  } catch {
    // fall through: no declaration
  }
  return undefined;
}

/** Resolves a declaration to the permissions it requires for this request. */
export function resolveRequirement(
  requirement: CanonicalRequirement,
  request: CanonicalRequest,
): readonly Permission[] | typeof CUSTOMER_POLICY {
  if (requirement === CUSTOMER_POLICY) return CUSTOMER_POLICY;
  if (typeof requirement === 'function') return requirement(request);
  return typeof requirement === 'string' ? [requirement] : requirement;
}

function bodyField(request: CanonicalRequest, field: string): unknown {
  const body = request.body;
  return body && typeof body === 'object' ? (body as Record<string, unknown>)[field] : undefined;
}

/**
 * The permission depends on a body value (e.g. the target Order state). Unknown or
 * missing values fall back to `fallback`.
 */
export function byBodyValue(
  field: string,
  map: Readonly<Record<string, Permission>>,
  fallback: Permission,
): (request: CanonicalRequest) => readonly Permission[] {
  return (request) => {
    const value = bodyField(request, field);
    return [
      typeof value === 'string' && Object.prototype.hasOwnProperty.call(map, value)
        ? map[value]
        : fallback,
    ];
  };
}

/** `base` always, plus `extra` when the body sets any of `fields`. */
export function plusWhenBodyHas(
  base: Permission,
  fields: readonly string[],
  extra: Permission,
): (request: CanonicalRequest) => readonly Permission[] {
  return (request) =>
    fields.some((field) => bodyField(request, field) !== undefined) ? [base, extra] : [base];
}

/** `PATCH /pedidos/:id/estado` — confirming and cancelling are separate permissions (#168). */
export const ORDER_STATUS_CHANGE = byBodyValue(
  'estado',
  { CONFIRMADO: 'ORDER_CONFIRM', CANCELADO: 'ORDER_CANCEL' },
  'ORDERS_MANAGE',
);

/** `POST /caja/movimientos` — a withdrawal is CASH_WITHDRAW; other manual movements CASH_EXPENSE. */
export const CASH_MANUAL_MOVEMENT = byBodyValue(
  'tipo',
  { Retiro: 'CASH_WITHDRAW' },
  'CASH_EXPENSE',
);

/** `PATCH /catalogo/productos/:id` — changing a price also needs PRICING_CHANGE. */
export const PRODUCT_UPDATE = plusWhenBodyHas(
  'CATALOG_MANAGE',
  ['precioMinorista', 'precioMayorista', 'descuentoPorcentaje'],
  'PRICING_CHANGE',
);
